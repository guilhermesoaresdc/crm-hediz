import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sendInngestEvent } from "@/lib/inngest/client";

export const bolsaoRouter = createTRPCRouter({
  disponiveis: protectedProcedure.query(async ({ ctx }) => {
    // Lista leads no bolsão visíveis para o corretor
    const { data: config } = await ctx.supabase
      .from("configuracoes_imobiliaria")
      .select("bolsao_elegibilidade")
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .single();

    let q = ctx.supabase
      .from("leads")
      .select(
        "id, nome, whatsapp, origem, campanha:campanhas(nome), anuncio:anuncios(nome), bolsao_expira_em, created_at",
      )
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .eq("em_bolsao", true)
      .gt("bolsao_expira_em", new Date().toISOString())
      .order("bolsao_expira_em", { ascending: true });

    // Filtra por elegibilidade
    if (
      config?.bolsao_elegibilidade === "mesma_equipe" &&
      ctx.profile.role === "corretor" &&
      ctx.profile.equipe_id
    ) {
      q = q.eq("equipe_id", ctx.profile.equipe_id);
    }

    const { data, error } = await q;
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),

  pegar: protectedProcedure
    .input(z.object({ lead_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Chama RPC com security definer que faz lock atômico
      const { data, error } = await ctx.supabase.rpc("pegar_lead_bolsao", {
        p_lead_id: input.lead_id,
        p_corretor_id: ctx.user.id,
      });

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const result = data as { ok: boolean; erro?: string; corretor_id?: string };
      if (!result.ok) {
        const msg =
          result.erro === "ja_pego_ou_expirado"
            ? "Lead já foi pego ou expirou"
            : result.erro === "limite_bolsao_diario"
              ? "Limite diário de leads do bolsão atingido"
              : "Não foi possível pegar o lead";
        throw new TRPCError({ code: "BAD_REQUEST", message: msg });
      }

      // Reagenda verificação de timeout
      const { data: config2 } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("bolsao_timeout_minutos")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      await sendInngestEvent("lead/atribuido", {
        lead_id: input.lead_id,
        corretor_id: ctx.user.id,
        imobiliaria_id: ctx.profile.imobiliaria_id,
        timeout_minutos: config2?.bolsao_timeout_minutos ?? 5,
      });

      return result;
    }),
});
