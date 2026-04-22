import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "./_components/logout-button";
import { NavLinks } from "./_components/nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("id, nome, role, imobiliaria:imobiliarias(nome, logo_url)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const imobiliaria = Array.isArray(profile.imobiliaria)
    ? profile.imobiliaria[0]
    : (profile.imobiliaria as { nome?: string; logo_url?: string | null } | null);

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="block">
            <div className="font-semibold">{imobiliaria?.nome ?? "CRM Hédiz"}</div>
            <div className="text-xs text-muted-foreground">{profile.nome} · {profile.role}</div>
          </Link>
        </div>
        <NavLinks role={profile.role as string} />
        <div className="mt-auto p-4 border-t">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
