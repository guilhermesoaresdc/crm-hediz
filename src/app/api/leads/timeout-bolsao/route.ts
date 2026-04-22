import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Endpoint invocado por Inngest/cron para mover leads
 * que ultrapassaram o timeout sem primeira mensagem.
 *
 * Em produção: disparado como event pelo Inngest 5min após atribuição.
 * Aqui aceita um corretor/lead_id via POST e delega à função SQL.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.INNGEST_SIGNING_KEY}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { lead_id, corretor_id, timeout_minutos } = await req.json();
  const svc = createSupabaseServiceClient();

  // Safety check: corretor ainda é o mesmo? Lead não respondeu?
  const { data: lead } = await svc
    .from("leads")
    .select("id, corretor_id, primeira_mensagem_em")
    .eq("id", lead_id)
    .single();

  if (!lead) return NextResponse.json({ skipped: "lead_not_found" });
  if (lead.primeira_mensagem_em) return NextResponse.json({ skipped: "ja_respondeu" });
  if (lead.corretor_id !== corretor_id) return NextResponse.json({ skipped: "reatribuido" });

  const { data } = await svc.rpc("mover_para_bolsao", {
    p_lead_id: lead_id,
    p_timeout_minutos: timeout_minutos ?? 30,
  });

  return NextResponse.json({ moved: data });
}
