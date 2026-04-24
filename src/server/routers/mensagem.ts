import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { WhatsAppCloudAPI } from "@/lib/integrations/whatsapp";

function normalizarTelefone(numero: string): string {
  // Remove tudo que nao eh digito
  let limpo = numero.replace(/\D/g, "");
  // Se comecar com 0, remove (DDDs brasileiros nao tem 0)
  if (limpo.startsWith("0")) limpo = limpo.slice(1);
  // Se tem 10-11 digitos e nao comeca com 55, assume Brasil
  if (limpo.length >= 10 && limpo.length <= 11 && !limpo.startsWith("55")) {
    limpo = `55${limpo}`;
  }
  return limpo;
}

export const mensagemRouter = createTRPCRouter({
  /**
   * Lista mensagens de uma conversa (por lead).
   */
  listarPorLead: protectedProcedure
    .input(z.object({ lead_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: conversas } = await ctx.supabase
        .from("conversas_whatsapp")
        .select("id")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .eq("lead_id", input.lead_id);
      const ids = (conversas ?? []).map((c) => c.id);
      if (ids.length === 0) return [];
      const { data, error } = await ctx.supabase
        .from("mensagens_whatsapp")
        .select("id, direcao, tipo, conteudo, template_nome, status_entrega, wa_message_id, created_at")
        .in("conversa_id", ids)
        .order("created_at", { ascending: true });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  /**
   * Envia uma mensagem pelo WhatsApp Cloud API para um lead.
   * Usa o canal associado à equipe/corretor ou o primeiro ativo da imobiliária.
   */
  enviar: protectedProcedure
    .input(
      z.object({
        lead_id: z.string().uuid(),
        tipo: z.enum(["texto", "template"]).default("texto"),
        texto: z.string().optional(),
        template_nome: z.string().optional(),
        template_idioma: z.string().default("pt_BR"),
        template_variaveis: z.array(z.string()).optional(),
        canal_id: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.tipo === "texto" && !input.texto?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Texto da mensagem é obrigatório" });
      }
      if (input.tipo === "template" && !input.template_nome) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nome do template é obrigatório" });
      }

      const { data: lead, error: leadErr } = await ctx.supabase
        .from("leads")
        .select("id, nome, whatsapp, corretor_id, imobiliaria_id")
        .eq("id", input.lead_id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (leadErr || !lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado" });
      }
      if (!lead.whatsapp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Lead sem número de WhatsApp" });
      }

      // Escolhe canal: se informado, valida. Senão pega o primeiro ativo da imobiliária
      let canal;
      if (input.canal_id) {
        const { data } = await ctx.supabase
          .from("canais_whatsapp")
          .select("id, whatsapp_phone_number_id, access_token, ativo")
          .eq("id", input.canal_id)
          .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
          .single();
        canal = data;
      } else {
        const { data } = await ctx.supabase
          .from("canais_whatsapp")
          .select("id, whatsapp_phone_number_id, access_token, ativo")
          .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
          .eq("ativo", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        canal = data;
      }
      if (!canal || !canal.ativo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nenhum canal WhatsApp ativo. Conecte um em Ferramentas do Chat → Canais.",
        });
      }

      const numeroDestino = normalizarTelefone(lead.whatsapp);
      const api = new WhatsAppCloudAPI({
        phone_number_id: canal.whatsapp_phone_number_id,
        access_token: canal.access_token,
      });

      // Envia via Meta Cloud API
      let resposta;
      try {
        if (input.tipo === "template") {
          resposta = await api.sendTemplate({
            to: numeroDestino,
            templateName: input.template_nome!,
            languageCode: input.template_idioma,
            variables: input.template_variaveis,
          });
        } else {
          resposta = await api.sendText({ to: numeroDestino, text: input.texto! });
        }
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Falha no envio pela Meta",
        });
      }

      const waMessageId = resposta.messages?.[0]?.id ?? null;

      // Pega ou cria a conversa
      const { data: conversaExistente } = await ctx.supabase
        .from("conversas_whatsapp")
        .select("id")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .eq("lead_id", lead.id)
        .maybeSingle();

      let conversaId = conversaExistente?.id;
      if (!conversaId) {
        const { data: novaConversa, error: convErr } = await ctx.supabase
          .from("conversas_whatsapp")
          .insert({
            imobiliaria_id: ctx.profile.imobiliaria_id,
            lead_id: lead.id,
            corretor_id: lead.corretor_id,
            whatsapp_numero: numeroDestino,
            canal_id: canal.id,
            ultima_mensagem_em: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (convErr) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: convErr.message });
        }
        conversaId = novaConversa.id;
      } else {
        await ctx.supabase
          .from("conversas_whatsapp")
          .update({ ultima_mensagem_em: new Date().toISOString() })
          .eq("id", conversaId);
      }

      const { data: mensagem, error: msgErr } = await ctx.supabase
        .from("mensagens_whatsapp")
        .insert({
          conversa_id: conversaId,
          canal_id: canal.id,
          imobiliaria_id: ctx.profile.imobiliaria_id,
          direcao: "enviada",
          enviado_por_id: ctx.user.id,
          wa_message_id: waMessageId,
          tipo: input.tipo === "template" ? "template" : "text",
          conteudo: input.texto ?? null,
          template_nome: input.template_nome ?? null,
          status_entrega: "enviada",
        })
        .select("id, direcao, tipo, conteudo, template_nome, status_entrega, wa_message_id, created_at")
        .single();
      if (msgErr) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msgErr.message });
      }

      // Atualiza lead: marca primeira mensagem se for a primeira e segue fluxo de atendimento
      await ctx.supabase
        .from("leads")
        .update({
          primeira_mensagem_em: new Date().toISOString(),
          status: "em_atendimento",
        })
        .eq("id", lead.id)
        .is("primeira_mensagem_em", null);

      await ctx.supabase.from("lead_eventos").insert({
        lead_id: lead.id,
        imobiliaria_id: ctx.profile.imobiliaria_id,
        tipo: "mensagem_enviada",
        usuario_id: ctx.user.id,
        payload: {
          tipo: input.tipo,
          conteudo: (input.texto ?? input.template_nome ?? "").slice(0, 200),
          wa_message_id: waMessageId,
        },
      });

      return mensagem;
    }),
});
