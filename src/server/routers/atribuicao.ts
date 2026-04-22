import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const periodoPreset = z.enum(["7d", "15d", "30d", "90d", "6m", "custom"]);

const inputSchema = z
  .object({
    preset: periodoPreset.default("7d"),
    inicio: z.string().optional(),
    fim: z.string().optional(),
    equipe_ids: z.array(z.string().uuid()).optional(),
    tipo: z.enum(["todos", "formulario", "site", "importado"]).default("todos"),
  })
  .optional();

function resolvePeriodo(input?: { preset?: string; inicio?: string; fim?: string }) {
  const fim = new Date();
  const inicio = new Date();
  switch (input?.preset) {
    case "7d":
      inicio.setDate(fim.getDate() - 7);
      break;
    case "15d":
      inicio.setDate(fim.getDate() - 15);
      break;
    case "30d":
      inicio.setDate(fim.getDate() - 30);
      break;
    case "90d":
      inicio.setDate(fim.getDate() - 90);
      break;
    case "6m":
      inicio.setMonth(fim.getMonth() - 6);
      break;
    case "custom":
      if (input.inicio) inicio.setTime(new Date(input.inicio).getTime());
      if (input.fim) fim.setTime(new Date(input.fim).getTime());
      break;
    default:
      inicio.setDate(fim.getDate() - 7);
  }
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  };
}

type Aggregates = {
  leads: number;
  visitas: number;
  arquivados: number;
  vendas: number;
  faturamento: number;
  gasto_midia: number;
  fee_agencia: number;
  alcance: number;
  impressoes: number;
};

function novoAgg(): Aggregates {
  return {
    leads: 0,
    visitas: 0,
    arquivados: 0,
    vendas: 0,
    faturamento: 0,
    gasto_midia: 0,
    fee_agencia: 0,
    alcance: 0,
    impressoes: 0,
  };
}

function calcularDerivados(a: Aggregates) {
  const gastoTotal = a.gasto_midia + a.fee_agencia;
  return {
    ...a,
    gasto_total: gastoTotal,
    taxa_conversao: a.leads > 0 ? (a.visitas / a.leads) * 100 : 0,
    custo_por_lead: a.leads > 0 ? gastoTotal / a.leads : 0,
    custo_por_venda: a.vendas > 0 ? gastoTotal / a.vendas : 0,
    roas_real: gastoTotal > 0 ? a.faturamento / gastoTotal : 0,
  };
}

