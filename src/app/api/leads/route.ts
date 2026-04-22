import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { enviarCapiLead } from "@/lib/integrations/meta-capi";
import { sanitizePhone } from "@/lib/utils";

const schema = z.object({
  imobiliaria_slug: z.string(),
  nome: z.string().min(2),
  whatsapp: z.string().min(10),
  email: z.string().email().optional(),
  fbclid: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  event_source_url: z.string().optional(),
  respostas: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const svc = createSupabaseServiceClient();

  const { data: imo, error: imoErr } = await svc
    .from("imobiliarias")
    .select("id")
    .eq("slug", data.imobiliaria_slug)
    .eq("ativo", true)
    .single();
  if (imoErr || !imo) {
    return NextResponse.json({ error: "Imobiliária não encontrada" }, { status: 404 });
  }

  // Tenta resolver anúncio pelo utm_content (convenção: utm_content = meta_ad_id)
  let anuncio_id: string | null = null;
  let campanha_id: string | null = null;
  if (data.utm_content) {
    const { data: ad } = await svc
      .from("anuncios")
      .select("id, conjunto:conjuntos_anuncios(campanha_id)")
      .eq("imobiliaria_id", imo.id)
      .eq("meta_ad_id", data.utm_content)
      .maybeSingle();
    if (ad) {
      anuncio_id = ad.id;
      const conj = Array.isArray(ad.conjunto) ? ad.conjunto[0] : ad.conjunto;
      campanha_id = (conj as { campanha_id?: string } | null)?.campanha_id ?? null;
    }
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const { data: lead, error } = await svc
    .from("leads")
    .insert({
      imobiliaria_id: imo.id,
      nome: data.nome,
      whatsapp: sanitizePhone(data.whatsapp),
      email: data.email,
      fbclid: data.fbclid,
      fbp: data.fbp,
      fbc: data.fbc,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      utm_content: data.utm_content,
      utm_term: data.utm_term,
      anuncio_id,
      campanha_id,
      origem: "meta_site",
      origem_detalhes: { user_agent: userAgent, client_ip: clientIp, event_source_url: data.event_source_url },
      respostas: data.respostas ?? {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Distribui via roleta
  await svc.rpc("distribuir_lead_round_robin", {
    p_lead_id: lead.id,
    p_imobiliaria_id: imo.id,
    p_equipe_id: null,
  });

  // Envia CAPI Lead (fire-and-forget)
  enviarCapiLead({
    imobiliariaId: imo.id,
    leadId: lead.id,
    eventSourceUrl: data.event_source_url,
    clientIp,
    userAgent,
  }).catch((err) => console.error("[CAPI Lead]", err));

  return NextResponse.json({ ok: true, lead_id: lead.id });
}
