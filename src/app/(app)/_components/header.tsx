"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSidebar } from "./sidebar-context";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const { toggle } = useSidebar();

  const titulo =
    Object.entries(titulosPorRota).find(([k]) => pathname.startsWith(k))?.[1] ??
    "Hédiz";

  return (
    <header className="h-14 border-b bg-card/50 glass flex items-center gap-2 sm:gap-3 px-3 sm:px-4 flex-shrink-0 z-30">
      <button
        onClick={toggle}
        className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors flex-shrink-0"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="text-sm font-medium text-foreground/90 flex-shrink-0 truncate">
        {titulo}
      </div>

      <div className="flex-1 hidden md:flex max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Buscar leads, campanhas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-muted/50 border border-transparent focus:border-border focus:bg-background outline-none text-sm transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
          aria-label="Buscar"
        >
          <Search className="h-4 w-4" />
        </button>
        <ThemeToggle />
        <NotificationBell />
        <div className="hidden sm:block w-px h-6 bg-border mx-1" />
        <UserMenu nome={nome} email={email} role={role} />
      </div>

      {searchOpen && (
        <div className="md:hidden absolute left-0 right-0 top-14 px-3 py-2 bg-card border-b z-40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Buscar leads, campanhas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full h-10 pl-9 pr-3 rounded-md bg-muted/50 border border-transparent focus:border-border focus:bg-background outline-none text-sm transition-colors"
            />
          </div>
        </div>
      )}
    </header>
  );
}
