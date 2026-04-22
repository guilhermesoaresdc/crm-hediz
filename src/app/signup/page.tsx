"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HedizWordmark } from "@/components/hediz-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: "",
    nome_imobiliaria: "",
    admin_nome: "",
    admin_email: "",
    admin_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const text = await res.text();
      let body: { error?: unknown } = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { error: text || "Resposta inválida do servidor" };
      }

      if (!res.ok) {
        const msg =
          typeof body.error === "string"
            ? body.error
            : `Falha ao criar conta (HTTP ${res.status})`;
        setError(msg);
        setLoading(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const signResult = await Promise.race([
        supabase.auth.signInWithPassword({
          email: form.admin_email,
          password: form.admin_password,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout ao fazer login automático")), 15000),
        ),
      ]);
      if (signResult.error) {
        setError(signResult.error.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de rede");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex flex-col order-2 lg:order-1">
        <div className="h-16 px-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <HedizWordmark className="mb-6" />
              <h1 className="text-2xl font-bold tracking-tight mb-1">Criar conta</h1>
              <p className="text-sm text-muted-foreground">
                Trial de 14 dias. Sem cartão de crédito.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome_imobiliaria">Nome da imobiliária</Label>
                <Input
                  id="nome_imobiliaria"
                  required
                  value={form.nome_imobiliaria}
                  onChange={(e) => setForm({ ...form, nome_imobiliaria: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Identificador (URL)</Label>
                <div className="flex rounded-md border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                  <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border-r">
                    hediz.app/
                  </span>
                  <input
                    id="slug"
                    required
                    placeholder="minha-imobiliaria"
                    className="flex-1 h-10 px-3 text-sm bg-transparent outline-none"
                    value={form.slug}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="admin_nome">Seu nome</Label>
                  <Input
                    id="admin_nome"
                    required
                    value={form.admin_nome}
                    onChange={(e) => setForm({ ...form, admin_nome: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin_email">Email</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    required
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin_password">Senha (mín. 8 caracteres)</Label>
                <Input
                  id="admin_password"
                  type="password"
                  required
                  minLength={8}
                  value={form.admin_password}
                  onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando conta..." : "Criar conta"}
              </Button>

              <p className="text-sm text-center text-muted-foreground pt-2">
                Já tem conta?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex bg-primary relative overflow-hidden order-1 lg:order-2 items-center justify-center p-12">
        <div className="absolute inset-0 bg-dot-pattern opacity-10" />
        <div className="relative text-primary-foreground max-w-md space-y-6">
          <div>
            <div className="text-sm font-medium mb-3 opacity-80">O que vem junto</div>
            <h2 className="text-3xl font-bold leading-tight">
              Tudo pra fechar mais — a partir do primeiro dia.
            </h2>
          </div>
          <ul className="space-y-3">
            {[
              "Roleta round-robin com bolsão em 5 minutos",
              "Pipeline arrastável com SLA visual",
              "Rastreamento Meta ponta a ponta (fbclid, UTM, CAPI)",
              "ROAS real — mídia + fee agência vs vendas",
              "WhatsApp Cloud API integrado",
              "Hierarquia: super admin, gerente, corretor",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
