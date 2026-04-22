import { inngest } from "./client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { enviarCapiPurchase } from "@/lib/integrations/meta-capi";

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

export const functions = [verificarTimeoutBolsao, reenviarCapiPurchase];
