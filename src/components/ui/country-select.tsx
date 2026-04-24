"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES, type Country } from "@/lib/countries";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // ISO
  onChange: (iso: string) => void;
  disabled?: boolean;
};

export function CountrySelect({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = COUNTRIES.find((c) => c.iso === value) ?? COUNTRIES[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = query.trim()
    ? COUNTRIES.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.includes(q.replace(/\D/g, "")) ||
          c.iso.toLowerCase().includes(q)
        );
      })
    : COUNTRIES;

  function pick(c: Country) {
    onChange(c.iso);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm",
          "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed",
          open && "ring-2 ring-ring",
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">{selected.flag}</span>
          <span className="truncate">+{selected.code}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-[280px] max-w-[90vw] rounded-md border bg-popover shadow-elevated overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar país..."
                className="w-full h-8 pl-8 pr-2 rounded bg-muted/50 text-sm outline-none focus:bg-background border border-transparent focus:border-border"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-xs text-muted-foreground text-center">
                Nenhum país encontrado
              </li>
            )}
            {filtered.map((c) => (
              <li key={c.iso}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left",
                    c.iso === value && "bg-primary/10 text-primary",
                  )}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">+{c.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
