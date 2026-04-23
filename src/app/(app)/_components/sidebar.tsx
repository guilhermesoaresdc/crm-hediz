"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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
  Plug,
  MessageCircle,
  X,
} from "lucide-react";
import { HedizWordmark } from "@/components/hediz-logo";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

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
      {
        href: "/ferramentas-chat",
        label: "Ferramentas do Chat",
        icon: MessageCircle,
        roles: ["super_admin", "gerente"],
      },
    ],
  },
  {
    label: "Organização",
    items: [
      { href: "/equipe", label: "Equipe", icon: UsersRound, roles: ["super_admin", "gerente"] },
      { href: "/integracoes", label: "Integrações", icon: Plug, roles: ["super_admin"] },
      { href: "/configuracoes", label: "Configurações", icon: Settings, roles: ["super_admin"] },
    ],
  },
];

type SidebarProps = {
  role: string;
  imobiliariaNome: string;
  userName: string;
  userRole: string;
};

function SidebarBody({
  role,
  imobiliariaNome,
  userName,
  userRole,
  onNavigate,
  showClose,
}: SidebarProps & { onNavigate?: () => void; showClose?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      <div className="p-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors flex-1 min-w-0"
          >
            <HedizWordmark />
          </Link>
          {showClose && (
            <button
              onClick={onNavigate}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 lg:py-1.5 text-sm transition-colors group",
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
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  const pathname = usePathname();
  const { open, close } = useSidebar();

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar — só em lg+ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 border-r bg-card flex-col">
        <SidebarBody {...props} />
      </aside>

      {/* Mobile overlay */}
      <div
        onClick={close}
        className={cn(
          "lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        aria-hidden={!open}
      />

      {/* Mobile drawer — só em <lg */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 border-r bg-card flex flex-col",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
        aria-label="Menu principal"
        aria-hidden={!open}
      >
        <SidebarBody {...props} onNavigate={close} showClose />
      </aside>
    </>
  );
}
