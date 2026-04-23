import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Diagnóstico da configuração do Embedded Signup.
 * Retorna (sem expor secrets):
 *  - META_APP_ID configurado no servidor (prefixo)
 *  - META_APP_SECRET presente?
 *  - NEXT_PUBLIC_META_EMBEDDED_CONFIG_ID configurado
 *  - Teste básico de app_id/secret com Graph API: GET /{app_id}?access_token=APP_ID|APP_SECRET
 *
 * Útil pra diagnosticar o erro "Error validating verification code":
 *  - Se app_id no dialog != app_id aqui → config_id pertence a outro app
 *  - Se app_secret inválido → Graph API retorna erro
 */
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Apenas super_admin" }, { status: 403 });
  }

  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID ?? null;
  const appSecret = process.env.META_APP_SECRET ?? null;
  const configId =
    process.env.NEXT_PUBLIC_META_EMBEDDED_CONFIG_ID ??
    process.env.META_EMBEDDED_CONFIG_ID ??
    null;

  const result: Record<string, unknown> = {
    app_id_presente: !!appId,
    app_id_prefixo: appId ? appId.slice(0, 8) + "..." : null,
    app_id_completo: appId, // OK expor — é público
    app_secret_presente: !!appSecret,
    app_secret_tamanho: appSecret?.length ?? 0,
    config_id_presente: !!configId,
    config_id: configId, // OK expor — é público
  };

  // Teste 1: App credentials valid? GET /{app_id}?access_token=app_id|app_secret
  if (appId && appSecret) {
    try {
      const appToken = `${appId}|${appSecret}`;
      const r = await fetch(
        `https://graph.facebook.com/v22.0/${appId}?fields=id,name,category&access_token=${appToken}`,
      );
      const j = await r.json();
      if (r.ok) {
        result.teste_app_credentials = {
          ok: true,
          app_nome: j.name,
          app_categoria: j.category,
        };
      } else {
        result.teste_app_credentials = {
          ok: false,
          erro: j?.error?.message,
          code: j?.error?.code,
          subcode: j?.error?.error_subcode,
        };
      }
    } catch (err) {
      result.teste_app_credentials = {
        ok: false,
        erro: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return NextResponse.json(result);
}
