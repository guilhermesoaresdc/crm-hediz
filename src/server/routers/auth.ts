import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;

    const { data: profile } = await ctx.supabase
      .from("usuarios")
      .select(
        "id, imobiliaria_id, equipe_id, nome, email, role, avatar_url, ativo, imobiliaria:imobiliarias(id, slug, nome, logo_url, cor_primaria)",
      )
      .eq("id", ctx.user.id)
      .single();

    return profile;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2).optional(),
        telefone: z.string().optional(),
        whatsapp: z.string().optional(),
        creci: z.string().optional(),
        avatar_url: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("usuarios")
        .update(input)
        .eq("id", ctx.user.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  setPausa: protectedProcedure
    .input(z.object({ em_pausa: z.boolean(), ate: z.string().datetime().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("usuarios")
        .update({ em_pausa: input.em_pausa, pausa_ate: input.ate ?? null })
        .eq("id", ctx.user.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});
