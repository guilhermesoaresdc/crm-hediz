import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sha256 } from "@/lib/utils";

type CapiUserData = {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
};

type CapiEventInput = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source?: "website" | "email" | "chat" | "phone_call" | "system_generated" | "other";
  event_source_url?: string;
  user_data: CapiUserData;
  custom_data?: Record<string, unknown>;
  attribution_data?: { ad_id?: string; campaign_id?: string };
};

export class MetaConversionAPI {
  constructor(
    private pixelId: string,
    private accessToken: string,
    private testEventCode?: string,
  ) {}

  async sendEvent(event: CapiEventInput) {
    const url = `https://graph.facebook.com/v19.0/${this.pixelId}/events`;
    const body: Record<string, unknown> = {
      data: [
        {
          event_name: event.event_name,
          event_time: event.event_time,
          event_id: event.event_id,
          action_source: event.action_source ?? "website",
          event_source_url: event.event_source_url,
          user_data: event.user_data,
          custom_data: event.custom_data,
          attribution_data: event.attribution_data,
        },
      ],
      access_token: this.accessToken,
    };
    if (this.testEventCode) body.test_event_code = this.testEventCode;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Meta CAPI error ${res.status}: ${text}`);
    }
    return res.json();
  }
}

/**
 * Envia Purchase event ao fechar uma venda.
 * event_time DELIBERADAMENTE usa o created_at do lead original,
 * para que o Meta atribua corretamente à campanha que gerou aquele lead.
 */
export async function enviarCapiPurchase(params: {
  imobiliariaId: string;
  vendaId: string;
  leadId: string;
}) {
  const svc = createSupabaseServiceClient();

  const { data: config } = await svc
    .from("configuracoes_imobiliaria")
    .select("meta_pixel_id, meta_capi_token")
    .eq("imobiliaria_id", params.imobiliariaId)
    .single();

  if (!config?.meta_pixel_id || !config?.meta_capi_token) {
    console.warn("[CAPI] Pixel/token não configurados, pulando envio");
    return;
  }

  const { data: venda } = await svc
    .from("vendas")
    .select(
      "id, valor_venda, imovel_descricao, capi_event_id, created_at, lead:leads(id, nome, email, whatsapp, fbp, fbc, created_at, anuncio:anuncios(meta_ad_id), campanha:campanhas(meta_campaign_id))",
    )
    .eq("id", params.vendaId)
    .single();

  if (!venda) throw new Error("Venda não encontrada");

  const lead = Array.isArray(venda.lead) ? venda.lead[0] : venda.lead;
  if (!lead) throw new Error("Lead associado não encontrado");

  const anuncio = Array.isArray(lead.anuncio) ? lead.anuncio[0] : lead.anuncio;
  const campanha = Array.isArray(lead.campanha) ? lead.campanha[0] : lead.campanha;

  const [firstName, ...rest] = (lead.nome ?? "").trim().split(" ");
  const lastName = rest.pop() ?? "";

  const capi = new MetaConversionAPI(
    config.meta_pixel_id,
    config.meta_capi_token,
    process.env.NODE_ENV === "development" ? "TEST1234" : undefined,
  );

  await capi.sendEvent({
    event_name: "Purchase",
    // CRÍTICO: usa created_at do LEAD, não o momento atual
    event_time: Math.floor(new Date(lead.created_at).getTime() / 1000),
    event_id: venda.capi_event_id ?? venda.id,
    action_source: "system_generated",
    user_data: {
      em: lead.email ? await sha256(lead.email.toLowerCase().trim()) : undefined,
      ph: lead.whatsapp ? await sha256(lead.whatsapp.replace(/\D/g, "")) : undefined,
      fn: firstName ? await sha256(firstName.toLowerCase()) : undefined,
      ln: lastName ? await sha256(lastName.toLowerCase()) : undefined,
      fbp: lead.fbp ?? undefined,
      fbc: lead.fbc ?? undefined,
    },
    custom_data: {
      value: Number(venda.valor_venda),
      currency: "BRL",
      content_type: "product",
      content_name: venda.imovel_descricao ?? "Imóvel",
    },
    attribution_data: {
      ad_id: anuncio?.meta_ad_id ?? undefined,
      campaign_id: campanha?.meta_campaign_id ?? undefined,
    },
  });

  await svc
    .from("vendas")
    .update({ enviado_capi: true, enviado_capi_em: new Date().toISOString() })
    .eq("id", params.vendaId);
}

export async function enviarCapiLead(params: {
  imobiliariaId: string;
  leadId: string;
  eventSourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
}) {
  const svc = createSupabaseServiceClient();

  const { data: config } = await svc
    .from("configuracoes_imobiliaria")
    .select("meta_pixel_id, meta_capi_token")
    .eq("imobiliaria_id", params.imobiliariaId)
    .single();
  if (!config?.meta_pixel_id || !config?.meta_capi_token) return;

  const { data: lead } = await svc
    .from("leads")
    .select("id, nome, email, whatsapp, fbp, fbc, created_at")
    .eq("id", params.leadId)
    .single();
  if (!lead) return;

  const capi = new MetaConversionAPI(config.meta_pixel_id, config.meta_capi_token);
  await capi.sendEvent({
    event_name: "Lead",
    event_time: Math.floor(new Date(lead.created_at).getTime() / 1000),
    event_id: lead.id,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: {
      em: lead.email ? await sha256(lead.email.toLowerCase().trim()) : undefined,
      ph: lead.whatsapp ? await sha256(lead.whatsapp.replace(/\D/g, "")) : undefined,
      fbp: lead.fbp ?? undefined,
      fbc: lead.fbc ?? undefined,
      client_ip_address: params.clientIp,
      client_user_agent: params.userAgent,
    },
    custom_data: { content_name: "Lead", value: 0, currency: "BRL" },
  });
}
