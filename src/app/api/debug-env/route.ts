import { NextResponse } from "next/server";

/**
 * Rota de diagnóstico: mostra quais env vars chegaram no servidor
 * SEM revelar valores. Remover depois do setup inicial.
 */
export async function GET() {
  const check = (name: string, value: string | undefined) => ({
    set: !!value,
    length: value?.length ?? 0,
    preview: value ? `${value.slice(0, 10)}...${value.slice(-4)}` : null,
  });

  return NextResponse.json({
    runtime: {
      NEXT_PUBLIC_SUPABASE_URL: check("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: check(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      SUPABASE_SERVICE_ROLE_KEY: check(
        "SUPABASE_SERVICE_ROLE_KEY",
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      META_WEBHOOK_VERIFY_TOKEN: check(
        "META_WEBHOOK_VERIFY_TOKEN",
        process.env.META_WEBHOOK_VERIFY_TOKEN,
      ),
      WHATSAPP_VERIFY_TOKEN: check("WHATSAPP_VERIFY_TOKEN", process.env.WHATSAPP_VERIFY_TOKEN),
      META_APP_SECRET: check("META_APP_SECRET", process.env.META_APP_SECRET),
    },
    vercel: {
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      VERCEL_URL: process.env.VERCEL_URL ?? null,
    },
  });
}
