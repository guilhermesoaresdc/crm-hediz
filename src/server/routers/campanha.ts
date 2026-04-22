import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, managerProcedure } from "../trpc";

export const campanhaRouter = createTRPCRouter({
  listar: managerProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("campanhas")
      .select("*")
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .order("created_at", { ascending: false });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),

  anunciosDaCampanha: managerProcedure
    .input(z.object({ campanha_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("anuncios")
        .select("*, conjunto:conjuntos_anuncios(id, nome)")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .in(
          "conjunto_id",
          (
            await ctx.supabase
              .from("conjuntos_anuncios")
              .select("id")
              .eq("campanha_id", input.campanha_id)
          ).data?.map((c) => c.id) ?? [],
        );
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),
});
