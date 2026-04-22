import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const periodo = z.object({
  inicio: z.string().optional(),
  fim: z.string().optional(),
});

function defaultPeriodo(p?: { inicio?: string; fim?: string }) {
  const fim = p?.fim ?? new Date().toISOString().slice(0, 10);
  const inicio =
    p?.inicio ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().slice(0, 10);
    })();
  return { inicio, fim };
}

export const dashboardRouter = createTRPCRouter({
  kpis: protectedProcedure.input(periodo.optional()).query(async ({ ctx, input }) => {
    const { inicio, fim } = defaultPeriodo(input);
    const scope = ctx.profile.imobiliaria_id;

    const [leadsRes, vendasRes, custosRes, bolsaoRes] = await Promise.all([
      ctx.supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("imobiliaria_id", scope)
        .gte("created_at", inicio)
        .lte("created_at", `${fim}T23:59:59`),
      ctx.supabase
        .from("vendas")
        .select("valor_venda")
        .eq("imobiliaria_id", scope)
        .gte("data_venda", inicio)
        .lte("data_venda", fim),
      ctx.supabase
        .from("custos")
        .select("valor, tipo")
        .eq("imobiliaria_id", scope)
        .gte("data", inicio)
        .lte("data", fim),
      ctx.supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("imobiliaria_id", scope)
        .eq("em_bolsao", true),
    ]);

    const totalVendas = vendasRes.data?.length ?? 0;
    const faturamento = (vendasRes.data ?? []).reduce((s, v) => s + Number(v.valor_venda ?? 0), 0);
    const custoMidia = (custosRes.data ?? [])
      .filter((c) => c.tipo === "meta_ads" || c.tipo === "google_ads")
      .reduce((s, c) => s + Number(c.valor ?? 0), 0);
    const feeAgencia = (custosRes.data ?? [])
      .filter((c) => c.tipo === "fee_agencia")
      .reduce((s, c) => s + Number(c.valor ?? 0), 0);
    const custoTotal = custoMidia + feeAgencia;

    return {
      periodo: { inicio, fim },
      leads: leadsRes.count ?? 0,
      vendas: totalVendas,
      faturamento,
      custo_midia: custoMidia,
      fee_agencia: feeAgencia,
      custo_total: custoTotal,
      roas_real: custoTotal > 0 ? Number((faturamento / custoTotal).toFixed(2)) : 0,
      cpl: leadsRes.count && leadsRes.count > 0 ? custoTotal / leadsRes.count : 0,
      custo_por_venda: totalVendas > 0 ? custoTotal / totalVendas : 0,
      leads_bolsao_agora: bolsaoRes.count ?? 0,
    };
  }),

  funil: protectedProcedure.input(periodo.optional()).query(async ({ ctx, input }) => {
    const { inicio, fim } = defaultPeriodo(input);
    const { data, error } = await ctx.supabase
      .from("leads")
      .select(
        "status, primeira_mensagem_em, primeira_resposta_em, visita_agendada_em, proposta_em, vendido_em",
      )
      .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
      .gte("created_at", inicio)
      .lte("created_at", `${fim}T23:59:59`);

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    const leads = data ?? [];

    return {
      total: leads.length,
      primeira_msg: leads.filter((l) => l.primeira_mensagem_em).length,
      respondeu: leads.filter((l) => l.primeira_resposta_em).length,
      visita_agendada: leads.filter((l) => l.visita_agendada_em).length,
      visita_realizada: leads.filter((l) =>
        ["visita_realizada", "proposta_enviada", "negociacao", "vendido"].includes(l.status),
      ).length,
      proposta: leads.filter((l) => l.proposta_em).length,
      vendido: leads.filter((l) => l.status === "vendido").length,
    };
  }),

  performanceCorretores: protectedProcedure
    .input(periodo.optional())
    .query(async ({ ctx, input }) => {
      const { inicio, fim } = defaultPeriodo(input);

      let usuariosQuery = ctx.supabase
        .from("usuarios")
        .select("id, nome, avatar_url, equipe_id")
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .eq("role", "corretor")
        .eq("ativo", true);

      if (ctx.profile.role === "gerente" && ctx.profile.equipe_id) {
        usuariosQuery = usuariosQuery.eq("equipe_id", ctx.profile.equipe_id);
      }

      const { data: corretores } = await usuariosQuery;
      if (!corretores) return [];

      const corretorIds = corretores.map((c) => c.id);
      if (corretorIds.length === 0) return [];

      const [leadsRes, vendasRes] = await Promise.all([
        ctx.supabase
          .from("leads")
          .select("id, corretor_id, status, atribuido_em, primeira_mensagem_em")
          .in("corretor_id", corretorIds)
          .gte("created_at", inicio)
          .lte("created_at", `${fim}T23:59:59`),
        ctx.supabase
          .from("vendas")
          .select("corretor_id, valor_venda")
          .in("corretor_id", corretorIds)
          .gte("data_venda", inicio)
          .lte("data_venda", fim),
      ]);

      return corretores.map((c) => {
        const leads = (leadsRes.data ?? []).filter((l) => l.corretor_id === c.id);
        const vendas = (vendasRes.data ?? []).filter((v) => v.corretor_id === c.id);
        const respondidosATempo = leads.filter((l) => {
          if (!l.atribuido_em || !l.primeira_mensagem_em) return false;
          const delta =
            new Date(l.primeira_mensagem_em).getTime() - new Date(l.atribuido_em).getTime();
          return delta <= 5 * 60 * 1000;
        }).length;
        const tempos = leads
          .filter((l) => l.atribuido_em && l.primeira_mensagem_em)
          .map(
            (l) =>
              (new Date(l.primeira_mensagem_em!).getTime() -
                new Date(l.atribuido_em!).getTime()) /
              1000,
          );
        const tempoMedio =
          tempos.length > 0 ? tempos.reduce((s, n) => s + n, 0) / tempos.length : 0;

        return {
          id: c.id,
          nome: c.nome,
          avatar_url: c.avatar_url,
          total_leads: leads.length,
          respondidos_a_tempo: respondidosATempo,
          total_vendas: vendas.length,
          faturamento: vendas.reduce((s, v) => s + Number(v.valor_venda ?? 0), 0),
          taxa_conversao:
            leads.length > 0 ? Number(((vendas.length / leads.length) * 100).toFixed(2)) : 0,
          tempo_medio_primeira_msg_seg: Math.round(tempoMedio),
        };
      });
    }),

  performanceCampanhas: protectedProcedure
    .input(periodo.optional())
    .query(async ({ ctx, input }) => {
      const { inicio, fim } = defaultPeriodo(input);
      const scope = ctx.profile.imobiliaria_id;

      const [leadsRes, vendasRes, custosRes, campanhasRes] = await Promise.all([
        ctx.supabase
          .from("leads")
          .select("id, campanha_id")
          .eq("imobiliaria_id", scope)
          .gte("created_at", inicio)
          .lte("created_at", `${fim}T23:59:59`),
        ctx.supabase
          .from("vendas")
          .select("lead_id, valor_venda, lead:leads(campanha_id)")
          .eq("imobiliaria_id", scope)
          .gte("data_venda", inicio)
          .lte("data_venda", fim),
        ctx.supabase
          .from("custos")
          .select("campanha_id, valor, tipo")
          .eq("imobiliaria_id", scope)
          .gte("data", inicio)
          .lte("data", fim),
        ctx.supabase.from("campanhas").select("id, nome, meta_campaign_id").eq("imobiliaria_id", scope),
      ]);

      const campanhas = campanhasRes.data ?? [];
      return campanhas.map((c) => {
        const leads = (leadsRes.data ?? []).filter((l) => l.campanha_id === c.id);
        const vendas = (vendasRes.data ?? []).filter((v) => {
          const leadRaw = v.lead as unknown;
          const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) as
            | { campanha_id?: string }
            | null
            | undefined;
          return lead?.campanha_id === c.id;
        });
        const gastos = (custosRes.data ?? []).filter((x) => x.campanha_id === c.id);
        const gastoMidia = gastos
          .filter((g) => g.tipo === "meta_ads" || g.tipo === "google_ads")
          .reduce((s, g) => s + Number(g.valor ?? 0), 0);
        const feeAgencia = gastos
          .filter((g) => g.tipo === "fee_agencia")
          .reduce((s, g) => s + Number(g.valor ?? 0), 0);
        const gastoTotal = gastoMidia + feeAgencia;
        const faturamento = vendas.reduce((s, v) => s + Number(v.valor_venda ?? 0), 0);

        return {
          id: c.id,
          nome: c.nome,
          meta_campaign_id: c.meta_campaign_id,
          leads: leads.length,
          vendas: vendas.length,
          faturamento,
          gasto_midia: gastoMidia,
          fee_agencia: feeAgencia,
          gasto_total: gastoTotal,
          cpl_real: leads.length > 0 ? Number((gastoTotal / leads.length).toFixed(2)) : null,
          custo_por_venda:
            vendas.length > 0 ? Number((gastoTotal / vendas.length).toFixed(2)) : null,
          roas_real:
            gastoTotal > 0 ? Number((faturamento / gastoTotal).toFixed(2)) : null,
        };
      });
    }),
});
