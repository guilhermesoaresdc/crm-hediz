"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { ChevronDown, ChevronRight, Megaphone, Users, TrendingUp, Target, Archive, DollarSign, ShoppingCart, Receipt } from "lucide-react";
import { api } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/routers/_app";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

type HierarquiaOutput = inferRouterOutputs<AppRouter>["atribuicao"]["hierarquia"];
type CampanhaNode = HierarquiaOutput["hierarquia"][number];
type ConjuntoNode = CampanhaNode["filhos"][number];

type Periodo = "7d" | "15d" | "30d" | "90d" | "6m" | "custom";
type Tipo = "todos" | "formulario" | "site" | "importado";

const periodosLabel: Record<Periodo, string> = {
  "7d": "7 dias",
  "15d": "15 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  "6m": "6 meses",
  custom: "Personalizado",
};

export default function RastreamentoCampanhasPage() {
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [tipo, setTipo] = useState<Tipo>("todos");
  const [equipeIds, setEquipeIds] = useState<string[]>([]);
  const [dropdownEquipeOpen, setDropdownEquipeOpen] = useState(false);

  const { data: equipes } = api.equipe.listar.useQuery();
  const { data, isLoading } = api.atribuicao.hierarquia.useQuery({
    preset: periodo,
    tipo,
    equipe_ids: equipeIds.length > 0 ? equipeIds : undefined,
  });

  const equipesSelLabel =
    equipeIds.length === 0
      ? "Todas as equipes"
      : equipeIds.length === 1
        ? equipes?.find((e) => e.id === equipeIds[0])?.nome ?? "1 equipe"
        : `${equipeIds.length} equipes selecionadas`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Rastreamento Meta</h1>
        <p className="text-muted-foreground text-sm">
          Atribuição de ponta a ponta: do anúncio até a venda, com ROAS real (inclui fee da agência).
        </p>
      </div>

      {/* Filtros */}
      <section className="space-y-3">
        <div className="text-sm font-medium">Filtros</div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 relative">
          {/* Multi-select equipes */}
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setDropdownEquipeOpen((x) => !x)}
              className="flex w-full sm:min-w-[220px] items-center gap-2 justify-between rounded-md border border-input bg-background px-3 h-10 text-sm hover:bg-accent"
            >
              <span className="truncate">{equipesSelLabel}</span>
              <ChevronDown className="h-4 w-4 opacity-60 flex-shrink-0" />
            </button>
            {dropdownEquipeOpen && (
              <div className="absolute z-20 mt-1 w-full min-w-[220px] max-h-[50vh] overflow-y-auto rounded-md border bg-card shadow-lg p-2 space-y-1">
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={equipeIds.length === 0}
                    onChange={() => setEquipeIds([])}
                  />
                  Todas
                </label>
                {equipes?.map((e) => (
                  <label
                    key={e.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={equipeIds.includes(e.id)}
                      onChange={(ev) => {
                        setEquipeIds((curr) =>
                          ev.target.checked ? [...curr, e.id] : curr.filter((id) => id !== e.id),
                        );
                      }}
                    />
                    {e.nome}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Tipo origem */}
          <select
            className="rounded-md border border-input bg-background px-3 h-10 text-sm w-full sm:min-w-[180px] sm:w-auto"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Tipo)}
          >
            <option value="todos">Todos os tipos</option>
            <option value="formulario">Formulário (Lead Ads)</option>
            <option value="site">Site / LP</option>
            <option value="importado">Importado</option>
          </select>
        </div>

        {/* Período */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(periodosLabel) as Periodo[])
            .filter((p) => p !== "custom")
            .map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                className={cn(
                  "rounded-md px-3 h-9 text-sm border transition-colors",
                  periodo === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-accent",
                )}
              >
                {periodosLabel[p]}
              </button>
            ))}
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi icon={<Megaphone />} label="Campanhas Ativas" value={data?.kpis.campanhas_ativas ?? 0} loading={isLoading} />
        <Kpi icon={<Users />} label="Leads gerados" value={data?.kpis.leads ?? 0} loading={isLoading} />
        <Kpi icon={<TrendingUp />} label="Visitas" value={data?.kpis.visitas ?? 0} loading={isLoading} />
        <Kpi
          icon={<Target />}
          label="Taxa de Conversão"
          value={data?.kpis.taxa_conversao != null ? `${data.kpis.taxa_conversao.toFixed(2)}%` : "—"}
          loading={isLoading}
        />
        <Kpi icon={<Archive />} label="Leads Arquivados" value={data?.kpis.arquivados ?? 0} loading={isLoading} />
        <Kpi
          icon={<DollarSign />}
          label="Custo por Lead"
          value={formatCurrency(data?.kpis.custo_por_lead)}
          loading={isLoading}
        />
        <Kpi
          icon={<ShoppingCart />}
          label="Vendas"
          value={data?.kpis.vendas ?? 0}
          loading={isLoading}
          emphasize
        />
        <Kpi
          icon={<Receipt />}
          label="Faturamento"
          value={formatCurrency(data?.kpis.faturamento)}
          loading={isLoading}
          emphasize
        />
        <Kpi
          icon={<TrendingUp />}
          label="ROAS real"
          value={data?.kpis.roas_real ? `${data.kpis.roas_real.toFixed(2)}x` : "—"}
          loading={isLoading}
          emphasize
        />
      </section>

      {/* Tabela hierárquica */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Campanha</th>
                  <th className="px-3 py-3 font-medium text-right">Alcance</th>
                  <th className="px-3 py-3 font-medium text-right">Leads</th>
                  <th className="px-3 py-3 font-medium text-right">Visitas</th>
                  <th className="px-3 py-3 font-medium text-right">Taxa conv</th>
                  <th className="px-3 py-3 font-medium text-right">Arquiv.</th>
                  <th className="px-3 py-3 font-medium text-right">CPL real</th>
                  <th className="px-3 py-3 font-medium text-right">Vendas</th>
                  <th className="px-3 py-3 font-medium text-right">Faturamento</th>
                  <th className="px-3 py-3 font-medium text-right">ROAS real</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : !data?.hierarquia?.length ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      Nenhuma campanha com dados no período. Conecte Meta em Integrações
                      pra sincronizar campanhas e custos automaticamente.
                    </td>
                  </tr>
                ) : (
                  data.hierarquia.map((c) => <CampanhaRow key={c.id} campanha={c} />)
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CampanhaRow({ campanha }: { campanha: CampanhaNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-b hover:bg-accent/30 cursor-pointer" onClick={() => setOpen((x) => !x)}>
        <td className="px-4 py-3 font-medium">
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span>{campanha.nome}</span>
            {campanha.status && campanha.status !== "ACTIVE" && (
              <Badge variant="outline" className="text-xs">
                {campanha.status}
              </Badge>
            )}
          </div>
        </td>
        <MetricaCells m={campanha.metricas} />
      </tr>
      {open &&
        campanha.filhos.map((conjunto) => (
          <ConjuntoRow key={conjunto.id} conjunto={conjunto} />
        ))}
    </>
  );
}

function ConjuntoRow({ conjunto }: { conjunto: ConjuntoNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="border-b hover:bg-accent/20 cursor-pointer bg-muted/20"
        onClick={() => setOpen((x) => !x)}
      >
        <td className="px-4 py-3 pl-10">
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span>{conjunto.nome}</span>
            <Badge variant="secondary" className="text-xs">
              Formulário
            </Badge>
          </div>
        </td>
        <MetricaCells m={conjunto.metricas} />
      </tr>
      {open &&
        conjunto.filhos.map((ad) => (
          <tr key={ad.id} className="border-b hover:bg-accent/10 bg-muted/40">
            <td className="px-4 py-3 pl-16 text-muted-foreground text-sm">{ad.nome}</td>
            <MetricaCells m={ad.metricas} />
          </tr>
        ))}
    </>
  );
}

function MetricaCells({
  m,
}: {
  m: {
    leads: number;
    visitas: number;
    arquivados: number;
    vendas: number;
    faturamento: number;
    taxa_conversao: number;
    custo_por_lead: number;
    roas_real: number;
    alcance: number;
  };
}) {
  return (
    <>
      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
        {m.alcance > 0 ? m.alcance.toLocaleString("pt-BR") : "—"}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{m.leads}</td>
      <td className="px-3 py-3 text-right tabular-nums">{m.visitas}</td>
      <td className="px-3 py-3 text-right tabular-nums">
        {m.leads > 0 ? `${m.taxa_conversao.toFixed(2)}%` : "—"}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{m.arquivados}</td>
      <td className="px-3 py-3 text-right tabular-nums">
        {m.custo_por_lead > 0 ? formatCurrency(m.custo_por_lead) : "—"}
      </td>
      <td className="px-3 py-3 text-right tabular-nums font-medium">{m.vendas}</td>
      <td className="px-3 py-3 text-right tabular-nums font-medium">
        {m.faturamento > 0 ? formatCurrency(m.faturamento) : "—"}
      </td>
      <td className="px-3 py-3 text-right tabular-nums font-bold">
        {m.roas_real > 0 ? `${m.roas_real.toFixed(2)}x` : "—"}
      </td>
    </>
  );
}

function Kpi({
  icon,
  label,
  value,
  loading,
  emphasize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  loading?: boolean;
  emphasize?: boolean;
}) {
  return (
    <Card className={cn(emphasize && "border-primary")}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={cn("h-4 w-4", emphasize ? "text-primary" : "text-muted-foreground")}>
            {icon}
          </div>
        </div>
        <div className="text-2xl font-bold tabular-nums">{loading ? "..." : value}</div>
      </CardContent>
    </Card>
  );
}
