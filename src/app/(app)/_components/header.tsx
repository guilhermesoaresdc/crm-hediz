"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

const titulosPorRota: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/gestao": "Gestão",
  "/campanhas": "Rastreamento Meta",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/bolsao": "Bolsão",
  "/vendas": "Vendas",
  "/equipe": "Equipe",
  "/integracoes": "Integrações",
  "/ferramentas-chat": "Ferramentas do Chat",
  "/configuracoes": "Configurações",
};

export function Header({
  nome,
  email,
  role,
}: {
  nome: string;
  email: string;
  role: string;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const titulo =
    Object.entries(titulosPorRota).find(([k]) => pathname.startsWith(k))?.[1] ??
    "Hédiz";

  return (
    <header className="h-14 border-b bg-card/50 glass flex items-center gap-3 px-4 flex-shrink-0 z-30">
      <div className="text-sm font-medium text-foreground/90 flex-shrink-0">
        {titulo}
      </div>

      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Buscar leads, campanhas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-muted/50 border border-transparent focus:border-border focus:bg-background outline-none text-sm transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <ThemeToggle />
        <NotificationBell />
        <div className="w-px h-6 bg-border mx-1" />
        <UserMenu nome={nome} email={email} role={role} />
      </div>
    </header>
  );
}
