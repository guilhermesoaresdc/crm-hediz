import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, managerProcedure } from "../trpc";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

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

  convidar: adminProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        email: z.string().email(),
        role: z.enum(["gerente", "corretor", "financeiro"]).default("corretor"),
        equipe_id: z.string().uuid().nullable().optional(),
        telefone: z.string().optional(),
        creci: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const svc = createSupabaseServiceClient();

      // Checa se email já existe
      const { data: existente } = await svc
        .from("usuarios")
        .select("id")
        .eq("email", input.email)
        .maybeSingle();
      if (existente) {
        throw new TRPCError({ code: "CONFLICT", message: "Esse email já tem conta" });
      }

      // Senha temporária: admin passa pro corretor (depois ele troca)
      const senhaTemp =
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 6).toUpperCase() +
        "!";

      const { data: authData, error: authErr } = await svc.auth.admin.createUser({
        email: input.email,
        password: senhaTemp,
        email_confirm: true,
      });
      if (authErr || !authData.user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: authErr?.message ?? "Falha ao criar usuário",
        });
      }

      const { error: usrErr } = await svc.from("usuarios").insert({
        id: authData.user.id,
        imobiliaria_id: ctx.profile.imobiliaria_id,
        equipe_id: input.equipe_id ?? null,
        nome: input.nome,
        email: input.email,
        telefone: input.telefone,
        creci: input.creci,
        role: input.role,
      });
      if (usrErr) {
        await svc.auth.admin.deleteUser(authData.user.id);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: usrErr.message });
      }

      return {
        ok: true,
        user_id: authData.user.id,
        senha_temporaria: senhaTemp,
      };
    }),

  desativar: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("usuarios")
        .update({ ativo: false })
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  reativar: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("usuarios")
        .update({ ativo: true })
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
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
