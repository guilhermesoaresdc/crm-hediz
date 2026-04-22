"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: form.admin_email,
        password: form.admin_password,
      });
      if (signErr) {
        setError(signErr.message);
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
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Criar conta da imobiliária</CardTitle>
          <CardDescription>Trial de 14 dias, sem cartão de crédito</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_imobiliaria">Nome da imobiliária</Label>
              <Input
                id="nome_imobiliaria"
                required
                value={form.nome_imobiliaria}
                onChange={(e) => setForm({ ...form, nome_imobiliaria: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador único (URL)</Label>
              <Input
                id="slug"
                required
                placeholder="minha-imobiliaria"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="admin_nome">Seu nome</Label>
                <Input
                  id="admin_nome"
                  required
                  value={form.admin_nome}
                  onChange={(e) => setForm({ ...form, admin_nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="admin_password">Senha (mínimo 8 caracteres)</Label>
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
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Já tem conta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
