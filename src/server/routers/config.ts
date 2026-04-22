import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";

export const configRouter = createTRPCRouter({
  obter: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("configuracoes_imobiliaria")
      .select(
        // Oculta tokens no read comum
        "imobiliaria_id, bolsao_ativo, bolsao_timeout_minutos, bolsao_elegibilidade, bolsao_limite_diario_por_corretor, roleta_tipo, roleta_respeita_horario, roleta_respeita_pausa, roleta_respeita_limite_diario, meta_business_id, meta_ad_account_id, meta_page_id, meta_pixel_id, meta_conectado_em, whatsapp_phone_number_id, whatsapp_business_account_id, whatsapp_conectado_em, fee_agencia_tipo, fee_agencia_valor",
      )
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .single();
    if (error) throw new TRPCError({ code: "NOT_FOUND" });
    return data;
  }),

  atualizar: adminProcedure
    .input(
      z.object({
        bolsao_ativo: z.boolean().optional(),
        bolsao_timeout_minutos: z.number().int().min(1).max(60).optional(),
        bolsao_elegibilidade: z.enum(["todos", "mesma_equipe", "mesma_especialidade", "customizado"]).optional(),
        bolsao_limite_diario_por_corretor: z.number().int().min(0).max(100).optional(),
        roleta_tipo: z.enum(["round_robin", "peso", "regra"]).optional(),
        roleta_respeita_horario: z.boolean().optional(),
        roleta_respeita_pausa: z.boolean().optional(),
        roleta_respeita_limite_diario: z.boolean().optional(),
        fee_agencia_tipo: z.enum(["fixo", "percentual", "sem_fee"]).optional(),
        fee_agencia_valor: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .update(input)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  conectarMeta: adminProcedure
    .input(
      z.object({
        meta_business_id: z.string(),
        meta_ad_account_id: z.string(),
        meta_page_id: z.string(),
        meta_access_token: z.string(),
        meta_pixel_id: z.string(),
        meta_capi_token: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .update({ ...input, meta_conectado_em: new Date().toISOString() })
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  conectarWhatsapp: adminProcedure
    .input(
      z.object({
        whatsapp_phone_number_id: z.string(),
        whatsapp_business_account_id: z.string(),
        whatsapp_access_token: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .update({ ...input, whatsapp_conectado_em: new Date().toISOString() })
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});
