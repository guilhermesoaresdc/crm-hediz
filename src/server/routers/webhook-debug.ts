import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../trpc";

export const webhookDebugRouter = createTRPCRouter({
  /**
   * Lista os últimos N webhooks recebidos (raw payloads), filtrado por source.
   */
  listarLogs: adminProcedure
    .input(
      z
        .object({
          source: z.string().optional(),
          limit: z.number().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from("webhook_logs")
        .select("id, source, payload_raw, processado, erro, created_at")
        .order("created_at", { ascending: false })
        .limit(input?.limit ?? 50);

      if (input?.source) q = q.eq("source", input.source);

      const { data, error } = await q;
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      return data ?? [];
    }),

  /**
   * Estatísticas rápidas pra debug.
   */
  stats: adminProcedure.query(async ({ ctx }) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);

    const [total24h, totalHora, canaisAtivos, ultimaMsg] = await Promise.all([
      ctx.supabase
        .from("webhook_logs")
        .select("id", { count: "exact", head: true })
        .eq("source", "whatsapp")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ctx.supabase
        .from("webhook_logs")
        .select("id", { count: "exact", head: true })
        .eq("source", "whatsapp")
        .gte("created_at", umaHoraAtras.toISOString()),
      ctx.supabase
        .from("canais_whatsapp")
        .select("id, nome, whatsapp_phone_number_id, whatsapp_phone_display, ativo")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id),
      ctx.supabase
        .from("mensagens_whatsapp")
        .select("id, direcao, created_at, conteudo")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .eq("direcao", "recebida")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      whatsapp_logs_24h: total24h.count ?? 0,
      whatsapp_logs_1h: totalHora.count ?? 0,
      canais: canaisAtivos.data ?? [],
      ultima_mensagem_recebida: ultimaMsg.data ?? null,
    };
  }),
});
