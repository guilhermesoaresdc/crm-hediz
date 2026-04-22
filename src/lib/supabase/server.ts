import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseCookie = { name: string; value: string; options?: CookieOptions };

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // chamadas em Server Component — ignoradas
          }
        },
      },
    },
  );
}

export function createSupabaseServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: (): SupabaseCookie[] => [],
        setAll: (_cookies: SupabaseCookie[]) => {},
      },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
