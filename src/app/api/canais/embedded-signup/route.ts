import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  trocarEmbeddedSignupCode,
  trocarPorLongLived,
  listarTodosPhones,
  inscreverAppNaWaba,
} from "@/lib/integrations/meta-oauth";

const schema = z.object({
  // code flow (default do Embedded Signup v3)
  code: z.string().optional(),
  // token flow (fallback para apps ainda sem response_type=code)
  access_token: z.string().optional(),
  waba_id: z.string().optional(),
  phone_number_id: z.string().optional(),
});

/**
 * Recebe o code do FB.login com config_id (Embedded Signup) e:
 *   1) Troca code por Business Integration token (long-lived por default)
 *   2) Descobre WABAs/phones acessíveis
 *   3) Inscreve nosso app para receber webhooks de cada WABA nova
 *   4) Cria canais_whatsapp no Supabase
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("usuarios")
    .select("imobiliaria_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Apenas super_admin" }, { status: 403 });
  }

  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "META_APP_ID/SECRET não configurados" },
      { status: 500 },
    );
  }

  if (!parsed.data.code && !parsed.data.access_token) {
    return NextResponse.json(
      { error: "Precisa fornecer 'code' ou 'access_token'" },
      { status: 400 },
    );
  }

  // Sanity check: primeiros 6 chars do app_id são logados pra comparar
  // com o app_id=... que aparece na URL do dialog OAuth. Se divergir, o
  // servidor está configurado com env var apontando pra outro app.
  console.log(
    `[embedded-signup] iniciando exchange (app_id=${appId.slice(0, 6)}..., code=${parsed.data.code?.slice(0, 8) ?? "<sem code>"}...)`,
  );

  try {
    let accessToken: string;

    if (parsed.data.code) {
      // Code flow oficial: Embedded Signup já retorna Business Integration
      // System User token — long-lived por definição. NÃO trocamos por
      // long-lived de novo (isso quebraria o token de integração).
      const resp = await trocarEmbeddedSignupCode({
        appId,
        appSecret,
        code: parsed.data.code,
      });
      accessToken = resp.access_token;
    } else {
      // Token flow legado: upgrade do short-lived user token para long-lived
      const long = await trocarPorLongLived({
        appId,
        appSecret,
        shortToken: parsed.data.access_token!,
      });
      accessToken = long.access_token;
    }

    // Descobre os phones disponíveis no token
    let phones = await listarTodosPhones(accessToken);

    // Se o postMessage do FB.login entregou IDs específicos, filtra
    if (parsed.data.waba_id) {
      phones = phones.filter((p) => p.waba_id === parsed.data.waba_id);
    }
    if (parsed.data.phone_number_id) {
      phones = phones.filter((p) => p.phone_number_id === parsed.data.phone_number_id);
    }

    if (phones.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nenhum número WhatsApp encontrado. Verifique se você completou o Embedded Signup corretamente e que o número foi associado a um WhatsApp Business Account.",
        },
        { status: 404 },
      );
    }

    // Inscreve o app pra receber webhooks de cada WABA nova — idempotente
    const wabasUnicas = Array.from(new Set(phones.map((p) => p.waba_id)));
    for (const wabaId of wabasUnicas) {
      try {
        await inscreverAppNaWaba(accessToken, wabaId);
      } catch (err) {
        // Log mas não falha — o usuário ainda consegue enviar; webhook entra depois
        console.warn(
          `[embedded-signup] inscreverAppNaWaba(${wabaId}) falhou:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Cria canais pra cada phone (geralmente 1, mas suporta N)
    const criados: { id: string; nome: string; phone: string }[] = [];
    for (const p of phones) {
      const { data: existente } = await supabase
        .from("canais_whatsapp")
        .select("id")
        .eq("imobiliaria_id", profile.imobiliaria_id)
        .eq("whatsapp_phone_number_id", p.phone_number_id)
        .maybeSingle();
      if (existente) continue;

      const nome = p.verified_name || p.display_phone_number;

      const { data: canal, error } = await supabase
        .from("canais_whatsapp")
        .insert({
          imobiliaria_id: profile.imobiliaria_id,
          nome,
          whatsapp_business_account_id: p.waba_id,
          whatsapp_business_account_nome: p.waba_nome,
          whatsapp_phone_number_id: p.phone_number_id,
          whatsapp_phone_display: p.display_phone_number,
          verified_name: p.verified_name,
          quality_rating: p.quality_rating,
          access_token: accessToken,
        })
        .select()
        .single();

      if (!error && canal) {
        criados.push({ id: canal.id, nome, phone: p.display_phone_number });
      }
    }

    // Atualiza o meta_access_token global também
    await supabase
      .from("configuracoes_imobiliaria")
      .update({ meta_access_token: accessToken })
      .eq("imobiliaria_id", profile.imobiliaria_id);

    return NextResponse.json({ ok: true, canais: criados });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[embedded-signup]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
