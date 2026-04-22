"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HedizWordmark } from "@/components/hediz-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout: servidor não respondeu em 15s")), 15000),
        ),
      ]);
      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Form side */}
      <div className="flex flex-col">
        <div className="h-16 px-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <HedizWordmark className="mb-6" />
              <h1 className="text-2xl font-bold tracking-tight mb-1">Entrar</h1>
              <p className="text-sm text-muted-foreground">
                Acesse o CRM da sua imobiliária
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@imobiliaria.com.br"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>

              <p className="text-sm text-center text-muted-foreground pt-4">
                Ainda não tem conta?{" "}
                <Link href="/signup" className="text-primary font-medium hover:underline">
                  Começar trial
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Visual side */}
      <div className="hidden lg:flex bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-dot-pattern opacity-10" />
        <div className="relative text-primary-foreground max-w-md">
          <div className="text-sm font-medium mb-3 opacity-80">CRM Hédiz</div>
          <blockquote className="text-2xl font-semibold leading-snug mb-6">
            &ldquo;Do clique ao fechamento — com atribuição real que otimiza seu tráfego pra
            leads que viram venda.&rdquo;
          </blockquote>
          <div className="flex gap-2 text-sm opacity-90">
            <span className="px-2 py-1 rounded-md bg-white/10">ROAS real</span>
            <span className="px-2 py-1 rounded-md bg-white/10">Roleta + Bolsão</span>
            <span className="px-2 py-1 rounded-md bg-white/10">CAPI ponta a ponta</span>
          </div>
        </div>
      </div>
    </div>
  );
}
