"use client";

import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import type { LeadStatus } from "@/lib/supabase/types";

const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: "novo", label: "Novo" },
  { status: "atribuido", label: "Atribuído" },
  { status: "em_atendimento", label: "Em atendimento" },
  { status: "qualificado", label: "Qualificado" },
  { status: "visita_agendada", label: "Visita agendada" },
  { status: "proposta_enviada", label: "Proposta" },
  { status: "negociacao", label: "Negociação" },
  { status: "vendido", label: "Vendido" },
];

export default function PipelinePage() {
  const { data, isLoading } = api.lead.listar.useQuery({ page: 1, per_page: 200 });

  const porStatus = (data?.leads ?? []).reduce<Record<string, any[]>>((acc, lead) => {
    acc[lead.status] = acc[lead.status] || [];
    acc[lead.status].push(lead);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Pipeline</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {COLUMNS.map((col) => {
            const leads = porStatus[col.status] ?? [];
            return (
              <div key={col.status} className="min-w-[220px]">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium text-sm">{col.label}</div>
                  <div className="text-xs text-muted-foreground">{leads.length}</div>
                </div>
                <div className="space-y-2">
                  {leads.map((l) => (
                    <Link key={l.id} href={`/leads/${l.id}`}>
                      <Card className="p-3 hover:border-primary transition-colors cursor-pointer">
                        <div className="font-medium text-sm truncate">{l.nome}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {l.corretor?.nome ?? "Sem corretor"}
                        </div>
                        {l.campanha?.nome && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            📣 {l.campanha.nome}
                          </div>
                        )}
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
