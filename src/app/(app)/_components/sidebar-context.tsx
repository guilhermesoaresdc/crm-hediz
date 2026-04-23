"use client";

import { createContext, useCallback, useContext, useState } from "react";

type SidebarContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
  openSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const openSidebar = useCallback(() => setOpen(true), []);

  return (
    <SidebarContext.Provider value={{ open, toggle, close, openSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
