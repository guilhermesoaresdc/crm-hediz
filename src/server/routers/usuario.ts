import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, managerProcedure, protectedProcedure } from "../trpc";

export const usuarioRouter = createTRPCRouter({
  listar: managerProcedure
    .input(
      z.object({
        equipe_id: z.string().uuid().optional(),
        role: z.enum(["super_admin", "gerente", "corretor", "financeiro"]).optional(),
        apenas_ativos: z.boolean().default(true),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from("usuarios")
        .select("id, nome, email, role, avatar_url, ativo, em_pausa, leads_hoje, limite_leads_dia, equipe_id")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);

      if (ctx.profile.role === "gerente" && ctx.profile.equipe_id) {
        q = q.eq("equipe_id", ctx.profile.equipe_id);
      }
      if (input?.equipe_id) q = q.eq("equipe_id", input.equipe_id);
      if (input?.role) q = q.eq("role", input.role);
      if (input?.apenas_ativos ?? true) q = q.eq("ativo", true);

      const { data, error } = await q.order("nome");
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  atualizar: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().min(2).optional(),
        role: z.enum(["super_admin", "gerente", "corretor", "financeiro"]).optional(),
        equipe_id: z.string().uuid().nullable().optional(),
        ativo: z.boolean().optional(),
        limite_leads_dia: z.number().int().min(0).max(500).optional(),
        horario_inicio: z.string().optional(),
        horario_fim: z.string().optional(),
        dias_trabalho: z.array(z.number().int().min(0).max(6)).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const { data, error } = await ctx.supabase
        .from("usuarios")
        .update(updates)
        .eq("id", id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),
});
