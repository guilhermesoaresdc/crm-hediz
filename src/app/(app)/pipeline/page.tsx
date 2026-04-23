"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  Search,
  Zap,
  User as UserIcon,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/routers/_app";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/supabase/types";

type PipelineOutput = inferRouterOutputs<AppRouter>["lead"]["paraPipeline"];
type Lead = PipelineOutput["leads"][number];

type Coluna = {
  status: LeadStatus;
  label: string;
  color: string;
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

export default function PipelinePage() {
  const [busca, setBusca] = useState("");
  const [corretorFiltro, setCorretorFiltro] = useState<string>("");
  const [origemFiltro, setOrigemFiltro] = useState<string>("");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const utils = api.useUtils();
  const queryInput = useMemo(
    () => ({
      corretor_id: corretorFiltro || undefined,
      origem: origemFiltro || undefined,
      busca: busca || undefined,
    }),
    [corretorFiltro, origemFiltro, busca],
  );

  const { data, isLoading, error } = api.lead.paraPipeline.useQuery(queryInput, {
    staleTime: 30_000,
  });
  const { data: corretores } = api.usuario.listar.useQuery(undefined);

  const atualizarStatus = api.lead.atualizarStatus.useMutation({
    onMutate: async (vars) => {
      await utils.lead.paraPipeline.cancel();
      const prev = utils.lead.paraPipeline.getData(queryInput);
      if (prev) {
        utils.lead.paraPipeline.setData(queryInput, {
          ...prev,
          leads: prev.leads.map((l) =>
            l.id === vars.id ? { ...l, status: vars.status } : l,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.lead.paraPipeline.setData(queryInput, ctx.prev);
    },
    onSettled: () => utils.lead.paraPipeline.invalidate(),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const leads = data?.leads ?? [];

  const porStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const col of COLUNAS) map[col.status] = [];
    for (const l of leads) {
      if (map[l.status]) map[l.status].push(l);
    }
    return map;
  }, [leads]);

  function onDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = active.id as string;
    const novoStatus = over.id as LeadStatus;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === novoStatus) return;

    // Atualiza via mutation (optimistic)
    atualizarStatus.mutate({ id: leadId, status: novoStatus });
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background px-4 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Pipeline</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {leads.length} leads ativos ·{" "}
              <span className="text-primary hidden sm:inline">
                Arraste os cards pra mudar status
              </span>
              <span className="text-primary sm:hidden">Deslize pra ver mais</span>
            </p>
          </div>
          <Link
            href="/leads/novo"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 sm:px-4 h-10 text-sm font-medium hover:bg-primary/90 flex-shrink-0"
          >
            <span className="hidden sm:inline">+ Novo lead</span>
            <span className="sm:hidden">+ Novo</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <div className="relative flex-1 sm:min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, WhatsApp ou campanha"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <select
              value={corretorFiltro}
              onChange={(e) => setCorretorFiltro(e.target.value)}
              className="rounded-md border border-input bg-background px-3 h-10 text-sm sm:min-w-[180px] min-w-0"
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
              className="rounded-md border border-input bg-background px-3 h-10 text-sm sm:min-w-[160px] min-w-0"
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
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 sm:p-4 bg-muted/30">
        {error ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 text-destructive p-4 max-w-xl">
            <div className="font-semibold mb-1">Falha ao carregar leads</div>
            <div className="text-sm">{error.message}</div>
          </div>
        ) : isLoading ? (
          <div className="flex gap-3 h-full">
            {COLUNAS.map((col) => (
              <div
                key={col.status}
                className="w-[260px] sm:w-[300px] flex-shrink-0 bg-card rounded-lg border animate-pulse h-full"
              />
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-3 h-full min-h-[500px]">
              {COLUNAS.map((col) => (
                <KanbanColumn
                  key={col.status}
                  coluna={col}
                  leads={porStatus[col.status] ?? []}
                />
              ))}
            </div>
            <DragOverlay>
              {activeLead && <KanbanCard lead={activeLead} dragging />}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ coluna, leads }: { coluna: Coluna; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-[260px] sm:w-[300px] flex-shrink-0 bg-card rounded-lg border shadow-sm transition-colors",
        isOver && "ring-2 ring-primary bg-primary/5",
      )}
    >
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
            Solte aqui
          </div>
        ) : (
          leads.map((lead) => <DraggableCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  );
}

function DraggableCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-30")}
    >
      <KanbanCard lead={lead} />
    </div>
  );
}

function KanbanCard({ lead, dragging }: { lead: Lead; dragging?: boolean }) {
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

  const Content = (
    <Card
      className={cn(
        "border-l-4 p-3 transition-all select-none",
        corOrigemBorda(lead.origem),
        dragging
          ? "shadow-2xl rotate-2 cursor-grabbing"
          : "hover:shadow-md hover:border-primary/50 cursor-grab",
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
              Sem resposta há {minutosDesdeAtribuido}min — risco de bolsão
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
      <Link
        href={`/leads/${lead.id}`}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 block text-xs text-primary hover:underline text-center"
      >
        Abrir detalhes
      </Link>
    </Card>
  );

  return Content;
}
