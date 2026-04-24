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

        // Busca canal multi-canal; fallback pra config legada se ainda não migrou
        const { data: canal } = await svc
          .from("canais_whatsapp")
          .select("id, imobiliaria_id")
          .eq("whatsapp_phone_number_id", phoneNumberId)
          .maybeSingle();

        let imobiliariaId = canal?.imobiliaria_id;
        const canalId = canal?.id ?? null;

        if (!imobiliariaId) {
          const { data: config } = await svc
            .from("configuracoes_imobiliaria")
            .select("imobiliaria_id")
            .eq("whatsapp_phone_number_id", phoneNumberId)
            .maybeSingle();
          imobiliariaId = config?.imobiliaria_id;
        }
        if (!imobiliariaId) continue;

        // Processa mensagens recebidas
        for (const msg of value.messages ?? []) {
          const from = msg.from as string;

          // Busca lead pelo número (normalizado — só dígitos)
          const digits = from.replace(/\D/g, "");
          const { data: leadMatch } = await svc
            .from("leads")
            .select("id, corretor_id, primeira_resposta_em, em_bolsao")
            .eq("imobiliaria_id", imobiliariaId)
            .or(`whatsapp.eq.${from},whatsapp.eq.${digits},whatsapp.eq.+${digits}`)
            .limit(1)
            .maybeSingle();

          let leadId = leadMatch?.id;
          let corretorId = leadMatch?.corretor_id;

          // Se nao existe lead, cria um novo como "novo_wa" (origem: whatsapp_direto)
          if (!leadId) {
            const nome =
              value.contacts?.find((c: any) => c.wa_id === from)?.profile?.name ??
              `WhatsApp ${from.slice(-4)}`;
            const { data: novoLead } = await svc
              .from("leads")
              .insert({
                imobiliaria_id: imobiliariaId,
                nome,
                whatsapp: from,
                status: "novo",
                origem: "whatsapp_direto",
              })
              .select("id, corretor_id")
              .single();
            leadId = novoLead?.id;
            corretorId = novoLead?.corretor_id ?? null;
          }
          if (!leadId) continue;

          // Busca/cria conversa (preferir a que tá aberta)
          const { data: conversaExistente } = await svc
            .from("conversas_whatsapp")
            .select("id")
            .eq("imobiliaria_id", imobiliariaId)
            .eq("lead_id", leadId)
            .eq("status", "aberta")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          let conversaId = conversaExistente?.id;
          if (!conversaId) {
            const { data: nova } = await svc
              .from("conversas_whatsapp")
              .insert({
                imobiliaria_id: imobiliariaId,
                lead_id: leadId,
                corretor_id: corretorId,
                whatsapp_numero: from,
                canal_id: canalId,
                tipo_canal: "whatsapp_oficial",
                ultima_mensagem_em: new Date().toISOString(),
              })
              .select("id")
              .single();
            conversaId = nova?.id;
          } else {
            await svc
              .from("conversas_whatsapp")
              .update({ ultima_mensagem_em: new Date().toISOString() })
              .eq("id", conversaId);
          }

          if (!conversaId) continue;

          // Extrai conteudo conforme o tipo
          let conteudo: string | null = null;
          const tipo = (msg.type ?? "text") as string;
          if (tipo === "text") conteudo = msg.text?.body ?? null;
          else if (tipo === "image") conteudo = msg.image?.caption ?? "📷 Imagem";
          else if (tipo === "audio") conteudo = "🎤 Áudio";
          else if (tipo === "video") conteudo = msg.video?.caption ?? "🎥 Vídeo";
          else if (tipo === "document")
            conteudo = `📎 ${msg.document?.filename ?? "Documento"}`;
          else if (tipo === "button") conteudo = msg.button?.text ?? null;
          else if (tipo === "interactive")
            conteudo =
              msg.interactive?.button_reply?.title ??
              msg.interactive?.list_reply?.title ??
              null;
          else conteudo = `[${tipo}]`;

          await svc.from("mensagens_whatsapp").insert({
            conversa_id: conversaId,
            canal_id: canalId,
            imobiliaria_id: imobiliariaId,
            tipo_canal: "whatsapp_oficial",
            direcao: "recebida",
            wa_message_id: msg.id,
            tipo,
            conteudo,
            status_entrega: "delivered",
          });

          // Marca primeira_resposta + saí do bolsão se aplicavel
          if (leadMatch && !leadMatch.primeira_resposta_em) {
            await svc
              .from("leads")
              .update({
                primeira_resposta_em: new Date().toISOString(),
                em_bolsao: false,
              })
              .eq("id", leadId);
            await svc.from("lead_eventos").insert({
              lead_id: leadId,
              imobiliaria_id: imobiliariaId,
              tipo: "primeira_resposta",
              payload: { texto: conteudo?.slice(0, 200) },
            });
          }
        }

        // Status de entrega (sent, delivered, read, failed)
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
