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
  Briefcase,
} from "lucide-react";
import { HedizWordmark } from "@/components/hediz-logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  badge?: string | number;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/gestao", label: "Gestão", icon: Briefcase, roles: ["super_admin", "gerente"] },
      { href: "/campanhas", label: "Rastreamento Meta", icon: BarChart3, roles: ["super_admin", "gerente"] },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/bolsao", label: "Bolsão", icon: Inbox },
      { href: "/vendas", label: "Vendas", icon: DollarSign },
    ],
  },
  {
    label: "Organização",
    items: [
      { href: "/equipe", label: "Equipe", icon: UsersRound, roles: ["super_admin", "gerente"] },
      { href: "/configuracoes", label: "Configurações", icon: Settings, roles: ["super_admin"] },
    ],
  },
];

export function Sidebar({
  role,
  imobiliariaNome,
  userName,
  userRole,
}: {
  role: string;
  imobiliariaNome: string;
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r bg-card flex flex-col flex-shrink-0">
      <div className="p-3 border-b">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
        >
          <HedizWordmark />
        </Link>
        <div className="mt-3 px-2 py-2 rounded-md bg-muted/50 border">
          <div className="text-xs font-semibold truncate">{imobiliariaNome}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {userName} · {userRole}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (it) => !it.roles || it.roles.includes(role),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="px-2 mb-3">
              <div className="px-2 mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {section.label}
              </div>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors group",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground/80 hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {item.badge != null && (
                          <span className="ml-auto text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
