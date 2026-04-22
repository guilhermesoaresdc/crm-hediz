"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  MoreVertical,
  Search,
  Zap,
  User as UserIcon,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/supabase/types";

type Coluna = {
  status: LeadStatus;
  label: string;
  color: string; // classes tailwind
  accent: string;
};

const COLUNAS: Coluna[] = [
  { status: "novo", label: "Novo", color: "bg-slate-500", accent: "border-t-slate-500" },
  { status: "atribuido", label: "Atribuído", color: "bg-blue-500", accent: "border-t-blue-500" },
  { status: "em_atendimento", label: "Em atendimento", color: "bg-indigo-500", accent: "border-t-indigo-500" },
  { status: "qualificado", label: "Qualificado", color: "bg-cyan-500", accent: "border-t-cyan-500" },
  { status: "visita_agendada", label: "Visita agendada", color: "bg-violet-500", accent: "border-t-violet-500" },
  { status: "visita_realizada", label: "Visita realizada", color: "bg-purple-500", accent: "border-t-purple-500" },
  { status: "proposta_enviada", label: "Proposta", color: "bg-fuchsia-500", accent: "border-t-fuchsia-500" },
  { status: "negociacao", label: "Negociação", color: "bg-orange-500", accent: "border-t-orange-500" },
  { status: "vendido", label: "Vendido", color: "bg-green-500", accent: "border-t-green-500" },
];

function tempoDesde(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function corOrigemBorda(origem: string | null) {
  if (origem === "meta_form") return "border-l-blue-500";
  if (origem === "meta_site") return "border-l-emerald-500";
  if (origem === "whatsapp_direto") return "border-l-green-500";
  if (origem === "indicacao") return "border-l-purple-500";
  return "border-l-slate-300";
}

type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  status: LeadStatus;
  origem: string | null;
  em_bolsao: boolean;
  created_at: string;
  atribuido_em: string | null;
  primeira_mensagem_em: string | null;
  corretor: { id: string; nome: string; avatar_url: string | null } | null;
  campanha: { id: string; nome: string } | null;
};

