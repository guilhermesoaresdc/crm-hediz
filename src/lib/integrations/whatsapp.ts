import { createSupabaseServiceClient } from "@/lib/supabase/server";

type WhatsappConfig = {
  phone_number_id: string;
  access_token: string;
};

export class WhatsAppCloudAPI {
  constructor(private config: WhatsappConfig) {}

  private get baseUrl() {
    return `https://graph.facebook.com/v19.0/${this.config.phone_number_id}/messages`;
  }

  async sendTemplate(params: {
    to: string;
    templateName: string;
    languageCode?: string;
    variables?: string[];
  }) {
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to,
        type: "template",
        template: {
          name: params.templateName,
          language: { code: params.languageCode ?? "pt_BR" },
          components: params.variables
            ? [
                {
                  type: "body",
                  parameters: params.variables.map((v) => ({ type: "text", text: v })),
                },
              ]
            : [],
        },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ messages: { id: string }[] }>;
  }

  async sendText(params: { to: string; text: string }) {
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to,
        type: "text",
        text: { body: params.text },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ messages: { id: string }[] }>;
  }
}

export async function loadWhatsappConfigByPhoneId(phoneNumberId: string) {
  const svc = createSupabaseServiceClient();
  const { data } = await svc
    .from("configuracoes_imobiliaria")
    .select("imobiliaria_id, whatsapp_phone_number_id, whatsapp_access_token")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .single();
  return data;
}
