"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NovoLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    observacoes: "",
  });

  const criar = api.lead.criar.useMutation({
    onSuccess: (res) => {
      router.push(`/leads/${res.lead.id}`);
    },
  });

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-3xl font-bold mb-6">Novo lead</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados do lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              criar.mutate({
                nome: form.nome,
                whatsapp: form.whatsapp,
                email: form.email || undefined,
                observacoes: form.observacoes || undefined,
                origem: "manual",
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                required
                placeholder="+55 11 99999-9999"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
            {criar.error && (
              <p className="text-sm text-destructive">{criar.error.message}</p>
            )}
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? "Criando..." : "Criar e distribuir"}
            </Button>
            <p className="text-xs text-muted-foreground">
              O lead será automaticamente atribuído via roleta ao próximo corretor disponível.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
