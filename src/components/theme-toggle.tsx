"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem("theme") as Theme) || "system";
    setTheme(stored);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  // Escuta mudança do SO quando tema = system
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  if (!mounted) {
    return (
      <button
        className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground"
        aria-label="Tema"
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  function cycle() {
    setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "system" : "light"));
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      onClick={cycle}
      className={cn(
        "inline-flex items-center justify-center h-9 w-9 rounded-md",
        "hover:bg-accent hover:text-accent-foreground transition-colors",
        "text-muted-foreground",
      )}
      aria-label={`Tema: ${theme}`}
      title={`Tema: ${theme} (click pra alternar)`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * Injetado no <head> pra setar tema ANTES do primeiro paint,
 * evitando flicker de tema.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('theme')||'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;if(r==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
