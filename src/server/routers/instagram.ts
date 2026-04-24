import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import { graphGet } from "@/lib/integrations/meta-oauth";

export const instagramRouter = createTRPCRouter({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("canais_instagram")
      .select(
        "id, nome, username, instagram_business_account_id, pagina_id, pagina_nome, seguidores, ativo, conectado_em, ultimo_sync_em",
      )
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .order("created_at", { ascending: false });
    if (error)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),

  /**
   * Lista Instagram Professional Accounts ligados às Pages que o user tem acesso.
   * Requer meta_access_token salvo em configuracoes_imobiliaria.
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

    // Busca as Pages do user, depois pra cada Page busca o IG linked
    const pagesRes = await graphGet<{
      data: Array<{ id: string; name: string; access_token: string }>;
    }>("me/accounts", config.meta_access_token, {
      fields: "id,name,access_token",
      limit: 100,
    }).catch(() => ({ data: [] as any[] }));

    const resultado: Array<{
      instagram_business_account_id: string;
      username: string;
      followers_count?: number;
      pagina_id: string;
      pagina_nome: string;
      access_token: string;
    }> = [];

    for (const page of pagesRes.data) {
      const ig = await graphGet<{
        instagram_business_account?: {
          id: string;
          username: string;
          followers_count?: number;
        };
      }>(page.id, page.access_token, {
        fields: "instagram_business_account{id,username,followers_count}",
      }).catch(() => null);

      if (ig?.instagram_business_account) {
        resultado.push({
          instagram_business_account_id: ig.instagram_business_account.id,
          username: ig.instagram_business_account.username,
          followers_count: ig.instagram_business_account.followers_count,
          pagina_id: page.id,
          pagina_nome: page.name,
          access_token: page.access_token,
        });
      }
    }

    return resultado;
  }),

  conectar: adminProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        instagram_business_account_id: z.string(),
        username: z.string(),
        pagina_id: z.string(),
        pagina_nome: z.string(),
        access_token: z.string(),
        seguidores: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("canais_instagram")
        .upsert(
          {
            imobiliaria_id: ctx.profile.imobiliaria_id,
            nome: input.nome,
            instagram_business_account_id: input.instagram_business_account_id,
            username: input.username,
            pagina_id: input.pagina_id,
            pagina_nome: input.pagina_nome,
            access_token: input.access_token,
            seguidores: input.seguidores,
            conectado_em: new Date().toISOString(),
          },
          { onConflict: "imobiliaria_id,instagram_business_account_id" },
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
        .from("canais_instagram")
        .delete()
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);
      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});
