import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import { graphGet } from "@/lib/integrations/meta-oauth";

export const facebookRouter = createTRPCRouter({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("canais_facebook")
      .select(
        "id, nome, pagina_id, pagina_nome, pagina_foto_url, categoria, curtidas, ativo, conectado_em, ultimo_sync_em",
      )
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .order("created_at", { ascending: false });
    if (error)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),

  /**
   * Lista Pages que o user tem acesso via OAuth token salvo.
   */
  listarDisponiveis: adminProcedure.query(async ({ ctx }) => {
    const { data: config } = await ctx.supabase
      .from("configuracoes_imobiliaria")
      .select("meta_access_token")
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .single();
    if (!config?.meta_access_token) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Conecte sua conta Meta Ads primeiro em /integracoes.",
      });
    }

    const res = await graphGet<{
      data: Array<{
        id: string;
        name: string;
        category?: string;
        fan_count?: number;
        picture?: { data: { url: string } };
        access_token: string;
      }>;
    }>("me/accounts", config.meta_access_token, {
      fields: "id,name,category,fan_count,picture.type(square),access_token",
      limit: 100,
    }).catch(() => ({ data: [] as any[] }));

    return res.data.map((p) => ({
      pagina_id: p.id,
      pagina_nome: p.name,
      categoria: p.category,
      curtidas: p.fan_count,
      pagina_foto_url: p.picture?.data?.url,
      access_token: p.access_token,
    }));
  }),

  conectar: adminProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        pagina_id: z.string(),
        pagina_nome: z.string(),
        pagina_foto_url: z.string().optional(),
        categoria: z.string().optional(),
        curtidas: z.number().optional(),
        access_token: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("canais_facebook")
        .upsert(
          {
            imobiliaria_id: ctx.profile.imobiliaria_id,
            nome: input.nome,
            pagina_id: input.pagina_id,
            pagina_nome: input.pagina_nome,
            pagina_foto_url: input.pagina_foto_url,
            categoria: input.categoria,
            curtidas: input.curtidas,
            access_token: input.access_token,
            conectado_em: new Date().toISOString(),
          },
          { onConflict: "imobiliaria_id,pagina_id" },
        )
        .select("id")
        .single();
      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  desconectar: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("canais_facebook")
        .delete()
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);
      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});
