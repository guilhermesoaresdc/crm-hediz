"use client";

import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function CampanhasPage() {
  const { data, isLoading } = api.dashboard.performanceCampanhas.useQuery();

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">Campanhas</h1>
      <p className="text-muted-foreground text-sm">
        ROAS real por campanha — custo de mídia + fee agência vs faturamento.
      </p>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !data?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma campanha sincronizada. Conecte Meta em Configurações.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left border-b">
                  <th className="py-2">Campanha</th>
                  <th className="py-2 text-right">Leads</th>
                  <th className="py-2 text-right">Vendas</th>
                  <th className="py-2 text-right">Faturamento</th>
                  <th className="py-2 text-right">Custo mídia</th>
                  <th className="py-2 text-right">Fee agência</th>
                  <th className="py-2 text-right">CPL real</th>
                  <th className="py-2 text-right">Custo/venda</th>
                  <th className="py-2 text-right">ROAS real</th>
                </tr>
              </thead>
              <tbody>
                {data
                  .sort((a, b) => (b.roas_real ?? 0) - (a.roas_real ?? 0))
                  .map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-3 font-medium max-w-[240px] truncate">{c.nome}</td>
                      <td className="py-3 text-right">{c.leads}</td>
                      <td className="py-3 text-right">{c.vendas}</td>
                      <td className="py-3 text-right">{formatCurrency(c.faturamento)}</td>
                      <td className="py-3 text-right">{formatCurrency(c.gasto_midia)}</td>
                      <td className="py-3 text-right">{formatCurrency(c.fee_agencia)}</td>
                      <td className="py-3 text-right">{c.cpl_real != null ? formatCurrency(c.cpl_real) : "—"}</td>
                      <td className="py-3 text-right">
                        {c.custo_por_venda != null ? formatCurrency(c.custo_por_venda) : "—"}
                      </td>
                      <td className="py-3 text-right font-bold">
                        {c.roas_real != null ? `${c.roas_real}x` : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
