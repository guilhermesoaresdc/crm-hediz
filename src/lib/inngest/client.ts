import { Inngest, EventSchemas } from "inngest";

type Events = {
  "lead/atribuido": {
    data: {
      lead_id: string;
      corretor_id: string;
      imobiliaria_id: string;
      timeout_minutos: number;
    };
  };
  "venda/registrada": {
    data: { venda_id: string; lead_id: string; imobiliaria_id: string };
  };
};

export const inngest = new Inngest({
  id: "crm-hediz",
  schemas: new EventSchemas().fromRecord<Events>(),
  eventKey: process.env.INNGEST_EVENT_KEY,
});

/**
 * Envia evento sem quebrar se Inngest não estiver configurado.
 * Útil em dev e enquanto o produto não tem a conta Inngest ativa.
 */
export async function sendInngestEvent<K extends keyof Events>(
  name: K,
  data: Events[K]["data"],
): Promise<void> {
  if (!process.env.INNGEST_EVENT_KEY) {
    console.log(`[inngest:noop] ${String(name)}`, data);
    return;
  }
  try {
    // Cast necessário porque o TS não consegue estreitar a discriminated union
    // com generic K — o send quer literal exato.
    await inngest.send({ name, data } as Parameters<typeof inngest.send>[0]);
  } catch (err) {
    console.error(`[inngest] falha ao enviar ${String(name)}:`, err);
  }
}
