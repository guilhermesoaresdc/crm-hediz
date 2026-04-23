"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plug, FileText, Megaphone, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/ferramentas-chat", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: "/ferramentas-chat/canais", label: "Canais", icon: Plug },
  { href: "/ferramentas-chat/modelos", label: "Modelos", icon: FileText },
  { href: "/ferramentas-chat/transmissao", label: "Transmissão", icon: Megaphone },
  { href: "/ferramentas-chat/estatisticas", label: "Estatísticas", icon: BarChart3 },
];

export function ChatNav() {
  const pathname = usePathname();

  return (
    <nav className="p-2 space-y-0.5">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/80 hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                active ? "text-primary" : "text-muted-foreground",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
