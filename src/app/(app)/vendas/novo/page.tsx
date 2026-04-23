"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NovaVendaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("lead");

  const [form, setForm] = useState({
    valor_venda: "",
    valor_comissao: "",
    imovel_descricao: "",
    endereco: "",
    data_venda: new Date().toISOString().slice(0, 10),
  });

  const registrar = api.venda.registrar.useMutation({
    onSuccess: () => router.push("/vendas"),
  });

  if (!leadId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-destructive">
          Acesse esta página a partir de um lead vendido (botão "Registrar venda").
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Registrar venda</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Ao salvar, o evento Purchase será enviado ao Meta via Conversion API
        usando o timestamp original do lead — fechando o loop de atribuição.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Dados da venda</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              registrar.mutate({
                lead_id: leadId,
                valor_venda: Number(form.valor_venda),
                valor_comissao: form.valor_comissao ? Number(form.valor_comissao) : undefined,
                imovel_descricao: form.imovel_descricao || undefined,
                endereco: form.endereco || undefined,
                data_venda: form.data_venda,
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="valor_venda">Valor da venda (R$) *</Label>
              <Input
                id="valor_venda"
                type="number"
                step="0.01"
                required
                value={form.valor_venda}
                onChange={(e) => setForm({ ...form, valor_venda: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_comissao">Comissão (R$)</Label>
              <Input
                id="valor_comissao"
                type="number"
                step="0.01"
                value={form.valor_comissao}
                onChange={(e) => setForm({ ...form, valor_comissao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imovel_descricao">Imóvel</Label>
              <Input
                id="imovel_descricao"
                value={form.imovel_descricao}
                onChange={(e) => setForm({ ...form, imovel_descricao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_venda">Data *</Label>
              <Input
                id="data_venda"
                type="date"
                required
                value={form.data_venda}
                onChange={(e) => setForm({ ...form, data_venda: e.target.value })}
              />
            </div>
            {registrar.error && (
              <p className="text-sm text-destructive">{registrar.error.message}</p>
            )}
            <Button type="submit" disabled={registrar.isPending}>
              {registrar.isPending ? "Registrando..." : "Registrar venda + enviar CAPI"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
