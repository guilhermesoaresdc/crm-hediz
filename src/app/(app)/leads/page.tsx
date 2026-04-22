"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Plus, Search } from "lucide-react";

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  novo: "secondary",
  atribuido: "default",
  em_atendimento: "default",
  qualificado: "warning",
  visita_agendada: "warning",
  visita_realizada: "warning",
  proposta_enviada: "warning",
  negociacao: "warning",
  vendido: "success",
  perdido: "destructive",
  descartado: "destructive",
};

export default function LeadsPage() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string | undefined>();

  const { data, isLoading } = api.lead.listar.useQuery({
    busca: busca || undefined,
    status: status as never,
    page: 1,
    per_page: 50,
  });

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            {data ? `${data.total} leads` : "Carregando..."}
          </p>
        </div>
        <Link href="/leads/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo lead
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, WhatsApp ou email"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="rounded-md border border-input bg-background px-3 text-sm"
              value={status ?? ""}
              onChange={(e) => setStatus(e.target.value || undefined)}
            >
              <option value="">Todos os status</option>
              <option value="novo">Novo</option>
              <option value="atribuido">Atribuído</option>
              <option value="em_atendimento">Em atendimento</option>
              <option value="qualificado">Qualificado</option>
              <option value="visita_agendada">Visita agendada</option>
              <option value="visita_realizada">Visita realizada</option>
              <option value="proposta_enviada">Proposta enviada</option>
              <option value="negociacao">Negociação</option>
              <option value="vendido">Vendido</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : !data?.leads.length ? (
            <p className="text-muted-foreground text-center py-8">Nenhum lead encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">Nome</th>
                    <th className="py-2">WhatsApp</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Corretor</th>
                    <th className="py-2">Origem</th>
                    <th className="py-2">Criado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((lead: any) => (
                    <tr
                      key={lead.id}
                      className="border-b hover:bg-accent cursor-pointer"
                      onClick={() => (window.location.href = `/leads/${lead.id}`)}
                    >
                      <td className="py-3 font-medium">
                        <Link href={`/leads/${lead.id}`} className="hover:underline">
                          {lead.nome}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground">{lead.whatsapp}</td>
                      <td className="py-3">
                        <Badge variant={statusColors[lead.status] ?? "default"}>
                          {lead.status.replace(/_/g, " ")}
                        </Badge>
                        {lead.em_bolsao && (
                          <Badge variant="warning" className="ml-1">
                            bolsão
                          </Badge>
                        )}
                      </td>
                      <td className="py-3">{lead.corretor?.nome ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">
                        {lead.campanha?.nome ?? lead.origem ?? "—"}
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDate(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
