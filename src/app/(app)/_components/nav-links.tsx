"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Inbox,
  BarChart3,
  Settings,
  DollarSign,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ReactNode; roles?: string[] };

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/leads", label: "Leads", icon: <Users className="h-4 w-4" /> },
  { href: "/pipeline", label: "Pipeline", icon: <KanbanSquare className="h-4 w-4" /> },
  { href: "/bolsao", label: "Bolsão", icon: <Inbox className="h-4 w-4" /> },
  { href: "/campanhas", label: "Rastreamento Meta", icon: <BarChart3 className="h-4 w-4" />, roles: ["super_admin", "gerente"] },
  { href: "/vendas", label: "Vendas", icon: <DollarSign className="h-4 w-4" /> },
  { href: "/equipe", label: "Equipe", icon: <UsersRound className="h-4 w-4" />, roles: ["super_admin", "gerente"] },
  { href: "/configuracoes", label: "Configurações", icon: <Settings className="h-4 w-4" />, roles: ["super_admin"] },
];

export function NavLinks({ role }: { role: string }) {
  const pathname = usePathname();
  const visible = items.filter((it) => !it.roles || it.roles.includes(role));

  return (
    <nav className="flex-1 p-2 space-y-1">
      {visible.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
