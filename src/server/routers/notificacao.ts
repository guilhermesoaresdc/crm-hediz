import { createTRPCRouter, protectedProcedure } from "../trpc";

export type Notificacao = {
  id: string;
  tipo: "bolsao_disponivel" | "lead_sem_resposta" | "lead_novo" | "venda_capi";
  titulo: string;
  subtitulo?: string;
  lead_id?: string;
  criado_em: string;
  urgencia: "baixa" | "media" | "alta";
};

export const notificacaoRouter = createTRPCRouter({
  lista: protectedProcedure.query(async ({ ctx }) => {
    const scope = ctx.profile.imobiliaria_id;
    const agora = new Date();

    const { data: config } = await ctx.supabase
      .from("configuracoes_imobiliaria")
      .select("bolsao_elegibilidade")
      .eq("imobiliaria_id", scope)
      .single();

    // Leads no bolsão elegíveis pra este user
    let bolsaoQ = ctx.supabase
      .from("leads")
      .select("id, nome, bolsao_expira_em, equipe_id, campanha:campanhas(nome)")
      .eq("imobiliaria_id", scope)
      .eq("em_bolsao", true)
      .gt("bolsao_expira_em", agora.toISOString())
      .order("bolsao_expira_em", { ascending: true })
      .limit(10);

    if (
      config?.bolsao_elegibilidade === "mesma_equipe" &&
      ctx.profile.role === "corretor" &&
      ctx.profile.equipe_id
    ) {
      bolsaoQ = bolsaoQ.eq("equipe_id", ctx.profile.equipe_id);
    }

    // Meus leads sem primeira mensagem
    const { data: leadsBolsao } = await bolsaoQ;
    const { data: meusSemResposta } = await ctx.supabase
      .from("leads")
      .select("id, nome, atribuido_em, campanha:campanhas(nome)")
      .eq("corretor_id", ctx.user.id)
      .is("primeira_mensagem_em", null)
      .not("atribuido_em", "is", null)
      .order("atribuido_em", { ascending: false })
      .limit(5);

    const notificacoes: Notificacao[] = [];

    for (const l of leadsBolsao ?? []) {
      const expira = l.bolsao_expira_em ? new Date(l.bolsao_expira_em) : null;
      const minutosRestantes = expira
        ? Math.max(0, Math.round((expira.getTime() - agora.getTime()) / 60000))
        : null;
      const campanhaNome = Array.isArray(l.campanha)
        ? (l.campanha[0] as { nome?: string } | undefined)?.nome
        : (l.campanha as { nome?: string } | null)?.nome;
      notificacoes.push({
        id: `bolsao-${l.id}`,
        tipo: "bolsao_disponivel",
        titulo: `Lead no bolsão: ${l.nome}`,
        subtitulo: minutosRestantes != null
          ? `Expira em ${minutosRestantes}min${campanhaNome ? ` · ${campanhaNome}` : ""}`
          : campanhaNome,
        lead_id: l.id,
        criado_em: agora.toISOString(),
        urgencia: minutosRestantes != null && minutosRestantes < 10 ? "alta" : "media",
      });
    }

    for (const l of meusSemResposta ?? []) {
      const atribuido = l.atribuido_em ? new Date(l.atribuido_em) : null;
      const minutosDesde = atribuido
        ? Math.round((agora.getTime() - atribuido.getTime()) / 60000)
        : 0;
      const urgencia: Notificacao["urgencia"] =
        minutosDesde >= 4 ? "alta" : minutosDesde >= 2 ? "media" : "baixa";
      notificacoes.push({
        id: `sem-resp-${l.id}`,
        tipo: "lead_sem_resposta",
        titulo: `Responder ${l.nome}`,
        subtitulo: `Atribuído há ${minutosDesde}min — envie primeira mensagem antes do bolsão`,
        lead_id: l.id,
        criado_em: l.atribuido_em ?? agora.toISOString(),
        urgencia,
      });
    }

    // Ordena por urgência
    const peso: Record<Notificacao["urgencia"], number> = { alta: 3, media: 2, baixa: 1 };
    notificacoes.sort((a, b) => peso[b.urgencia] - peso[a.urgencia]);

    return {
      total: notificacoes.length,
      urgentes: notificacoes.filter((n) => n.urgencia === "alta").length,
      notificacoes,
    };
  }),
});