export default function PipelinePage() {
  const [busca, setBusca] = useState("");
  const [corretorFiltro, setCorretorFiltro] = useState<string>("");
  const [origemFiltro, setOrigemFiltro] = useState<string>("");

  const { data, isLoading } = api.lead.listar.useQuery({ page: 1, per_page: 500 });
  const { data: corretores } = api.usuario.listar.useQuery(undefined);

  const leadsFiltrados = useMemo(() => {
    const list = ((data?.leads ?? []) as unknown) as Lead[];
    return list.filter((l) => {
      if (busca) {
        const s = busca.toLowerCase();
        if (
          !l.nome.toLowerCase().includes(s) &&
          !(l.whatsapp ?? "").includes(s) &&
          !(l.campanha?.nome ?? "").toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      if (corretorFiltro && l.corretor?.id !== corretorFiltro) return false;
      if (origemFiltro && l.origem !== origemFiltro) return false;
      return true;
    });
  }, [data?.leads, busca, corretorFiltro, origemFiltro]);

  const porStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const col of COLUNAS) map[col.status] = [];
    for (const l of leadsFiltrados) {
      if (map[l.status]) map[l.status].push(l);
    }
    return map;
  }, [leadsFiltrados]);

  const perdidos = leadsFiltrados.filter((l) => l.status === "perdido" || l.status === "descartado");

  return (
    <div className="h-full flex flex-col">
      {/* Header fixo */}
      <div className="border-b bg-background px-8 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              {leadsFiltrados.length} leads ativos · {perdidos.length} perdidos/descartados
            </p>
          </div>
          <Link
            href="/leads/novo"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-10 text-sm font-medium hover:bg-primary/90"
          >
            + Novo lead
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, WhatsApp ou campanha"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={corretorFiltro}
            onChange={(e) => setCorretorFiltro(e.target.value)}
            className="rounded-md border border-input bg-background px-3 h-10 text-sm min-w-[180px]"
          >
            <option value="">Todos corretores</option>
            {corretores?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            value={origemFiltro}
            onChange={(e) => setOrigemFiltro(e.target.value)}
            className="rounded-md border border-input bg-background px-3 h-10 text-sm min-w-[160px]"
          >
            <option value="">Todas origens</option>
            <option value="meta_form">Meta Formulário</option>
            <option value="meta_site">Site / LP</option>
            <option value="whatsapp_direto">WhatsApp direto</option>
            <option value="indicacao">Indicação</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {/* Board horizontal scrollable */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-muted/30">
        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="flex gap-3 h-full min-h-[500px]">
            {COLUNAS.map((col) => (
              <KanbanColumn
                key={col.status}
                coluna={col}
                leads={porStatus[col.status] ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ coluna, leads }: { coluna: Coluna; leads: Lead[] }) {
  return (
    <div className="flex flex-col w-[300px] flex-shrink-0 bg-card rounded-lg border shadow-sm">
      <div className={cn("px-3 py-3 border-b border-t-4 rounded-t-lg", coluna.accent)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", coluna.color)} />
            <span className="font-semibold text-sm">{coluna.label}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {leads.length}
          </Badge>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {leads.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            Nenhum lead
          </div>
        ) : (
          leads.map((lead) => <KanbanCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  );
}

function KanbanCard({ lead }: { lead: Lead }) {
  // SLA: se atribuído mas sem primeira mensagem, calcular tempo desde atribuição
  const atribuidoMs = lead.atribuido_em ? new Date(lead.atribuido_em).getTime() : null;
  const semResposta = !!atribuidoMs && !lead.primeira_mensagem_em;
  const minutosDesdeAtribuido = atribuidoMs
    ? Math.floor((Date.now() - atribuidoMs) / 60000)
    : 0;
  const slaEstado: "ok" | "alerta" | "critico" | null = semResposta
    ? minutosDesdeAtribuido >= 5
      ? "critico"
      : minutosDesdeAtribuido >= 3
        ? "alerta"
        : "ok"
    : null;

  return (
    <Link href={`/leads/${lead.id}`}>
      <Card
        className={cn(
          "border-l-4 p-3 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group",
          corOrigemBorda(lead.origem),
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{lead.nome}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">
              {lead.whatsapp}
            </div>
          </div>
          {lead.em_bolsao && (
            <Badge variant="warning" className="text-[10px] px-1.5 py-0 gap-1 flex-shrink-0">
              <Zap className="h-3 w-3" />
              bolsão
            </Badge>
          )}
        </div>

        {lead.campanha?.nome && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground truncate">
            <Megaphone className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.campanha.nome}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground min-w-0">
            <UserIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.corretor?.nome ?? "Sem corretor"}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
            <Clock className="h-3 w-3" />
            {tempoDesde(lead.created_at)}
          </div>
        </div>

        {/* SLA badge */}
        {slaEstado && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1 text-xs rounded px-2 py-1",
              slaEstado === "critico" && "bg-destructive/10 text-destructive",
              slaEstado === "alerta" && "bg-yellow-500/10 text-yellow-700",
              slaEstado === "ok" && "bg-muted text-muted-foreground",
            )}
          >
            {slaEstado === "critico" ? (
              <>
                <Flame className="h-3 w-3" />
                Sem resposta há {minutosDesdeAtribuido}min — risco de ir pro bolsão
              </>
            ) : slaEstado === "alerta" ? (
              <>
                <AlertCircle className="h-3 w-3" />
                Responder em {Math.max(0, 5 - minutosDesdeAtribuido)}min
              </>
            ) : (
              <>
                <MessageCircle className="h-3 w-3" />
                Responder em {Math.max(0, 5 - minutosDesdeAtribuido)}min
              </>
            )}
          </div>
        )}
        {lead.primeira_mensagem_em && (
          <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Respondido
          </div>
        )}
      </Card>
    </Link>
  );
}
