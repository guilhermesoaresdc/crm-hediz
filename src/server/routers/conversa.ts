import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const conversaRouter = createTRPCRouter({
  /**
   * Lista conversas de WhatsApp da imobiliária, com dados do lead, canal
   * e última mensagem. Ordenado por última atividade.
   */
  listar: protectedProcedure
    .input(
      z
        .object({
          canal_id: z.string().uuid().optional(),
          status: z.enum(["aberta", "encerrada"]).optional(),
          busca: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from("conversas_whatsapp")
        .select(
          `id, whatsapp_numero, status, ultima_mensagem_em, created_at,
           lead:leads(id, nome, status, em_bolsao),
           corretor:usuarios!conversas_whatsapp_corretor_id_fkey(id, nome),
           canal:canais_whatsapp(id, nome, whatsapp_phone_display, verified_name)`,
        )
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .order("ultima_mensagem_em", { ascending: false, nullsFirst: false });

      if (input?.canal_id) query = query.eq("canal_id", input.canal_id);
      if (input?.status) query = query.eq("status", input.status);

      const { data, error } = await query.limit(200);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const conversas = data ?? [];
      if (conversas.length === 0) return [];

      // Busca a última mensagem de cada conversa pra preview
      const ids = conversas.map((c) => c.id);
      const { data: ultimas } = await ctx.supabase
        .from("mensagens_whatsapp")
        .select("conversa_id, direcao, tipo, conteudo, template_nome, created_at")
        .in("conversa_id", ids)
        .order("created_at", { ascending: false });

      const mapaUltimas: Record<string, any> = {};
      for (const m of ultimas ?? []) {
        if (!mapaUltimas[m.conversa_id]) mapaUltimas[m.conversa_id] = m;
      }

      // Busca texto filtrando client-side se houver busca
      let resultado = conversas.map((c: any) => ({
        ...c,
        ultima_mensagem: mapaUltimas[c.id] ?? null,
      }));

      if (input?.busca?.trim()) {
        const q = input.busca.toLowerCase();
        resultado = resultado.filter((c) => {
          const nome = c.lead?.nome?.toLowerCase() ?? "";
          const num = c.whatsapp_numero ?? "";
          return nome.includes(q) || num.includes(q);
        });
      }

      return resultado;
    }),

  /**
   * Detalhes de uma conversa + lead e canal.
   */
  detalhes: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("conversas_whatsapp")
        .select(
          `id, whatsapp_numero, status, ultima_mensagem_em, created_at, canal_id,
           lead:leads(id, nome, whatsapp, email, status, em_bolsao, primeira_mensagem_em, primeira_resposta_em),
           corretor:usuarios!conversas_whatsapp_corretor_id_fkey(id, nome),
           canal:canais_whatsapp(id, nome, whatsapp_phone_display, verified_name)`,
        )
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (error) throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada" });
      return data;
    }),
});
