import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/supabase/types";

export async function createTRPCContext() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("usuarios")
    .select("id, imobiliaria_id, equipe_id, nome, email, role, ativo")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.profile) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!ctx.profile.ativo) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Usuário inativo" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      profile: ctx.profile,
    },
  });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.profile.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas super admins" });
  }
  return next({ ctx });
});

export const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed: Role[] = ["super_admin", "gerente"];
  if (!allowed.includes(ctx.profile.role as Role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
