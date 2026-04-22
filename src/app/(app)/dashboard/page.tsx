"use client";

import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const kpis = api.dashboard.kpis.useQuery();
  const funil = api.dashboard.funil.useQuery();
  const campanhas = api.dashboard.performanceCampanhas.useQuery();
  const corretores = api.dashboard.performanceCorretores.useQuery();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Leads" value={kpis.data?.leads ?? 0} loading={kpis.isLoading} />
        <KpiCard label="Vendas" value={kpis.data?.vendas ?? 0} loading={kpis.isLoading} />
        <KpiCard
          label="Faturamento"
          value={formatCurrency(kpis.data?.faturamento)}
          loading={kpis.isLoading}
        />
        <KpiCard
          label="ROAS real"
          value={kpis.data?.roas_real ? `${kpis.data.roas_real}x` : "—"}
          loading={kpis.isLoading}
          emphasize
        />
        <KpiCard label="Custo mídia" value={formatCurrency(kpis.data?.custo_midia)} loading={kpis.isLoading} />
        <KpiCard label="Fee agência" value={formatCurrency(kpis.data?.fee_agencia)} loading={kpis.isLoading} />
        <KpiCard label="CPL real" value={formatCurrency(kpis.data?.cpl)} loading={kpis.isLoading} />
        <KpiCard
          label="Bolsão agora"
          value={kpis.data?.leads_bolsao_agora ?? 0}
          loading={kpis.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funil</CardTitle>
        </CardHeader>
        <CardContent>
          {funil.data ? (
            <div className="space-y-2">
              <FunilRow label="Leads" value={funil.data.total} max={funil.data.total} />
              <FunilRow
                label="Primeira mensagem enviada"
                value={funil.data.primeira_msg}
                max={funil.data.total}
              />
              <FunilRow label="Responderam" value={funil.data.respondeu} max={funil.data.total} />
              <FunilRow
                label="Visita agendada"
                value={funil.data.visita_agendada}
                max={funil.data.total}
              />
              <FunilRow
                label="Visita realizada"
                value={funil.data.visita_realizada}
                max={funil.data.total}
              />
              <FunilRow label="Proposta" value={funil.data.proposta} max={funil.data.total} />
              <FunilRow label="Vendidos" value={funil.data.vendido} max={funil.data.total} />
            </div>
          ) : (
            <p className="text-muted-foreground">Carregando...</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campanhas (ROAS real)</CardTitle>
          </CardHeader>
          <CardContent>
            {campanhas.data && campanhas.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="text-left">
                      <th className="pb-2">Campanha</th>
                      <th className="pb-2">Leads</th>
                      <th className="pb-2">Vendas</th>
                      <th className="pb-2">Gasto</th>
                      <th className="pb-2">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campanhas.data
                      .sort((a, b) => (b.roas_real ?? 0) - (a.roas_real ?? 0))
                      .slice(0, 10)
                      .map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="py-2 truncate max-w-[200px]">{c.nome}</td>
                          <td className="py-2">{c.leads}</td>
                          <td className="py-2">{c.vendas}</td>
                          <td className="py-2">{formatCurrency(c.gasto_total)}</td>
                          <td className="py-2">{c.roas_real != null ? `${c.roas_real}x` : "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhuma campanha com dados no período. Conecte sua conta Meta em Configurações.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance corretores</CardTitle>
          </CardHeader>
          <CardContent>
            {corretores.data && corretores.data.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="pb-2">Corretor</th>
                    <th className="pb-2">Leads</th>
                    <th className="pb-2">Vendas</th>
                    <th className="pb-2">Conv%</th>
                  </tr>
                </thead>
                <tbody>
                  {corretores.data
                    .sort((a, b) => b.total_vendas - a.total_vendas)
                    .slice(0, 10)
                    .map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="py-2">{c.nome}</td>
                        <td className="py-2">{c.total_leads}</td>
                        <td className="py-2">{c.total_vendas}</td>
                        <td className="py-2">{c.taxa_conversao}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum corretor com leads no período.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  loading,
  emphasize,
}: {
  label: string;
  value: string | number;
  loading?: boolean;
  emphasize?: boolean;
}) {
  return (
    <Card className={emphasize ? "border-primary" : undefined}>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold mt-1">{loading ? "..." : value}</div>
      </CardContent>
    </Card>
  );
}

function FunilRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
