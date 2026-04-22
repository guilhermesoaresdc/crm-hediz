import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchLeadgenById } from "@/lib/integrations/meta-graph";
import { sanitizePhone } from "@/lib/utils";

// GET: verificação do webhook (Meta envia hub.challenge)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? "OK", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST: novo lead recebido
export async function POST(req: Request) {
  const rawBody = await req.text();

  // Validação de assinatura (Meta envia X-Hub-Signature-256)
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret && signature) {
    const expected =
      "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (expected !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody);
  const svc = createSupabaseServiceClient();

  // Registra log bruto pra auditoria
  await svc.from("webhook_logs").insert({ source: "meta_lead", payload_raw: payload });

  try {
    for (const entry of payload.entry ?? []) {
      const pageId = entry.id;
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;
        const leadgenId = change.value.leadgen_id;
        const adId = change.value.ad_id;

        // Busca imobiliária pelo page_id
        const { data: config } = await svc
          .from("configuracoes_imobiliaria")
          .select("imobiliaria_id, meta_access_token")
          .eq("meta_page_id", pageId)
          .single();
        if (!config?.meta_access_token) continue;

        // Busca dados completos do lead
        const leadData = await fetchLeadgenById(leadgenId, config.meta_access_token);

        const field = (name: string) =>
          leadData.field_data.find((f) => f.name === name)?.values?.[0];

        // Resolve anúncio no banco
        const { data: anuncio } = await svc
          .from("anuncios")
          .select("id, conjunto_id, conjunto:conjuntos_anuncios(id, campanha_id)")
          .eq("imobiliaria_id", config.imobiliaria_id)
          .eq("meta_ad_id", adId ?? leadData.ad_id)
          .maybeSingle();

        const conjunto = Array.isArray(anuncio?.conjunto)
          ? anuncio?.conjunto[0]
          : (anuncio?.conjunto as { id?: string; campanha_id?: string } | null);

        const { data: lead, error } = await svc
          .from("leads")
          .insert({
            imobiliaria_id: config.imobiliaria_id,
            nome: field("full_name") ?? field("name") ?? "Lead sem nome",
            whatsapp: sanitizePhone(field("phone_number") ?? ""),
            email: field("email"),
            meta_lead_id: leadgenId,
            anuncio_id: anuncio?.id,
            conjunto_id: anuncio?.conjunto_id ?? null,
            campanha_id: conjunto?.campanha_id ?? null,
            origem: "meta_form",
            respostas: leadData.field_data.reduce<Record<string, string>>((acc, f) => {
              acc[f.name] = f.values?.[0] ?? "";
              return acc;
            }, {}),
          })
          .select()
          .single();

        if (error) throw error;

        // Dispara roleta
        await svc.rpc("distribuir_lead_round_robin", {
          p_lead_id: lead.id,
          p_imobiliaria_id: config.imobiliaria_id,
          p_equipe_id: null,
        });

        // Marca webhook como processado (via coluna processado do log acima —
        // versão simplificada; em produção atualizar pelo id)
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Meta Lead Webhook]", msg);
    await svc.from("webhook_logs").insert({
      source: "meta_lead",
      payload_raw: payload,
      erro: msg,
    });
    // Meta retry se responder != 200, então devolvemos 200 e logamos
    return NextResponse.json({ ok: false, error: msg });
  }
}
