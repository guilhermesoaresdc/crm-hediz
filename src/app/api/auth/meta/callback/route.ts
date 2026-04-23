import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  trocarCodePorToken,
  trocarPorLongLived,
} from "@/lib/integrations/meta-oauth";

function errorRedirect(origin: string, message: string) {
  const url = new URL("/integracoes", origin);
  url.searchParams.set("meta_error", message);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const params = new URL(req.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const fbError = params.get("error_description") ?? params.get("error");

  if (fbError) {
    return errorRedirect(origin, `Meta negou: ${fbError}`);
  }

  if (!code || !state) {
    return errorRedirect(origin, "Resposta do Meta inválida (sem code/state)");
  }

  // Valida state via cookie
  const stateCookie = req.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("meta_oauth_state="))
    ?.split("=")[1];

  if (!stateCookie || stateCookie !== state) {
    return errorRedirect(origin, "State inválido (possível CSRF)");
  }

  const appId =
    process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  if (!appId || !appSecret) {
    return errorRedirect(origin, "App Meta não configurado no servidor");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const { data: profile } = await supabase
    .from("usuarios")
    .select("imobiliaria_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    return errorRedirect(origin, "Apenas super admins podem conectar integrações");
  }

  try {
    const redirectUri = `${origin}/api/auth/meta/callback`;
    // Short-lived (1h)
    const short = await trocarCodePorToken({
      appId,
      appSecret,
      redirectUri,
      code,
    });

    // Long-lived (~60 dias)
    const long = await trocarPorLongLived({
      appId,
      appSecret,
      shortToken: short.access_token,
    });

    // Salva token mas SEM marcar conectado_em (ainda falta user selecionar assets)
    const { error } = await supabase
      .from("configuracoes_imobiliaria")
      .update({ meta_access_token: long.access_token })
      .eq("imobiliaria_id", profile.imobiliaria_id);
    if (error) {
      return errorRedirect(origin, `Falha ao salvar token: ${error.message}`);
    }

    // Lê o intent salvo no cookie pra decidir destino
    const intentCookie = req.headers
      .get("cookie")
      ?.split(";")
      .find((c) => c.trim().startsWith("meta_oauth_intent="))
      ?.split("=")[1];

    const destino =
      intentCookie === "whatsapp"
        ? "/integracoes/selecionar-whatsapp"
        : "/integracoes/selecionar";

    const response = NextResponse.redirect(new URL(destino, origin));
    response.cookies.delete("meta_oauth_state");
    response.cookies.delete("meta_oauth_intent");
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorRedirect(origin, msg);
  }
}
