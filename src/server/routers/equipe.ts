import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";

export const equipeRouter = createTRPCRouter({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("equipes")
      .select("*, membros:usuarios(count)")
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .eq("ativo", true)
      .order("nome");
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data;
  }),

  criar: adminProcedure
    .input(z.object({ nome: z.string().min(2), descricao: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("equipes")
        .insert({ ...input, imobiliaria_id: ctx.profile.imobiliaria_id })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  atualizar: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().min(2).optional(),
        descricao: z.string().optional(),
        meta_vendas_mes: z.number().optional(),
        ativo: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const { data, error } = await ctx.supabase
        .from("equipes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),
});
