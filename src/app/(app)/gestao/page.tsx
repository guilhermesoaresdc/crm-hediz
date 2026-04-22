"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingDown,
  Trophy,
  Megaphone,
  Clock,
  ThumbsUp,
  Medal,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Periodo = "7d" | "15d" | "30d" | "90d" | "6m";

const periodosLabel: Record<Periodo, string> = {
  "7d": "Últimos 7 dias",
  "15d": "Últimos 15 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  "6m": "Últimos 6 meses",
};

function formatTempo(seg: number | null | undefined): string {
  if (seg == null) return "—";
  if (seg < 60) return `${Math.round(seg)}s`;
  const min = Math.round(seg / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}min`;
}

const medalhaCor = ["text-yellow-500", "text-slate-400", "text-amber-700"];

export default function GestaoPage() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [equipeIds, setEquipeIds] = useState<string[]>([]);

  const { data: equipes } = api.equipe.listar.useQuery();
  const { data, isLoading } = api.gestao.resumo.useQuery({
    preset: periodo,
    equipe_ids: equipeIds.length > 0 ? equipeIds : undefined,
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pronto para melhorar sua gestão?</h1>
        <p className="text-muted-foreground">Insights da sua equipe em tempo real</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-md border border-input bg-background px-3 h-10 text-sm min-w-[200px]"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
            >
              {(Object.keys(periodosLabel) as Periodo[]).map((p) => (
                <option key={p} value={p}>
                  {periodosLabel[p]}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-input bg-background px-3 h-10 text-sm min-w-[220px]"
              value={equipeIds.length === 1 ? equipeIds[0] : ""}
              onChange={(e) => setEquipeIds(e.target.value ? [e.target.value] : [])}
            >
              <option value="">Todas as equipes</option>
              {equipes?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Usuários com mais leads sem resposta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Usuários com mais leads sem resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !data?.corretores_sem_resposta?.length ? (
              <p className="text-sm text-muted-foreground">
                🎉 Parabéns! Ninguém da sua equipe está com leads sem resposta no período.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.corretores_sem_resposta.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <Medal className={cn("h-5 w-5", medalhaCor[i] ?? "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.nome}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-destructive">
                        {c.leads_sem_resposta}
                      </div>
                      <div className="text-xs text-muted-foreground">sem resposta</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Usuários com resposta mais rápida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Usuários com resposta mais rápida
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !data?.corretores_resposta_rapida?.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhum lead respondido no período ainda.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.corretores_resposta_rapida.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <Medal className={cn("h-5 w-5", medalhaCor[i] ?? "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.leads_respondidos} lead{c.leads_respondidos > 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatTempo(c.tempo_medio_seg)}
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Parabenizar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Campanhas com mais leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-primary" />
              Campanhas com mais leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !data?.campanhas_mais_leads?.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma campanha com leads no período. Conecte Meta em Configurações.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.campanhas_mais_leads.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <Medal className={cn("h-5 w-5", medalhaCor[i] ?? "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.nome}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{c.total_leads}</div>
                      <div className="text-xs text-muted-foreground">leads</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Funil */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Acompanhamento (Funil)</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.funil && data.funil.length > 0 ? (
              <div className="space-y-3">
                {data.funil.map((stage, i) => {
                  const colors = [
                    "from-red-400 to-red-500",
                    "from-orange-400 to-orange-500",
                    "from-amber-400 to-amber-500",
                    "from-yellow-400 to-yellow-500",
                    "from-lime-400 to-lime-500",
                    "from-green-500 to-green-600",
                  ];
                  return (
                    <div key={stage.label} className="flex items-center gap-3">
                      <div className="w-40 text-sm text-muted-foreground flex-shrink-0">
                        {stage.label}
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded overflow-hidden relative">
                        <div
                          className={cn(
                            "h-full bg-gradient-to-r flex items-center px-3",
                            colors[i] ?? "from-primary to-primary",
                          )}
                          style={{ width: `${Math.max(stage.pct, 3)}%` }}
                        >
                          <span className="text-xs font-bold text-white">
                            {stage.count} ({stage.pct.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            )}
          </CardContent>
        </Card>

        {/* Tempo médio de resposta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Informações gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-5xl font-bold text-primary">
                {formatTempo(data?.kpis.tempo_medio_resposta_seg)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">Tempo médio de resposta</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-center">
              <div className="p-3 bg-muted/50 rounded">
                <div className="text-2xl font-bold">{data?.kpis.total_leads ?? 0}</div>
                <div className="text-xs text-muted-foreground">Leads totais</div>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <div className="text-2xl font-bold">
                  {data?.kpis.taxa_resposta != null
                    ? `${data.kpis.taxa_resposta.toFixed(0)}%`
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Taxa resposta</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Link href="/pipeline" className="text-sm text-primary hover:underline">
                Ver funil completo →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
