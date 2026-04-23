"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LogOut, UserCircle2, Settings as SettingsIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function UserMenu({
  nome,
  email,
  role,
}: {
  nome: string;
  email: string;
  role: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function sair() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((x) => !x)}
        className="inline-flex items-center gap-2 h-9 px-2 rounded-md hover:bg-accent transition-colors"
      >
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initials || "?"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-[16rem] sm:w-60 rounded-lg border bg-popover shadow-elevated overflow-hidden z-50",
            "animate-fade-in",
          )}
        >
          <div className="px-3 py-3 border-b">
            <div className="font-semibold text-sm truncate">{nome}</div>
            <div className="text-xs text-muted-foreground truncate">{email}</div>
            <div className="mt-1 text-[11px] inline-block px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
              {role}
            </div>
          </div>
          <div className="p-1">
            <Link
              href="/equipe"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent"
            >
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
              Meu perfil
            </Link>
            {role === "super_admin" && (
              <Link
                href="/configuracoes"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent"
              >
                <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                Configurações
              </Link>
            )}
          </div>
          <div className="p-1 border-t">
            <button
              onClick={sair}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-destructive/10 hover:text-destructive text-foreground/80"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
