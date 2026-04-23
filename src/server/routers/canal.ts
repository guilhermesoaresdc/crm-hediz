import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import {
  listarBusinesses,
  listarWhatsappBusinessAccounts,
  listarPhoneNumbersDaWaba,
  listarTemplatesDaWaba,
} from "@/lib/integrations/meta-oauth";

export const canalRouter = createTRPCRouter({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("canais_whatsapp")
      .select(
        "id, nome, whatsapp_business_account_id, whatsapp_business_account_nome, whatsapp_phone_number_id, whatsapp_phone_display, verified_name, quality_rating, equipe_id, corretor_id, ativo, conectado_em, ultimo_sync_templates_em, equipe:equipes(id, nome), corretor:usuarios!canais_whatsapp_corretor_id_fkey(id, nome)",
      )
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .order("created_at", { ascending: false });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),

  /**
   * Step 1 do wizard de canal: retorna businesses do user.
   * Usa o meta_access_token salvo em configuracoes_imobiliaria.
   */
  listarBusinessesDisponiveis: adminProcedure.query(async ({ ctx }) => {
    const { data: config } = await ctx.supabase
      .from("configuracoes_imobiliaria")
      .select("meta_access_token")
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .single();
    if (!config?.meta_access_token) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Token Meta ausente. Conecte Meta Ads primeiro em /integracoes.",
      });
    }
    return listarBusinesses(config.meta_access_token);
  }),

  listarWabasDisponiveis: adminProcedure
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
      return listarWhatsappBusinessAccounts(config.meta_access_token, input.business_id);
    }),

  listarPhonesDisponiveis: adminProcedure
    .input(z.object({ waba_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: config } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("meta_access_token")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!config?.meta_access_token) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token Meta ausente" });
      }
      return listarPhoneNumbersDaWaba(config.meta_access_token, input.waba_id);
    }),

  /**
   * Cria um novo canal WhatsApp na imobiliária.
   */
  criar: adminProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        whatsapp_business_account_id: z.string(),
        whatsapp_business_account_nome: z.string().optional(),
        whatsapp_phone_number_id: z.string(),
        whatsapp_phone_display: z.string().optional(),
        verified_name: z.string().optional(),
        quality_rating: z.string().optional(),
        equipe_id: z.string().uuid().nullable().optional(),
        corretor_id: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Reusa o access token do OAuth
      const { data: config } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("meta_access_token")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!config?.meta_access_token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Conecte Meta Ads primeiro pra obter token",
        });
      }

      // Checa duplicidade
      const { data: existente } = await ctx.supabase
        .from("canais_whatsapp")
        .select("id")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .eq("whatsapp_phone_number_id", input.whatsapp_phone_number_id)
        .maybeSingle();
      if (existente) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Esse número já está conectado como canal",
        });
      }

      const { data, error } = await ctx.supabase
        .from("canais_whatsapp")
        .insert({
          imobiliaria_id: ctx.profile.imobiliaria_id,
          nome: input.nome,
          whatsapp_business_account_id: input.whatsapp_business_account_id,
          whatsapp_business_account_nome: input.whatsapp_business_account_nome,
          whatsapp_phone_number_id: input.whatsapp_phone_number_id,
          whatsapp_phone_display: input.whatsapp_phone_display,
          verified_name: input.verified_name,
          quality_rating: input.quality_rating,
          equipe_id: input.equipe_id ?? null,
          corretor_id: input.corretor_id ?? null,
          access_token: config.meta_access_token,
        })
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
        equipe_id: z.string().uuid().nullable().optional(),
        corretor_id: z.string().uuid().nullable().optional(),
        ativo: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const { data, error } = await ctx.supabase
        .from("canais_whatsapp")
        .update(updates)
        .eq("id", id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  deletar: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("canais_whatsapp")
        .delete()
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  /**
   * Sincroniza templates do canal com a Meta Graph API.
   */
  sincronizarTemplates: adminProcedure
    .input(z.object({ canal_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_whatsapp")
        .select("id, whatsapp_business_account_id, access_token")
        .eq("id", input.canal_id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal) throw new TRPCError({ code: "NOT_FOUND" });

      const templates = await listarTemplatesDaWaba(
        canal.access_token,
        canal.whatsapp_business_account_id,
      );

      let saved = 0;
      for (const t of templates) {
        const header = t.components.find((c) => c.type === "HEADER");
        const body = t.components.find((c) => c.type === "BODY");
        const footer = t.components.find((c) => c.type === "FOOTER");

        const { error } = await ctx.supabase.from("templates_whatsapp").upsert(
          {
            imobiliaria_id: ctx.profile.imobiliaria_id,
            canal_id: canal.id,
            meta_template_id: t.id,
            nome: t.name,
            categoria: t.category,
            idioma: t.language,
            status: t.status,
            componentes: t.components,
            body_text: body?.text ?? null,
            header_text: header?.text ?? null,
            footer_text: footer?.text ?? null,
          },
          { onConflict: "canal_id,nome,idioma" },
        );
        if (!error) saved++;
      }

      await ctx.supabase
        .from("canais_whatsapp")
        .update({ ultimo_sync_templates_em: new Date().toISOString() })
        .eq("id", canal.id);

      return { ok: true, total: templates.length, saved };
    }),
});
