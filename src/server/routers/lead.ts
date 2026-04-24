import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sanitizePhone } from "@/lib/utils";
import { sendInngestEvent } from "@/lib/inngest/client";

const leadStatus = z.enum([
  "novo",
  "atribuido",
  "em_atendimento",
  "qualificado",
  "visita_agendada",
  "visita_realizada",
  "proposta_enviada",
  "negociacao",
  "vendido",
  "perdido",
  "descartado",
]);

const statusTimestamps: Record<string, string> = {
  qualificado: "qualificado_em",
  visita_agendada: "visita_agendada_em",
  proposta_enviada: "proposta_em",
  vendido: "vendido_em",
  perdido: "perdido_em",
};

export const leadRouter = createTRPCRouter({
  /**
   * Endpoint otimizado pra Kanban: só campos necessários, sem perdidos/descartados,
   * limite alto por status (não puxa 500 linhas de uma vez).
   */
  paraPipeline: protectedProcedure
    .input(
      z
        .object({
          corretor_id: z.string().uuid().optional(),
          origem: z.string().optional(),
          busca: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from("leads")
        .select(
          "id, nome, whatsapp, status, origem, em_bolsao, created_at, atribuido_em, primeira_mensagem_em, corretor_id, campanha_id, corretor:usuarios!leads_corretor_id_fkey(id, nome, avatar_url), campanha:campanhas(id, nome)",
        )
        .not("status", "in", "(perdido,descartado)")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (input?.corretor_id) q = q.eq("corretor_id", input.corretor_id);
      if (input?.origem) q = q.eq("origem", input.origem);
      if (input?.busca) {
        const s = input.busca.replace(/[%_]/g, "");
        q = q.or(`nome.ilike.%${s}%,whatsapp.ilike.%${s}%`);
      }

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      // Normaliza corretor/campanha caso venham como array
      const normalizados = (data ?? []).map((l) => {
        const corretorRaw = l.corretor as unknown;
        const campanhaRaw = l.campanha as unknown;
        return {
          id: l.id,
          nome: l.nome,
          whatsapp: l.whatsapp,
          status: l.status,
          origem: l.origem,
          em_bolsao: l.em_bolsao,
          created_at: l.created_at,
          atribuido_em: l.atribuido_em,
          primeira_mensagem_em: l.primeira_mensagem_em,
          corretor: (Array.isArray(corretorRaw) ? corretorRaw[0] : corretorRaw) as
            | { id: string; nome: string; avatar_url: string | null }
            | null,
          campanha: (Array.isArray(campanhaRaw) ? campanhaRaw[0] : campanhaRaw) as
            | { id: string; nome: string }
            | null,
        };
      });

      return { leads: normalizados, total: normalizados.length };
    }),

  listar: protectedProcedure
    .input(
      z
        .object({
          status: leadStatus.optional(),
          corretor_id: z.string().uuid().optional(),
          busca: z.string().optional(),
          em_bolsao: z.boolean().optional(),
          page: z.number().int().min(1).default(1),
          per_page: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const p = input ?? { page: 1, per_page: 50 };
      const from = (p.page - 1) * p.per_page;
      const to = from + p.per_page - 1;

      let q = ctx.supabase
        .from("leads")
        .select(
          "*, corretor:usuarios!leads_corretor_id_fkey(id, nome, avatar_url), campanha:campanhas(id, nome), anuncio:anuncios(id, nome, thumbnail_url)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (p.status) q = q.eq("status", p.status);
      if (p.corretor_id) q = q.eq("corretor_id", p.corretor_id);
      if (p.em_bolsao !== undefined) q = q.eq("em_bolsao", p.em_bolsao);
      if (p.busca) {
        const s = p.busca.replace(/[%_]/g, "");
        q = q.or(`nome.ilike.%${s}%,whatsapp.ilike.%${s}%,email.ilike.%${s}%`);
      }

      const { data, count, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { leads: data ?? [], total: count ?? 0, page: p.page, per_page: p.per_page };
    }),

  detalhes: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("leads")
        .select(
          `*,
          corretor:usuarios!leads_corretor_id_fkey(id, nome, avatar_url, email),
          campanha:campanhas(id, nome, meta_campaign_id),
          conjunto:conjuntos_anuncios(id, nome),
          anuncio:anuncios(id, nome, thumbnail_url, headline),
          eventos:lead_eventos(id, tipo, usuario_id, payload, created_at)`,
        )
        .eq("id", input.id)
        .single();

      if (error) throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      return data;
    }),

  /**
   * Verifica se já existe lead com o mesmo whatsapp/email/cpf.
   * Retorna lista de matches pra UI decidir (avisar/mesclar/ignorar).
   */
  verificarDuplicados: protectedProcedure
    .input(
      z.object({
        whatsapp: z.string().optional(),
        email: z.string().optional(),
        cpf: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const filtros: string[] = [];
      if (input.whatsapp) {
        const w = sanitizePhone(input.whatsapp);
        const d = w.replace(/\D/g, "");
        filtros.push(`whatsapp.eq.${w}`);
        filtros.push(`whatsapp.eq.${d}`);
        filtros.push(`whatsapp.eq.+${d}`);
      }
      if (input.email) filtros.push(`email.eq.${input.email}`);
      if (input.cpf) filtros.push(`cpf.eq.${input.cpf.replace(/\D/g, "")}`);
      if (filtros.length === 0) return [];

      const { data } = await ctx.supabase
        .from("leads")
        .select("id, nome, whatsapp, email, cpf, status, origem, created_at, corretor:usuarios!leads_corretor_id_fkey(id, nome)")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .or(filtros.join(","))
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    }),

  criar: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        whatsapp: z.string().min(10),
        email: z.string().email().optional(),
        cpf: z.string().optional(),
        observacoes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        origem: z.string().default("manual"),
        // Se true, cria mesmo existindo duplicado (confirma na UI)
        forcar_duplicado: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Dedup: se ja existe lead com o mesmo whatsapp, reusa ele
      // em vez de criar duplicado. Atualiza observacoes/email se estiverem vazios.
      const w = sanitizePhone(input.whatsapp);
      const d = w.replace(/\D/g, "");
      const filtros: string[] = [
        `whatsapp.eq.${w}`,
        `whatsapp.eq.${d}`,
        `whatsapp.eq.+${d}`,
      ];

      const { data: existentes } = await ctx.supabase
        .from("leads")
        .select("id, nome, whatsapp, email, cpf, observacoes, status, created_at")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .or(filtros.join(","))
        .limit(3);

      if (existentes && existentes.length > 0 && !input.forcar_duplicado) {
        const existente = existentes[0];
        // Enriquece o lead existente com campos novos que estavam vazios
        const updates: Record<string, unknown> = {};
        if (!existente.email && input.email) updates.email = input.email;
        if (!existente.cpf && input.cpf) updates.cpf = input.cpf;
        if (!existente.observacoes && input.observacoes)
          updates.observacoes = input.observacoes;
        if (Object.keys(updates).length > 0) {
          await ctx.supabase.from("leads").update(updates).eq("id", existente.id);
        }
        await ctx.supabase.from("lead_eventos").insert({
          lead_id: existente.id,
          imobiliaria_id: ctx.profile.imobiliaria_id,
          tipo: "duplicado_evitado",
          usuario_id: ctx.user.id,
          payload: { origem: input.origem, nome_tentativa: input.nome },
        });
        return {
          id: existente.id,
          nome: existente.nome,
          ja_existia: true as const,
          aviso: `Lead já existia (criado em ${new Date(existente.created_at).toLocaleDateString("pt-BR")}). Abrimos o mesmo em vez de duplicar.`,
          atribuido_para: null as string | null,
        };
      }

      const { data: lead, error } = await ctx.supabase
        .from("leads")
        .insert({
          imobiliaria_id: ctx.profile.imobiliaria_id,
          nome: input.nome,
          whatsapp: sanitizePhone(input.whatsapp),
          email: input.email,
          cpf: input.cpf,
          observacoes: input.observacoes,
          tags: input.tags,
          origem: input.origem,
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      // Dispara roleta
      const { data: proximoId } = await ctx.supabase.rpc("distribuir_lead_round_robin", {
        p_lead_id: lead.id,
        p_imobiliaria_id: ctx.profile.imobiliaria_id,
        p_equipe_id: ctx.profile.equipe_id,
      });

      await ctx.supabase.from("lead_eventos").insert({
        lead_id: lead.id,
        imobiliaria_id: ctx.profile.imobiliaria_id,
        tipo: "criado",
        usuario_id: ctx.user.id,
        payload: { origem: input.origem },
      });

      // Agenda verificação de timeout do bolsão via Inngest
      if (proximoId) {
        const { data: config } = await ctx.supabase
          .from("configuracoes_imobiliaria")
          .select("bolsao_timeout_minutos")
          .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
          .single();
        await sendInngestEvent("lead/atribuido", {
          lead_id: lead.id,
          corretor_id: proximoId as string,
          imobiliaria_id: ctx.profile.imobiliaria_id,
          timeout_minutos: config?.bolsao_timeout_minutos ?? 5,
        });
      }

      return {
        id: lead.id,
        nome: lead.nome,
        ja_existia: false as const,
        aviso: null as string | null,
        atribuido_para: (proximoId ?? null) as string | null,
      };
    }),

  atualizar: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().min(2).optional(),
        whatsapp: z.string().optional(),
        email: z.string().email().optional(),
        observacoes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      if (updates.whatsapp) updates.whatsapp = sanitizePhone(updates.whatsapp);
      const { data, error } = await ctx.supabase
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  atualizarStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: leadStatus,
        motivo: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = { status: input.status };
      const tsField = statusTimestamps[input.status];
      if (tsField) updates[tsField] = new Date().toISOString();

      if (input.status === "perdido" && input.motivo) updates.motivo_perda = input.motivo;
      if (input.status === "descartado" && input.motivo) updates.motivo_descarte = input.motivo;

      const { data: before } = await ctx.supabase
        .from("leads")
        .select("status")
        .eq("id", input.id)
        .single();

      const { data, error } = await ctx.supabase
        .from("leads")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      await ctx.supabase.from("lead_eventos").insert({
        lead_id: input.id,
        imobiliaria_id: ctx.profile.imobiliaria_id,
        tipo: "mudou_status",
        usuario_id: ctx.user.id,
        payload: { de: before?.status, para: input.status, motivo: input.motivo },
      });

      return data;
    }),

  reatribuir: protectedProcedure
    .input(z.object({ id: z.string().uuid(), corretor_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!["super_admin", "gerente"].includes(ctx.profile.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { error } = await ctx.supabase
        .from("leads")
        .update({
          corretor_id: input.corretor_id,
          status: "atribuido",
          atribuido_em: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      await ctx.supabase.from("lead_atribuicoes").insert({
        lead_id: input.id,
        corretor_id: input.corretor_id,
        motivo_mudanca: "admin_override",
      });

      await ctx.supabase.from("lead_eventos").insert({
        lead_id: input.id,
        imobiliaria_id: ctx.profile.imobiliaria_id,
        tipo: "atribuido",
        usuario_id: ctx.user.id,
        payload: { via: "reatribuicao_manual", por: ctx.user.id },
      });

      const { data: config } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("bolsao_timeout_minutos")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      await sendInngestEvent("lead/atribuido", {
        lead_id: input.id,
        corretor_id: input.corretor_id,
        imobiliaria_id: ctx.profile.imobiliaria_id,
        timeout_minutos: config?.bolsao_timeout_minutos ?? 5,
      });

      return { ok: true };
    }),

  registrarPrimeiraMensagem: protectedProcedure
    .input(z.object({ id: z.string().uuid(), conteudo: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Marca timestamp de primeira mensagem (impede envio pro bolsão)
      const { error } = await ctx.supabase
        .from("leads")
        .update({
          primeira_mensagem_em: new Date().toISOString(),
          status: "em_atendimento",
        })
        .eq("id", input.id)
        .eq("corretor_id", ctx.user.id)
        .is("primeira_mensagem_em", null);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      await ctx.supabase.from("lead_eventos").insert({
        lead_id: input.id,
        imobiliaria_id: ctx.profile.imobiliaria_id,
        tipo: "mensagem_enviada",
        usuario_id: ctx.user.id,
        payload: { conteudo: input.conteudo.slice(0, 200), primeira: true },
      });

      return { ok: true };
    }),
});
