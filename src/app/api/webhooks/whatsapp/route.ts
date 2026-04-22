import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "OK", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret && signature) {
    const expected =
      "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (expected !== signature) return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const svc = createSupabaseServiceClient();
  await svc.from("webhook_logs").insert({ source: "whatsapp", payload_raw: payload });

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const { data: config } = await svc
          .from("configuracoes_imobiliaria")
          .select("imobiliaria_id")
          .eq("whatsapp_phone_number_id", phoneNumberId)
          .single();
        if (!config) continue;

        // Mensagens recebidas
        for (const msg of value.messages ?? []) {
          const from = msg.from;
          const { data: lead } = await svc
            .from("leads")
            .select("id, corretor_id, primeira_resposta_em")
            .eq("imobiliaria_id", config.imobiliaria_id)
            .eq("whatsapp", from)
            .maybeSingle();

          if (!lead) continue;

          // Busca/cria conversa
          const { data: conversa } = await svc
            .from("conversas_whatsapp")
            .select("id")
            .eq("lead_id", lead.id)
            .eq("status", "aberta")
            .maybeSingle();

          let conversaId = conversa?.id;
          if (!conversaId) {
            const { data: nova } = await svc
              .from("conversas_whatsapp")
              .insert({
                imobiliaria_id: config.imobiliaria_id,
                lead_id: lead.id,
                corretor_id: lead.corretor_id,
                whatsapp_numero: from,
                ultima_mensagem_em: new Date().toISOString(),
              })
              .select("id")
              .single();
            conversaId = nova?.id;
          }

          await svc.from("mensagens_whatsapp").insert({
            conversa_id: conversaId,
            imobiliaria_id: config.imobiliaria_id,
            direcao: "recebida",
            wa_message_id: msg.id,
            tipo: msg.type ?? "text",
            conteudo: msg.text?.body ?? "",
            status_entrega: "delivered",
          });

          // Se primeira resposta, marca timestamp
          if (!lead.primeira_resposta_em) {
            await svc
              .from("leads")
              .update({ primeira_resposta_em: new Date().toISOString() })
              .eq("id", lead.id);
            await svc.from("lead_eventos").insert({
              lead_id: lead.id,
              imobiliaria_id: config.imobiliaria_id,
              tipo: "primeira_resposta",
              payload: { texto: msg.text?.body?.slice(0, 200) },
            });
          }
        }

        // Status de entrega
        for (const status of value.statuses ?? []) {
          await svc
            .from("mensagens_whatsapp")
            .update({ status_entrega: status.status })
            .eq("wa_message_id", status.id);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp Webhook]", err);
    return NextResponse.json({ ok: false });
  }
}
