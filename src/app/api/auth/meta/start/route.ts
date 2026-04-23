import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMetaOAuthUrl } from "@/lib/integrations/meta-oauth";

export async function GET(req: Request) {
  const appId =
    process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID;
  if (!appId) {
    return NextResponse.json(
      {
        error:
          "META_APP_ID não configurado no servidor. Defina META_APP_ID (ou NEXT_PUBLIC_META_APP_ID) nas env vars do Vercel.",
      },
      { status: 500 },
    );
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // State = random + user_id assinado pra prevenir CSRF
  const random = crypto.randomBytes(16).toString("hex");
  const state = `${random}.${user.id}`;

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/meta/callback`;
  const url = getMetaOAuthUrl({ appId, redirectUri, state });

  const response = NextResponse.redirect(url);
  // Cookie HttpOnly pra validar state no callback
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10min
    path: "/",
  });
  return response;
}
