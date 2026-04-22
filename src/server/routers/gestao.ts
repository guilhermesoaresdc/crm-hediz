import { z } from "zod";
import { createTRPCRouter, managerProcedure } from "../trpc";

const periodoPreset = z.enum(["7d", "15d", "30d", "90d", "6m", "custom"]);

const inputSchema = z
  .object({
    preset: periodoPreset.default("30d"),
    inicio: z.string().optional(),
    fim: z.string().optional(),
    equipe_ids: z.array(z.string().uuid()).optional(),
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
      inicio.setDate(fim.getDate() - 30);
  }
  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  };
}

export const gestaoRouter = createTRPCRouter({
  resumo: managerProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    const { inicio, fim } = resolvePeriodo(input);
    const scope = ctx.profile.imobiliaria_id;

    let equipeFilter = input?.equipe_ids;
    if (ctx.profile.role === "gerente" && ctx.profile.equipe_id) {
      equipeFilter = [ctx.profile.equipe_id];
    }

    // Fetch tudo em paralelo
    let corretoresQ = ctx.supabase
      .from("usuarios")
      .select("id, nome, avatar_url, equipe_id")
      .eq("imobiliaria_id", scope)
      .eq("role", "corretor")
      .eq("ativo", true);
    if (equipeFilter && equipeFilter.length > 0) {
      corretoresQ = corretoresQ.in("equipe_id", equipeFilter);
    }

    const [{ data: corretores }, { data: leads }, { data: campanhas }] = await Promise.all([
      corretoresQ,
      ctx.supabase
        .from("leads")
        .select(
          "id, corretor_id, equipe_id, campanha_id, status, atribuido_em, primeira_mensagem_em, visita_agendada_em, proposta_em, created_at, campanha:campanhas(id, nome)",
        )
        .eq("imobiliaria_id", scope)
        .gte("created_at", inicio)
        .lte("created_at", fim),
      ctx.supabase.from("campanhas").select("id, nome").eq("imobiliaria_id", scope),
    ]);

    const leadsFiltrados = (leads ?? []).filter((l) => {
      if (equipeFilter && equipeFilter.length > 0 && !equipeFilter.includes(l.equipe_id ?? "")) {
        return false;
      }
      return true;
    });

    const totalLeads = leadsFiltrados.length;
    const emAtendimento = leadsFiltrados.filter((l) =>
      ["em_atendimento", "qualificado", "visita_agendada", "visita_realizada", "proposta_enviada", "negociacao", "vendido"].includes(l.status),
    ).length;
    const visitaAgendada = leadsFiltrados.filter((l) => l.visita_agendada_em).length;
    const visitaRealizada = leadsFiltrados.filter((l) =>
      ["visita_realizada", "proposta_enviada", "negociacao", "vendido"].includes(l.status),
    ).length;
    const proposta = leadsFiltrados.filter((l) => l.proposta_em).length;
    const vendidos = leadsFiltrados.filter((l) => l.status === "vendido").length;

    // Sem resposta por corretor (atribuído mas sem primeira_mensagem_em)
    const semRespostaPorCorretor = new Map<string, number>();
    for (const l of leadsFiltrados) {
      if (!l.corretor_id) continue;
      if (l.primeira_mensagem_em) continue;
      semRespostaPorCorretor.set(
        l.corretor_id,
        (semRespostaPorCorretor.get(l.corretor_id) ?? 0) + 1,
      );
    }
    const corretoresSemResposta = (corretores ?? [])
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        avatar_url: c.avatar_url,
        leads_sem_resposta: semRespostaPorCorretor.get(c.id) ?? 0,
      }))
      .filter((c) => c.leads_sem_resposta > 0)
      .sort((a, b) => b.leads_sem_resposta - a.leads_sem_resposta)
      .slice(0, 10);

    // Tempo médio de resposta por corretor (seg)
    const temposPorCorretor = new Map<string, number[]>();
    for (const l of leadsFiltrados) {
      if (!l.corretor_id || !l.atribuido_em || !l.primeira_mensagem_em) continue;
      const segundos =
        (new Date(l.primeira_mensagem_em).getTime() - new Date(l.atribuido_em).getTime()) / 1000;
      if (segundos < 0) continue;
      const arr = temposPorCorretor.get(l.corretor_id) ?? [];
      arr.push(segundos);
      temposPorCorretor.set(l.corretor_id, arr);
    }
    const corretoresRespostaRapida = (corretores ?? [])
      .map((c) => {
        const tempos = temposPorCorretor.get(c.id) ?? [];
        const media = tempos.length > 0 ? tempos.reduce((s, x) => s + x, 0) / tempos.length : null;
        return {
          id: c.id,
          nome: c.nome,
          avatar_url: c.avatar_url,
          leads_respondidos: tempos.length,
          tempo_medio_seg: media,
        };
      })
      .filter((c) => c.leads_respondidos > 0 && c.tempo_medio_seg != null)
      .sort((a, b) => (a.tempo_medio_seg ?? Infinity) - (b.tempo_medio_seg ?? Infinity))
      .slice(0, 10);

    // Campanhas com mais leads
    const campanhaCount = new Map<string, number>();
    for (const l of leadsFiltrados) {
      if (!l.campanha_id) continue;
      campanhaCount.set(l.campanha_id, (campanhaCount.get(l.campanha_id) ?? 0) + 1);
    }
    const campanhasMaisLeads = (campanhas ?? [])
      .map((c) => ({ id: c.id, nome: c.nome, total_leads: campanhaCount.get(c.id) ?? 0 }))
      .filter((c) => c.total_leads > 0)
      .sort((a, b) => b.total_leads - a.total_leads)
      .slice(0, 10);

    // Tempo médio global de resposta
    const todosTempos: number[] = [];
    for (const arr of temposPorCorretor.values()) todosTempos.push(...arr);
    const tempoMedioGlobalSeg =
      todosTempos.length > 0 ? todosTempos.reduce((s, x) => s + x, 0) / todosTempos.length : null;

    return {
      periodo: { inicio, fim },
      kpis: {
        total_leads: totalLeads,
        em_atendimento: emAtendimento,
        visita_agendada: visitaAgendada,
        visita_realizada: visitaRealizada,
        proposta,
        vendidos,
        taxa_resposta:
          totalLeads > 0
            ? (leadsFiltrados.filter((l) => l.primeira_mensagem_em).length / totalLeads) * 100
            : 0,
        tempo_medio_resposta_seg: tempoMedioGlobalSeg,
      },
      corretores_sem_resposta: corretoresSemResposta,
      corretores_resposta_rapida: corretoresRespostaRapida,
      campanhas_mais_leads: campanhasMaisLeads,
      funil: [
        { label: "Recebidos", count: totalLeads, pct: 100 },
        {
          label: "Em atendimento",
          count: emAtendimento,
          pct: totalLeads > 0 ? (emAtendimento / totalLeads) * 100 : 0,
        },
        {
          label: "Visita agendada",
          count: visitaAgendada,
          pct: totalLeads > 0 ? (visitaAgendada / totalLeads) * 100 : 0,
        },
        {
          label: "Visita realizada",
          count: visitaRealizada,
          pct: totalLeads > 0 ? (visitaRealizada / totalLeads) * 100 : 0,
        },
        {
          label: "Proposta criada",
          count: proposta,
          pct: totalLeads > 0 ? (proposta / totalLeads) * 100 : 0,
        },
        {
          label: "Vendidos",
          count: vendidos,
          pct: totalLeads > 0 ? (vendidos / totalLeads) * 100 : 0,
        },
      ],
    };
  }),
});
