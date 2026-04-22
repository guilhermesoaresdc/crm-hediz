import { inngest } from "./client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { enviarCapiPurchase } from "@/lib/integrations/meta-capi";
import {
  sincronizarCampanhasImobiliaria,
  sincronizarCustosImobiliaria,
} from "@/lib/integrations/meta-graph";

/**
 * Disparada quando um lead é atribuído a um corretor.
 * Agenda verificação após bolsao_timeout_minutos. Se ainda não
 * houve primeira mensagem, move pro bolsão.
 */
export const verificarTimeoutBolsao = inngest.createFunction(
  { id: "verificar-timeout-bolsao", name: "Verificar timeout de primeira mensagem" },
  { event: "lead/atribuido" },
  async ({ event, step }) => {
    const { lead_id, corretor_id, imobiliaria_id, timeout_minutos } = event.data;

    // Dorme durante o timeout
    await step.sleep("aguardar-timeout", `${timeout_minutos}m`);

    // Valida se o estado ainda justifica o bolsão
    const result = await step.run("mover-se-necessario", async () => {
      const svc = createSupabaseServiceClient();

      const { data: lead } = await svc
        .from("leads")
        .select("id, corretor_id, primeira_mensagem_em")
        .eq("id", lead_id)
        .single();

      if (!lead) return { status: "lead_not_found" };
      if (lead.primeira_mensagem_em) return { status: "ja_respondeu" };
      if (lead.corretor_id !== corretor_id) return { status: "reatribuido" };

      const { data } = await svc.rpc("mover_para_bolsao", {
        p_lead_id: lead_id,
        p_timeout_minutos: 30,
      });

      return { status: "moved_to_bolsao", imobiliaria_id, moved: data };
    });

    return result;
  },
);

/**
 * Quando venda é registrada, garante que o Purchase CAPI foi enviado.
 * Retenta automaticamente em caso de falha (Inngest faz retry).
 */
export const reenviarCapiPurchase = inngest.createFunction(
  {
    id: "capi-purchase-retry",
    name: "Reenviar CAPI Purchase se falhou",
    retries: 3,
  },
  { event: "venda/registrada" },
  async ({ event }) => {
    const { venda_id, lead_id, imobiliaria_id } = event.data;

    // Checa se já foi enviado
    const svc = createSupabaseServiceClient();
    const { data: venda } = await svc
      .from("vendas")
      .select("enviado_capi")
      .eq("id", venda_id)
      .single();

    if (venda?.enviado_capi) return { status: "already_sent" };

    await enviarCapiPurchase({ imobiliariaId: imobiliaria_id, vendaId: venda_id, leadId: lead_id });
    return { status: "sent" };
  },
);

/**
 * Cron a cada 6h: sincroniza campanhas/conjuntos/anúncios de
 * todas as imobiliárias conectadas.
 */
export const syncCampanhasMetaDiario = inngest.createFunction(
  { id: "sync-campanhas-meta", name: "Sync Meta campanhas (6h)" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const imobiliarias = await step.run("listar-conectadas", async () => {
      const svc = createSupabaseServiceClient();
      const { data } = await svc
        .from("configuracoes_imobiliaria")
        .select("imobiliaria_id")
        .not("meta_access_token", "is", null);
      return data ?? [];
    });

    for (const imo of imobiliarias) {
      await step.run(`sync-${imo.imobiliaria_id}`, async () => {
        try {
          await sincronizarCampanhasImobiliaria(imo.imobiliaria_id);
        } catch (err) {
          console.error(`[sync campanhas ${imo.imobiliaria_id}]`, err);
        }
      });
    }
    return { processadas: imobiliarias.length };
  },
);

/**
 * Cron diário 03:00 UTC: sincroniza custos + insights dos últimos 7 dias.
 */
export const syncCustosMetaDiario = inngest.createFunction(
  { id: "sync-custos-meta", name: "Sync Meta custos (diário)" },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const imobiliarias = await step.run("listar-conectadas", async () => {
      const svc = createSupabaseServiceClient();
      const { data } = await svc
        .from("configuracoes_imobiliaria")
        .select("imobiliaria_id")
        .not("meta_access_token", "is", null);
      return data ?? [];
    });

    for (const imo of imobiliarias) {
      await step.run(`sync-custos-${imo.imobiliaria_id}`, async () => {
        try {
          await sincronizarCustosImobiliaria(imo.imobiliaria_id, 7);
        } catch (err) {
          console.error(`[sync custos ${imo.imobiliaria_id}]`, err);
        }
      });
    }
    return { processadas: imobiliarias.length };
  },
);

/**
 * Evento on-demand disparado pela UI (botão "Sincronizar agora").
 */
export const syncMetaOnDemand = inngest.createFunction(
  { id: "sync-meta-on-demand", name: "Sync Meta (manual)", retries: 1 },
  { event: "meta/sincronizar" },
  async ({ event, step }) => {
    const { imobiliaria_id, tipo } = event.data;

    if (tipo === "campanhas" || tipo === "ambos") {
      await step.run("sync-campanhas", () =>
        sincronizarCampanhasImobiliaria(imobiliaria_id),
      );
    }

    if (tipo === "custos" || tipo === "ambos") {
      await step.run("sync-custos", () => sincronizarCustosImobiliaria(imobiliaria_id, 7));
    }

    return { ok: true };
  },
);

export const functions = [
  verificarTimeoutBolsao,
  reenviarCapiPurchase,
  syncCampanhasMetaDiario,
  syncCustosMetaDiario,
  syncMetaOnDemand,
];
