import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";

export const imobiliariaRouter = createTRPCRouter({
  current: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("imobiliarias")
      .select("*")
      .eq("id", ctx.profile.imobiliaria_id)
      .single();
    if (error) throw new TRPCError({ code: "NOT_FOUND" });
    return data;
  }),

  update: adminProcedure
    .input(
      z.object({
        nome: z.string().min(2).optional(),
        cnpj: z.string().optional(),
        logo_url: z.string().url().optional(),
        cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("imobiliarias")
        .update(input)
        .eq("id", ctx.profile.imobiliaria_id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),
});