export const atribuicaoRouter = createTRPCRouter({
  /**
   * Retorna hierarquia campanha → conjunto → anúncio com agregados
   * calculados sobre leads, vendas, custos do período.
   */
  hierarquia: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    const { inicio, fim } = resolvePeriodo(input);
    const scope = ctx.profile.imobiliaria_id;

    // Gerente só vê a própria equipe
    let equipeFilter = input?.equipe_ids;
    if (ctx.profile.role === "gerente" && ctx.profile.equipe_id) {
      equipeFilter = [ctx.profile.equipe_id];
    }

    const [
      { data: campanhas },
      { data: conjuntos },
      { data: anuncios },
      { data: leads },
      { data: custos },
    ] = await Promise.all([
      ctx.supabase
        .from("campanhas")
        .select("id, nome, meta_campaign_id, status")
        .eq("imobiliaria_id", scope),
      ctx.supabase
        .from("conjuntos_anuncios")
        .select("id, nome, campanha_id, status")
        .eq("imobiliaria_id", scope),
      ctx.supabase
        .from("anuncios")
        .select("id, nome, conjunto_id, status, thumbnail_url")
        .eq("imobiliaria_id", scope),
      ctx.supabase
        .from("leads")
        .select("id, campanha_id, conjunto_id, anuncio_id, equipe_id, status, visita_agendada_em, origem, created_at")
        .eq("imobiliaria_id", scope)
        .gte("created_at", inicio)
        .lte("created_at", `${fim}T23:59:59`),
      ctx.supabase
        .from("custos")
        .select("campanha_id, conjunto_id, anuncio_id, valor, tipo, alcance, impressoes, clicks")
        .eq("imobiliaria_id", scope)
        .gte("data", inicio)
        .lte("data", fim),
    ]);

    // Fetch vendas separado com relação pra campanha via lead
    const { data: vendas } = await ctx.supabase
      .from("vendas")
      .select("valor_venda, lead:leads(campanha_id, conjunto_id, anuncio_id, equipe_id)")
      .eq("imobiliaria_id", scope)
      .gte("data_venda", inicio)
      .lte("data_venda", fim);

    if (!campanhas) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Filtro tipo de origem
    const leadsFiltrados = (leads ?? []).filter((l) => {
      if (equipeFilter && equipeFilter.length > 0 && !equipeFilter.includes(l.equipe_id ?? "")) {
        return false;
      }
      if (input?.tipo && input.tipo !== "todos") {
        const match: Record<string, (o: string | null) => boolean> = {
          formulario: (o) => o === "meta_form",
          site: (o) => o === "meta_site",
          importado: (o) => o === "importado",
        };
        if (!match[input.tipo](l.origem)) return false;
      }
      return true;
    });

    // Agregações por ID
    const aggCampanha = new Map<string, Aggregates>();
    const aggConjunto = new Map<string, Aggregates>();
    const aggAnuncio = new Map<string, Aggregates>();

    const bumpLead = (agg: Aggregates, l: (typeof leadsFiltrados)[number]) => {
      agg.leads += 1;
      if (l.visita_agendada_em) agg.visitas += 1;
      if (l.status === "perdido" || l.status === "descartado") agg.arquivados += 1;
    };

    for (const l of leadsFiltrados) {
      if (l.campanha_id) {
        const agg = aggCampanha.get(l.campanha_id) ?? novoAgg();
        bumpLead(agg, l);
        aggCampanha.set(l.campanha_id, agg);
      }
      if (l.conjunto_id) {
        const agg = aggConjunto.get(l.conjunto_id) ?? novoAgg();
        bumpLead(agg, l);
        aggConjunto.set(l.conjunto_id, agg);
      }
      if (l.anuncio_id) {
        const agg = aggAnuncio.get(l.anuncio_id) ?? novoAgg();
        bumpLead(agg, l);
        aggAnuncio.set(l.anuncio_id, agg);
      }
    }

    for (const v of vendas ?? []) {
      const leadRaw = v.lead as unknown;
      const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) as
        | {
            campanha_id?: string | null;
            conjunto_id?: string | null;
            anuncio_id?: string | null;
            equipe_id?: string | null;
          }
        | null;
      if (!lead) continue;
      if (equipeFilter && equipeFilter.length > 0 && !equipeFilter.includes(lead.equipe_id ?? "")) {
        continue;
      }
      const valor = Number(v.valor_venda ?? 0);
      if (lead.campanha_id) {
        const agg = aggCampanha.get(lead.campanha_id) ?? novoAgg();
        agg.vendas += 1;
        agg.faturamento += valor;
        aggCampanha.set(lead.campanha_id, agg);
      }
      if (lead.conjunto_id) {
        const agg = aggConjunto.get(lead.conjunto_id) ?? novoAgg();
        agg.vendas += 1;
        agg.faturamento += valor;
        aggConjunto.set(lead.conjunto_id, agg);
      }
      if (lead.anuncio_id) {
        const agg = aggAnuncio.get(lead.anuncio_id) ?? novoAgg();
        agg.vendas += 1;
        agg.faturamento += valor;
        aggAnuncio.set(lead.anuncio_id, agg);
      }
    }

    for (const c of custos ?? []) {
      const tipo = c.tipo;
      const valor = Number(c.valor ?? 0);
      const alcance = Number(c.alcance ?? 0);
      const impressoes = Number(c.impressoes ?? 0);
      const ids = [
        { id: c.campanha_id, map: aggCampanha },
        { id: c.conjunto_id, map: aggConjunto },
        { id: c.anuncio_id, map: aggAnuncio },
      ];
      for (const { id, map } of ids) {
        if (!id) continue;
        const agg = map.get(id) ?? novoAgg();
        if (tipo === "meta_ads" || tipo === "google_ads") agg.gasto_midia += valor;
        else if (tipo === "fee_agencia") agg.fee_agencia += valor;
        // Alcance/impressões só fazem sentido pra o último nível (anúncio)
        // mas somamos em todos os níveis pro drill-down agregado
        if (c.anuncio_id === id || c.conjunto_id === id || c.campanha_id === id) {
          agg.alcance += alcance;
          agg.impressoes += impressoes;
        }
        map.set(id, agg);
      }
    }

    // Monta árvore
    const tree = campanhas.map((c) => {
      const campanhaAgg = aggCampanha.get(c.id) ?? novoAgg();
      const conjuntosDela = (conjuntos ?? []).filter((cj) => cj.campanha_id === c.id);

      const filhosConjuntos = conjuntosDela.map((cj) => {
        const cjAgg = aggConjunto.get(cj.id) ?? novoAgg();
        const anunciosDoConjunto = (anuncios ?? []).filter((ad) => ad.conjunto_id === cj.id);

        const filhosAnuncios = anunciosDoConjunto.map((ad) => ({
          tipo: "anuncio" as const,
          id: ad.id,
          nome: ad.nome,
          status: ad.status,
          thumbnail_url: ad.thumbnail_url,
          metricas: calcularDerivados(aggAnuncio.get(ad.id) ?? novoAgg()),
        }));

        return {
          tipo: "conjunto" as const,
          id: cj.id,
          nome: cj.nome,
          status: cj.status,
          metricas: calcularDerivados(cjAgg),
          filhos: filhosAnuncios,
        };
      });

      return {
        tipo: "campanha" as const,
        id: c.id,
        nome: c.nome,
        status: c.status,
        meta_campaign_id: c.meta_campaign_id,
        metricas: calcularDerivados(campanhaAgg),
        filhos: filhosConjuntos,
      };
    });

    // KPIs globais
    const total = novoAgg();
    for (const l of leadsFiltrados) {
      total.leads += 1;
      if (l.visita_agendada_em) total.visitas += 1;
      if (l.status === "perdido" || l.status === "descartado") total.arquivados += 1;
    }
    for (const v of vendas ?? []) {
      const leadRaw = v.lead as unknown;
      const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) as
        | { equipe_id?: string | null }
        | null;
      if (equipeFilter && equipeFilter.length > 0 && !equipeFilter.includes(lead?.equipe_id ?? "")) {
        continue;
      }
      total.vendas += 1;
      total.faturamento += Number(v.valor_venda ?? 0);
    }
    for (const c of custos ?? []) {
      const valor = Number(c.valor ?? 0);
      if (c.tipo === "meta_ads" || c.tipo === "google_ads") total.gasto_midia += valor;
      else if (c.tipo === "fee_agencia") total.fee_agencia += valor;
      total.alcance += Number(c.alcance ?? 0);
      total.impressoes += Number(c.impressoes ?? 0);
    }

    const campanhasAtivas = campanhas.filter((c) => c.status === "ACTIVE").length;

    return {
      periodo: { inicio, fim },
      kpis: {
        ...calcularDerivados(total),
        campanhas_ativas: campanhasAtivas,
      },
      hierarquia: tree.filter((c) => c.metricas.leads > 0 || c.metricas.gasto_total > 0 || c.status === "ACTIVE"),
    };
  }),
});
