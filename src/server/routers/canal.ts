import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import {
  listarBusinesses,
  listarWhatsappBusinessAccounts,
  listarPhoneNumbersDaWaba,
  listarTemplatesDaWaba,
  adicionarNumeroNaWaba,
  requisitarCodigoVerificacao,
  verificarCodigoNumero,
  registrarNumeroCloudAPI,
  obterWhatsappBusinessProfile,
  atualizarWhatsappBusinessProfile,
  obterDetalhesWaba,
  obterStatusPhoneNumber,
  obterAnalyticsWaba,
  obterConversationAnalytics,
  inscreverAppNaWaba,
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

      // Inscreve o app na WABA pra receber webhooks (msgs recebidas, status etc).
      // Sem isso, a Meta nao envia nada pro nosso endpoint mesmo com o webhook
      // verificado. Ignora falha (user pode reenviar manualmente depois).
      try {
        await inscreverAppNaWaba(
          config.meta_access_token,
          input.whatsapp_business_account_id,
        );
      } catch (err) {
        console.warn(
          `[canal.criar] inscreverAppNaWaba(${input.whatsapp_business_account_id}) falhou:`,
          err,
        );
      }

      return data;
    }),

  /**
   * Cria um canal colando credenciais diretamente (phone_number_id, WABA id,
   * access_token). Útil pra:
   * - Número de teste do painel Meta (token temporário de 24h)
   * - System User Token pré-existente
   * - Fallback quando OAuth nao ta configurado
   *
   * Nao exige meta_access_token salvo — o token recebido aqui é usado direto.
   * Tenta inscrever no webhook, mas ignora falha (comum com token de teste).
   */
  criarManual: adminProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        whatsapp_business_account_id: z.string().regex(/^\d+$/, "WABA ID deve ter só dígitos"),
        whatsapp_business_account_nome: z.string().optional(),
        whatsapp_phone_number_id: z.string().regex(/^\d+$/, "Phone Number ID deve ter só dígitos"),
        whatsapp_phone_display: z.string().optional(),
        access_token: z.string().min(20, "Access token parece curto demais"),
        equipe_id: z.string().uuid().nullable().optional(),
        corretor_id: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
          equipe_id: input.equipe_id ?? null,
          corretor_id: input.corretor_id ?? null,
          access_token: input.access_token,
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      try {
        await inscreverAppNaWaba(input.access_token, input.whatsapp_business_account_id);
      } catch (err) {
        console.warn(
          `[canal.criarManual] inscreverAppNaWaba(${input.whatsapp_business_account_id}) falhou:`,
          err,
        );
      }

      return data;
    }),

  /**
   * Envia um template ou texto direto pelo canal (pra smoke test do fluxo).
   * Usado na pagina /canais/manual pra validar que a credencial colada
   * funciona sem precisar criar lead/conversa.
   */
  enviarTeste: adminProcedure
    .input(
      z.object({
        canal_id: z.string().uuid(),
        para: z.string().regex(/^\d+$/, "Numero do destinatario deve ter só dígitos (ex: 5511972425144)"),
        template_name: z.string().default("hello_world"),
        language_code: z.string().default("en_US"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_whatsapp")
        .select("access_token, whatsapp_phone_number_id")
        .eq("id", input.canal_id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal) throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });

      const url = `https://graph.facebook.com/v19.0/${canal.whatsapp_phone_number_id}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${canal.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.para,
          type: "template",
          template: {
            name: input.template_name,
            language: { code: input.language_code },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Meta retornou ${res.status}: ${JSON.stringify(json)}`,
        });
      }
      return { ok: true, resposta: json };
    }),

  atualizar: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().min(2).optional(),
        equipe_id: z.string().uuid().nullable().optional(),
        corretor_id: z.string().uuid().nullable().optional(),
        ativo: z.boolean().optional(),
        fonte_lead_padrao: z.string().nullable().optional(),
        importar_contatos: z.boolean().optional(),
        limite_mensagens_mensal: z.number().int().nullable().optional(),
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

  /**
   * Retorna um canal com todos os metadados necessários para o modal de configuração.
   * Também sincroniza dados da WABA/BM da Meta no primeiro carregamento do dia.
   */
  obterDetalhes: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: canal, error } = await ctx.supabase
        .from("canais_whatsapp")
        .select(
          "id, nome, whatsapp_business_account_id, whatsapp_business_account_nome, whatsapp_phone_number_id, whatsapp_phone_display, verified_name, quality_rating, equipe_id, corretor_id, ativo, conectado_em, access_token, fonte_lead_padrao, importar_contatos, limite_mensagens_mensal, meta_business_id, meta_business_nome, meta_business_status, waba_status, ultimo_sync_perfil_em",
        )
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (error || !canal)
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });

      // Sincroniza metadados da WABA/BM se não foi feito hoje
      const hoje = new Date().toISOString().slice(0, 10);
      const ultimoSync = canal.ultimo_sync_perfil_em?.slice(0, 10);
      if (ultimoSync !== hoje) {
        try {
          const waba = await obterDetalhesWaba(
            canal.access_token,
            canal.whatsapp_business_account_id,
          );
          if (waba) {
            const bmId = waba.owner_business_info?.id ?? null;
            const bmNome = waba.owner_business_info?.name ?? null;
            await ctx.supabase
              .from("canais_whatsapp")
              .update({
                meta_business_id: bmId,
                meta_business_nome: bmNome,
                meta_business_status: waba.business_verification_status ?? null,
                waba_status: waba.account_review_status ?? null,
                ultimo_sync_perfil_em: new Date().toISOString(),
              })
              .eq("id", canal.id);
            canal.meta_business_id = bmId;
            canal.meta_business_nome = bmNome;
            canal.meta_business_status = waba.business_verification_status ?? null;
            canal.waba_status = waba.account_review_status ?? null;
          }
        } catch {
          /* ignora falha de sync — devolve o que já está salvo */
        }
      }

      // Nunca expõe o access_token pro cliente
      const { access_token, ...safe } = canal;
      return safe;
    }),

  /**
   * Lê o perfil WhatsApp Business (campos editáveis: nome, sobre, endereço, etc).
   */
  obterPerfilWhatsapp: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_whatsapp")
        .select("whatsapp_phone_number_id, access_token")
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal) throw new TRPCError({ code: "NOT_FOUND" });
      try {
        return await obterWhatsappBusinessProfile(
          canal.access_token,
          canal.whatsapp_phone_number_id,
        );
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }),

  /**
   * Atualiza o perfil WhatsApp Business via Graph API.
   * Campos editáveis: about, address, description, email, vertical, websites.
   */
  atualizarPerfilWhatsapp: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        about: z.string().max(139).optional(),
        address: z.string().max(256).optional(),
        description: z.string().max(512).optional(),
        email: z.string().email().or(z.literal("")).optional(),
        vertical: z.string().optional(),
        websites: z.array(z.string().url()).max(2).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_whatsapp")
        .select("whatsapp_phone_number_id, access_token")
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal) throw new TRPCError({ code: "NOT_FOUND" });
      const { id: _id, ...patch } = input;
      try {
        return await atualizarWhatsappBusinessProfile(
          canal.access_token,
          canal.whatsapp_phone_number_id,
          patch,
        );
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : String(err),
        });
      }
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

  // ===========================================================================
  // Cadastro de número novo (do zero, sem WhatsApp Manager)
  // ===========================================================================

  adicionarNumero: adminProcedure
    .input(
      z.object({
        waba_id: z.string(),
        cc: z.string().regex(/^\d+$/),
        phone_number: z.string().regex(/^\d+$/),
        verified_name: z.string().min(2).max(25),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: config } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("meta_access_token")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!config?.meta_access_token) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token Meta ausente" });
      }
      try {
        return await adicionarNumeroNaWaba(config.meta_access_token, input.waba_id, {
          cc: input.cc,
          phone_number: input.phone_number,
          verified_name: input.verified_name,
        });
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }),

  requisitarCodigo: adminProcedure
    .input(
      z.object({
        phone_number_id: z.string(),
        method: z.enum(["SMS", "VOICE"]).default("SMS"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: config } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("meta_access_token")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!config?.meta_access_token) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token Meta ausente" });
      }
      try {
        return await requisitarCodigoVerificacao(
          config.meta_access_token,
          input.phone_number_id,
          input.method,
        );
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }),

  verificarCodigo: adminProcedure
    .input(z.object({ phone_number_id: z.string(), code: z.string().min(4) }))
    .mutation(async ({ ctx, input }) => {
      const { data: config } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("meta_access_token")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!config?.meta_access_token) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token Meta ausente" });
      }
      try {
        return await verificarCodigoNumero(
          config.meta_access_token,
          input.phone_number_id,
          input.code,
        );
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }),

  registrarNumero: adminProcedure
    .input(
      z.object({
        phone_number_id: z.string(),
        pin: z.string().regex(/^\d{6}$/, "PIN deve ter 6 dígitos"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: config } = await ctx.supabase
        .from("configuracoes_imobiliaria")
        .select("meta_access_token")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!config?.meta_access_token) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token Meta ausente" });
      }
      try {
        return await registrarNumeroCloudAPI(
          config.meta_access_token,
          input.phone_number_id,
          input.pin,
        );
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : String(err),
        });
      }
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

  /**
   * Status completo do canal: mensagens enviadas, tier, quality rating,
   * phone numbers da WABA, BM status, etc.
   * Faz chamadas à Meta API e salva snapshot no banco.
   */
  statusCompleto: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_whatsapp")
        .select(
          "id, nome, access_token, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_phone_display, verified_name, quality_rating, messaging_limit_tier, name_status, throughput_level, phone_status, msgs_enviadas_30d, msgs_entregues_30d, conversas_pagas_30d, custo_30d_cents, is_official_business_account, ultimo_sync_status_em, meta_business_id, meta_business_nome, meta_business_status, waba_status",
        )
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal) throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });

      const { access_token, ...safe } = canal;
      return safe;
    }),

  /**
   * Sincroniza com a Meta: status do phone, analytics dos últimos 30 dias,
   * phone numbers da WABA, BM info. Salva tudo no banco.
   */
  sincronizarStatus: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_whatsapp")
        .select("id, access_token, whatsapp_business_account_id, whatsapp_phone_number_id")
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal) throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });

      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

      const [status, waba, analytics, convAnalytics] = await Promise.all([
        obterStatusPhoneNumber(canal.access_token, canal.whatsapp_phone_number_id),
        obterDetalhesWaba(canal.access_token, canal.whatsapp_business_account_id),
        obterAnalyticsWaba(
          canal.access_token,
          canal.whatsapp_business_account_id,
          thirtyDaysAgo,
          now,
          [canal.whatsapp_phone_number_id],
        ),
        obterConversationAnalytics(
          canal.access_token,
          canal.whatsapp_business_account_id,
          thirtyDaysAgo,
          now,
        ),
      ]);

      const enviadas =
        analytics?.data_points?.reduce((s, p) => s + (p.sent ?? 0), 0) ?? 0;
      const entregues =
        analytics?.data_points?.reduce((s, p) => s + (p.delivered ?? 0), 0) ?? 0;

      let conversas = 0;
      let custoCents = 0;
      for (const bucket of convAnalytics?.data ?? []) {
        for (const p of bucket.data_points ?? []) {
          conversas += p.conversation ?? 0;
          custoCents += Math.round((p.cost ?? 0) * 100);
        }
      }

      await ctx.supabase
        .from("canais_whatsapp")
        .update({
          messaging_limit_tier: status?.messaging_limit_tier ?? null,
          name_status: status?.name_status ?? null,
          throughput_level: status?.throughput?.level ?? null,
          phone_status: status?.status ?? null,
          quality_rating: status?.quality_rating ?? null,
          is_official_business_account: status?.is_official_business_account ?? false,
          msgs_enviadas_30d: enviadas,
          msgs_entregues_30d: entregues,
          conversas_pagas_30d: conversas,
          custo_30d_cents: custoCents,
          meta_business_id: waba?.owner_business_info?.id ?? null,
          meta_business_nome: waba?.owner_business_info?.name ?? null,
          meta_business_status: waba?.business_verification_status ?? null,
          waba_status: waba?.account_review_status ?? null,
          ultimo_sync_status_em: new Date().toISOString(),
          ultimo_sync_perfil_em: new Date().toISOString(),
        })
        .eq("id", canal.id);

      return {
        ok: true,
        tier: status?.messaging_limit_tier,
        enviadas,
        entregues,
        conversas,
        custo_cents: custoCents,
      };
    }),

  /**
   * Lista todos os phone_numbers da WABA (mais do que só o cadastrado neste canal).
   * Usado pra ver o limite de registros e quais números tão disponíveis.
   */
  listarPhonesDaWaba: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_whatsapp")
        .select("access_token, whatsapp_business_account_id")
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal) throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });

      return listarPhoneNumbersDaWaba(
        canal.access_token,
        canal.whatsapp_business_account_id,
      );
    }),

  /**
   * Inscreve manualmente a WABA deste canal no app pra receber webhooks.
   * Idempotente — pode chamar de novo sem problema.
   */
  inscreverNoWebhook: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_whatsapp")
        .select("access_token, whatsapp_business_account_id")
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal)
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });
      try {
        await inscreverAppNaWaba(
          canal.access_token,
          canal.whatsapp_business_account_id,
        );
        return { ok: true };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }),
});
