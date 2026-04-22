import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "./_components/sidebar";
import { Header } from "./_components/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("id, nome, email, role, imobiliaria:imobiliarias(nome, logo_url)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const imobiliariaRaw = profile.imobiliaria as unknown;
  const imobiliaria = (Array.isArray(imobiliariaRaw)
    ? imobiliariaRaw[0]
    : imobiliariaRaw) as { nome?: string; logo_url?: string | null } | null | undefined;

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar
        role={profile.role as string}
        imobiliariaNome={imobiliaria?.nome ?? "Hédiz"}
        userName={profile.nome}
        userRole={profile.role as string}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          nome={profile.nome}
          email={profile.email}
          role={profile.role as string}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
