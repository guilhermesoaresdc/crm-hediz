import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import { EvolutionAPI } from "@/lib/integrations/evolution-api";

export const baileysRouter = createTRPCRouter({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("canais_baileys")
      .select(
        "id, nome, numero_telefone, instancia_url, instancia_nome, status, qr_expira_em, ativo, conectado_em, ultimo_sync_em",
      )
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .order("created_at", { ascending: false });
    if (error)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),

  /**
   * Testa conexão com uma Evolution API antes de criar o canal.
   */
  testarServidor: adminProcedure
    .input(z.object({ url: z.string().url(), api_key: z.string().min(4) }))
    .mutation(async ({ input }) => {
      const api = new EvolutionAPI({ url: input.url, apiKey: input.api_key });
      return api.testar();
    }),

  /**
   * Cria o canal no banco + cria a instância Baileys no servidor Evolution.
   */
  criar: adminProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        instancia_url: z.string().url(),
        instancia_api_key: z.string().min(4),
        instancia_nome: z
          .string()
          .min(3)
          .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, numeros, _ e -"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const api = new EvolutionAPI({
        url: input.instancia_url,
        apiKey: input.instancia_api_key,
      });

      // Tenta criar instância no servidor
      try {
        await api.criarInstancia(input.instancia_nome);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Falha ao criar instância",
        });
      }

      const { data, error } = await ctx.supabase
        .from("canais_baileys")
        .insert({
          imobiliaria_id: ctx.profile.imobiliaria_id,
          nome: input.nome,
          instancia_url: input.instancia_url,
          instancia_api_key: input.instancia_api_key,
          instancia_nome: input.instancia_nome,
          status: "aguardando_qr",
        })
        .select("id")
        .single();
      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  /**
   * Busca o QR code atual da instância (pra escanear no celular).
   * QR expira em ~30s — cliente deve fazer polling.
   */
  obterQr: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_baileys")
        .select("id, instancia_url, instancia_api_key, instancia_nome")
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal)
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });

      const api = new EvolutionAPI({
        url: canal.instancia_url,
        apiKey: canal.instancia_api_key,
      });

      try {
        const qr = await api.obterQrCode(canal.instancia_nome);
        const expira = new Date(Date.now() + 30_000).toISOString();

        await ctx.supabase
          .from("canais_baileys")
          .update({
            qr_code_base64: qr.base64 ?? null,
            qr_expira_em: expira,
            status: "aguardando_qr",
          })
          .eq("id", canal.id);

        return { base64: qr.base64, expira_em: expira };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Falha ao gerar QR",
        });
      }
    }),

  /**
   * Status atual da instância (polling depois do QR).
   */
  sincronizarStatus: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_baileys")
        .select("id, instancia_url, instancia_api_key, instancia_nome")
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal)
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });

      const api = new EvolutionAPI({
        url: canal.instancia_url,
        apiKey: canal.instancia_api_key,
      });

      try {
        const s = await api.obterStatus(canal.instancia_nome);
        const state = s.instance?.state ?? "desconectado";
        const mapped =
          state === "open" || state === "connected"
            ? "conectado"
            : state === "connecting"
              ? "aguardando_qr"
              : "desconectado";

        const updates: Record<string, unknown> = {
          status: mapped,
          ultimo_sync_em: new Date().toISOString(),
        };
        if (mapped === "conectado") {
          updates.conectado_em = new Date().toISOString();
          updates.qr_code_base64 = null;
          updates.qr_expira_em = null;
        }

        await ctx.supabase.from("canais_baileys").update(updates).eq("id", canal.id);

        return { status: mapped };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Falha no sync",
        });
      }
    }),

  desconectar: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_baileys")
        .select("id, instancia_url, instancia_api_key, instancia_nome")
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal)
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });

      const api = new EvolutionAPI({
        url: canal.instancia_url,
        apiKey: canal.instancia_api_key,
      });
      try {
        await api.desconectar(canal.instancia_nome);
      } catch {
        /* ignora se servidor tá offline */
      }

      await ctx.supabase
        .from("canais_baileys")
        .update({
          status: "desconectado",
          qr_code_base64: null,
          qr_expira_em: null,
        })
        .eq("id", canal.id);

      return { ok: true };
    }),

  deletar: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("canais_baileys")
        .delete()
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id);
      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});
