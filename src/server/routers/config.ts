import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import { testarCredenciaisMeta, sincronizarCampanhasImobiliaria, sincronizarCustosImobiliaria } from "@/lib/integrations/meta-graph";
import {
  listarBusinesses,
  listarAssetsDoBusiness,
  listarPixelsDoAdAccount,
} from "@/lib/integrations/meta-oauth";
import { sendInngestEvent } from "@/lib/inngest/client";

export const configRouter = createTRPCRouter({
  /**
   * Flags de features baseadas em env vars do servidor.
   * Usado pelo client pra decidir se mostra botão OAuth.
   * Evita depender de NEXT_PUBLIC_* (que tem pegadinha de build-time).
   */
  features: protectedProcedure.query(() => {
    const metaAppId =
      process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;

    return {
      metaOauthEnabled: !!(metaAppId && metaAppSecret),
      inngestEnabled: !!process.env.INNGEST_EVENT_KEY,
    };
  }),

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

  /**
   * Step 1 do wizard: lista apenas os Business Managers do user.
   */
  listarBusinessesMeta: adminProcedure.query(async ({ ctx }) => {
    const { data: config } = await ctx.supabase
      .from("configuracoes_imobiliaria")
      .select("meta_access_token")
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .single();

    if (!config?.meta_access_token) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Token Meta não disponível. Refaça o login com Facebook.",
      });
    }

    const businesses = await listarBusinesses(config.meta_access_token);
    return { businesses };
  }),

  /**
   * Steps 2-3 do wizard: lista ad accounts e pages DA BM selecionada.
   */
  listarAssetsDoBusinessMeta: adminProcedure
    .input(z.object({ business_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: config } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("meta_access_token")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!config?.meta_access_token) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token Meta ausente" });
      }
      return listarAssetsDoBusiness(config.meta_access_token, input.business_id);
    }),

  listarPixelsMeta: adminProcedure
    .input(z.object({ ad_account_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: config } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("meta_access_token")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!config?.meta_access_token) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token Meta ausente" });
      }
      return listarPixelsDoAdAccount(config.meta_access_token, input.ad_account_id);
    }),

  /**
   * Finaliza a conexão Meta salvando os IDs que o user selecionou no wizard.
   * Trigger síncrono de 1ª sincronização.
   */
  finalizarConexaoMeta: adminProcedure
    .input(
      z.object({
        meta_business_id: z.string(),
        meta_ad_account_id: z.string(),
        meta_page_id: z.string().optional(),
        meta_pixel_id: z.string().optional(),
        meta_capi_token: z.string().optional(),
        page_access_token: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {
        meta_business_id: input.meta_business_id,
        meta_ad_account_id: input.meta_ad_account_id,
        meta_page_id: input.meta_page_id ?? null,
        meta_pixel_id: input.meta_pixel_id ?? null,
        meta_conectado_em: new Date().toISOString(),
      };

      // Se user colou CAPI token separado, usa ele; senão reusa user token
      if (input.meta_capi_token) {
        updates.meta_capi_token = input.meta_capi_token;
      } else {
        const { data: current } = await ctx.supabase
          .from("configuracoes_imobiliaria")
          .select("meta_access_token")
          .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
          .single();
        if (current?.meta_access_token && !input.meta_capi_token) {
          updates.meta_capi_token = current.meta_access_token;
        }
      }

      const { error } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .update(updates)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      // Dispara 1ª sync em background (best-effort)
      sendInngestEvent("meta/sincronizar", {
        imobiliaria_id: ctx.profile.imobiliaria_id,
        tipo: "ambos",
      }).catch(() => {});

      return { ok: true };
    }),

  desconectarMeta: adminProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from("configuracoes_imobiliaria")
      .update({
        meta_business_id: null,
        meta_ad_account_id: null,
        meta_page_id: null,
        meta_access_token: null,
        meta_pixel_id: null,
        meta_capi_token: null,
        meta_conectado_em: null,
      })
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return { ok: true };
  }),

  testarMeta: adminProcedure.mutation(async ({ ctx }) => {
    const { data: config } = await ctx.supabase
      .from("configuracoes_imobiliaria")
      .select("meta_access_token, meta_ad_account_id")
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .single();

    if (!config?.meta_access_token) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Token Meta não configurado" });
    }

    try {
      const me = await testarCredenciaisMeta(config.meta_access_token);
      return {
        ok: true,
        business: me.name,
        business_id: me.id,
        ad_account: config.meta_ad_account_id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Token inválido: ${msg}` });
    }
  }),

  sincronizarMetaAgora: adminProcedure
    .input(
      z
        .object({ tipo: z.enum(["campanhas", "custos", "ambos"]).default("ambos") })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const tipo = input?.tipo ?? "ambos";

      // Se Inngest estiver configurado, dispara evento (roda em background com retry)
      if (process.env.INNGEST_EVENT_KEY) {
        await sendInngestEvent("meta/sincronizar", {
          imobiliaria_id: ctx.profile.imobiliaria_id,
          tipo,
        });
        return { ok: true, modo: "background" as const };
      }

      // Fallback: roda síncrono (bloqueia a request mas funciona sem Inngest)
      const resultado = { campanhas: 0, custos: 0 };
      if (tipo === "campanhas" || tipo === "ambos") {
        const r = await sincronizarCampanhasImobiliaria(ctx.profile.imobiliaria_id);
        resultado.campanhas = r.items;
      }
      if (tipo === "custos" || tipo === "ambos") {
        const r = await sincronizarCustosImobiliaria(ctx.profile.imobiliaria_id, 7);
        resultado.custos = r.items;
      }
      return { ok: true, modo: "sincrono" as const, ...resultado };
    }),

  statusSync: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("sync_log")
      .select("id, tipo, status, items_processados, erro, iniciado_em, finalizado_em")
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .order("iniciado_em", { ascending: false })
      .limit(10);

    type SyncLogRow = NonNullable<typeof data>[number];
    const ultimoPorTipo: Record<string, SyncLogRow | undefined> = {};
    for (const log of data ?? []) {
      if (!ultimoPorTipo[log.tipo]) ultimoPorTipo[log.tipo] = log;
    }

    return {
      recentes: data ?? [],
      ultima_campanhas: ultimoPorTipo["meta_campanhas"] ?? null,
      ultima_custos: ultimoPorTipo["meta_custos"] ?? null,
    };
  }),

  desconectarWhatsapp: adminProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from("configuracoes_imobiliaria")
      .update({
        whatsapp_phone_number_id: null,
        whatsapp_business_account_id: null,
        whatsapp_access_token: null,
        whatsapp_conectado_em: null,
      })
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
