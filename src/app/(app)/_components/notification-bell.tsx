"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Inbox, Clock, Zap } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = api.notificacao.lista.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Fecha ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const total = data?.total ?? 0;
  const urgentes = data?.urgentes ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center",
              urgentes > 0
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary text-primary-foreground",
            )}
          >
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-lg border bg-card shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Notificações</div>
              {total > 0 && (
                <div className="text-xs text-muted-foreground">
                  {urgentes > 0 ? `${urgentes} urgente${urgentes > 1 ? "s" : ""}` : `${total} pendente${total > 1 ? "s" : ""}`}
                </div>
              )}
            </div>
            <Link
              href="/bolsao"
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver bolsão
            </Link>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {!data || data.notificacoes.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nada urgente por aqui.
              </div>
            ) : (
              data.notificacoes.map((n) => (
                <Link
                  key={n.id}
                  href={n.lead_id ? `/leads/${n.lead_id}` : "/bolsao"}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                        n.urgencia === "alta" && "bg-destructive/10 text-destructive",
                        n.urgencia === "media" && "bg-yellow-500/10 text-yellow-600",
                        n.urgencia === "baixa" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {n.tipo === "bolsao_disponivel" ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{n.titulo}</div>
                      {n.subtitulo && (
                        <div className="text-xs text-muted-foreground mt-0.5">{n.subtitulo}</div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
