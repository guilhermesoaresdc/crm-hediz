import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { enviarCapiPurchase } from "@/lib/integrations/meta-capi";

export const vendaRouter = createTRPCRouter({
  registrar: protectedProcedure
    .input(
      z.object({
        lead_id: z.string().uuid(),
        valor_venda: z.number().positive(),
        valor_comissao: z.number().optional(),
        imovel_descricao: z.string().optional(),
        endereco: z.string().optional(),
        data_venda: z.string(),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: lead, error: leadErr } = await ctx.supabase
        .from("leads")
        .select("*")
        .eq("id", input.lead_id)
        .single();
      if (leadErr || !lead) throw new TRPCError({ code: "NOT_FOUND" });
      if (!lead.corretor_id) throw new TRPCError({ code: "BAD_REQUEST", message: "Lead sem corretor" });

      const capiEventId = crypto.randomUUID();

      const { data: venda, error } = await ctx.supabase
        .from("vendas")
        .insert({
          imobiliaria_id: ctx.profile.imobiliaria_id,
          lead_id: input.lead_id,
          corretor_id: lead.corretor_id,
          valor_venda: input.valor_venda,
          valor_comissao: input.valor_comissao,
          imovel_descricao: input.imovel_descricao,
          endereco: input.endereco,
          data_venda: input.data_venda,
          observacoes: input.observacoes,
          capi_event_id: capiEventId,
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      // Atualiza lead
      await ctx.supabase
        .from("leads")
        .update({ status: "vendido", vendido_em: new Date().toISOString() })
        .eq("id", input.lead_id);

      await ctx.supabase.from("lead_eventos").insert({
        lead_id: input.lead_id,
        imobiliaria_id: ctx.profile.imobiliaria_id,
        tipo: "venda",
        usuario_id: ctx.user.id,
        payload: { venda_id: venda.id, valor: input.valor_venda },
      });

      // Dispara CAPI (não bloqueia resposta)
      enviarCapiPurchase({
        imobiliariaId: ctx.profile.imobiliaria_id,
        vendaId: venda.id,
        leadId: input.lead_id,
      }).catch((err) => {
        console.error("[CAPI Purchase] falhou, será retentado:", err);
      });

      return venda;
    }),

  listar: protectedProcedure
    .input(
      z
        .object({
          inicio: z.string().optional(),
          fim: z.string().optional(),
          corretor_id: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from("vendas")
        .select(
          "*, lead:leads(id, nome), corretor:usuarios!vendas_corretor_id_fkey(id, nome)",
        )
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .order("data_venda", { ascending: false });

      if (input?.inicio) q = q.gte("data_venda", input.inicio);
      if (input?.fim) q = q.lte("data_venda", input.fim);
      if (input?.corretor_id) q = q.eq("corretor_id", input.corretor_id);

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),
});
