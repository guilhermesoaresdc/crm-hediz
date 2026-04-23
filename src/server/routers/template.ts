import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import {
  criarTemplateNaMeta,
  deletarTemplateNaMeta,
  type NovoTemplate,
} from "@/lib/integrations/meta-oauth";

const botaoSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("QUICK_REPLY"), text: z.string().min(1).max(25) }),
  z.object({
    type: z.literal("URL"),
    text: z.string().min(1).max(25),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("PHONE_NUMBER"),
    text: z.string().min(1).max(25),
    phone_number: z.string().min(6),
  }),
]);

const criarInput = z.object({
  canal_id: z.string().uuid(),
  nome: z
    .string()
    .min(1)
    .max(512)
    .regex(/^[a-z0-9_]+$/, "Use só letras minúsculas, números e underscore"),
  categoria: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).default("UTILITY"),
  idioma: z.string().default("pt_BR"),
  header_text: z.string().max(60).optional(),
  body_text: z.string().min(1).max(1024),
  footer_text: z.string().max(60).optional(),
  botoes: z.array(botaoSchema).max(3).optional(),
  exemplos_header: z.array(z.string()).optional(),
  exemplos_body: z.array(z.string()).optional(),
});

export const templateRouter = createTRPCRouter({
  listar: protectedProcedure
    .input(z.object({ canal_id: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from("templates_whatsapp")
        .select(
          "id, canal_id, meta_template_id, nome, categoria, idioma, status, body_text, header_text, footer_text, componentes, canal:canais_whatsapp(id, nome, whatsapp_phone_display)",
        )
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .order("nome");

      if (input?.canal_id) q = q.eq("canal_id", input.canal_id);

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  criarNoMeta: adminProcedure
    .input(criarInput)
    .mutation(async ({ ctx, input }) => {
      const { data: canal } = await ctx.supabase
        .from("canais_whatsapp")
        .select("id, whatsapp_business_account_id, access_token")
        .eq("id", input.canal_id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!canal) throw new TRPCError({ code: "NOT_FOUND", message: "Canal não encontrado" });

      // Monta components no formato Meta
      const components: Array<Record<string, unknown>> = [];

      if (input.header_text) {
        const h: Record<string, unknown> = {
          type: "HEADER",
          format: "TEXT",
          text: input.header_text,
        };
        if (input.exemplos_header?.length) {
          h.example = { header_text: input.exemplos_header };
        }
        components.push(h);
      }

      const body: Record<string, unknown> = {
        type: "BODY",
        text: input.body_text,
      };
      if (input.exemplos_body?.length) {
        body.example = { body_text: [input.exemplos_body] };
      }
      components.push(body);

      if (input.footer_text) {
        components.push({ type: "FOOTER", text: input.footer_text });
      }

      if (input.botoes?.length) {
        components.push({
          type: "BUTTONS",
          buttons: input.botoes.map((b) => {
            if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
            if (b.type === "PHONE_NUMBER")
              return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number };
            return { type: "QUICK_REPLY", text: b.text };
          }),
        });
      }

      const payload: NovoTemplate = {
        name: input.nome,
        language: input.idioma,
        category: input.categoria,
        components,
      };

      let resposta;
      try {
        resposta = await criarTemplateNaMeta(
          canal.access_token,
          canal.whatsapp_business_account_id,
          payload,
        );
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : String(err),
        });
      }

      // Salva local em modo PENDING
      const { data, error } = await ctx.supabase
        .from("templates_whatsapp")
        .insert({
          imobiliaria_id: ctx.profile.imobiliaria_id,
          canal_id: canal.id,
          meta_template_id: resposta.id,
          nome: input.nome,
          categoria: resposta.category ?? input.categoria,
          idioma: input.idioma,
          status: resposta.status,
          componentes: components,
          body_text: input.body_text,
          header_text: input.header_text ?? null,
          footer_text: input.footer_text ?? null,
        })
        .select()
        .single();

      if (error) {
        // Template foi criado na Meta mas falhou local — deve ser raro.
        // Melhor retornar erro visível ao admin pra ele re-sync depois.
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Template criado na Meta mas falhou ao salvar localmente: ${error.message}. Use "Sincronizar do Meta" pra recuperar.`,
        });
      }
      return data;
    }),

  deletar: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: template } = await ctx.supabase
        .from("templates_whatsapp")
        .select(
          "id, nome, canal:canais_whatsapp(whatsapp_business_account_id, access_token)",
        )
        .eq("id", input.id)
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .single();
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });

      const canalRaw = template.canal as unknown;
      const canal = (Array.isArray(canalRaw) ? canalRaw[0] : canalRaw) as
        | { whatsapp_business_account_id: string; access_token: string }
        | null;
      if (!canal) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      try {
        await deletarTemplateNaMeta(
          canal.access_token,
          canal.whatsapp_business_account_id,
          template.nome,
        );
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : String(err),
        });
      }

      await ctx.supabase.from("templates_whatsapp").delete().eq("id", input.id);
      return { ok: true };
    }),
});
