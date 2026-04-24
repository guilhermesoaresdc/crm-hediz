"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Send } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { LeadStatus } from "@/lib/supabase/types";

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "atribuido", label: "Atribuído" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "qualificado", label: "Qualificado" },
  { value: "visita_agendada", label: "Visita agendada" },
  { value: "visita_realizada", label: "Visita realizada" },
  { value: "proposta_enviada", label: "Proposta enviada" },
  { value: "negociacao", label: "Negociação" },
  { value: "vendido", label: "Vendido" },
  { value: "perdido", label: "Perdido" },
];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = api.useUtils();
  const { data: lead, isLoading } = api.lead.detalhes.useQuery({ id });

  const atualizarStatus = api.lead.atualizarStatus.useMutation({
    onSuccess: () => utils.lead.detalhes.invalidate({ id }),
  });

  const { data: mensagens } = api.mensagem.listarPorLead.useQuery(
    { lead_id: id },
    { enabled: !!id },
  );

  const enviarMsg = api.mensagem.enviar.useMutation({
    onSuccess: () => {
      utils.lead.detalhes.invalidate({ id });
      utils.mensagem.listarPorLead.invalidate({ lead_id: id });
    },
  });

  const [novaMsg, setNovaMsg] = useState("");

  if (isLoading) return <div className="p-4 sm:p-6 lg:p-8">Carregando...</div>;
  if (!lead) return <div className="p-4 sm:p-6 lg:p-8">Lead não encontrado</div>;

  const l = lead as any;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold break-words">{l.nome}</h1>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge>{l.status.replace(/_/g, " ")}</Badge>
            {l.em_bolsao && <Badge variant="warning">bolsão</Badge>}
            {l.origem && <Badge variant="outline">{l.origem}</Badge>}
          </div>
        </div>
        <Link href="/leads" className="flex-shrink-0">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Field label="WhatsApp" value={l.whatsapp} />
              <Field label="Email" value={l.email ?? "—"} />
              <Field label="CPF" value={l.cpf ?? "—"} />
              <Field label="Observações" value={l.observacoes ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atribuição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={l.status === s.value ? "default" : "outline"}
                    disabled={atualizarStatus.isPending}
                    onClick={() =>
                      atualizarStatus.mutate({ id: l.id, status: s.value as LeadStatus })
                    }
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
              {l.status === "vendido" && (
                <Link href={`/vendas/novo?lead=${l.id}`}>
                  <Button>Registrar venda + enviar CAPI Purchase</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mensagens && mensagens.length > 0 && (
                <div className="max-h-80 overflow-y-auto space-y-2 rounded-md border bg-muted/30 p-3">
                  {mensagens.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-md px-3 py-2 text-sm max-w-[85%] ${
                        m.direcao === "enviada"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-background border"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {m.conteudo || (m.template_nome ? `Template: ${m.template_nome}` : "—")}
                      </div>
                      <div
                        className={`mt-1 text-[11px] ${
                          m.direcao === "enviada"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatDate(m.created_at)}
                        {m.status_entrega && ` · ${m.status_entrega}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!l.primeira_mensagem_em && (
                <p className="text-xs text-muted-foreground">
                  Primeira mensagem: o lead sai do timer de 5min e não vai pro bolsão.
                </p>
              )}

              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={`Olá ${l.nome}, tudo bem?`}
                value={novaMsg}
                onChange={(e) => setNovaMsg(e.target.value)}
                disabled={enviarMsg.isPending}
              />

              {enviarMsg.error && (
                <p className="text-sm text-destructive">{enviarMsg.error.message}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground truncate">
                  Para: {l.whatsapp}
                </span>
                <Button
                  disabled={!novaMsg.trim() || enviarMsg.isPending}
                  onClick={() => {
                    enviarMsg.mutate(
                      { lead_id: l.id, tipo: "texto", texto: novaMsg },
                      { onSuccess: () => setNovaMsg("") },
                    );
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {enviarMsg.isPending ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {l.eventos?.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {l.eventos
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                    )
                    .map((ev: any) => (
                      <li key={ev.id} className="border-l-2 border-muted pl-3 py-1">
                        <div className="font-medium">{ev.tipo.replace(/_/g, " ")}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(ev.created_at)}
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Sem eventos.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Origem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Field label="Campanha" value={l.campanha?.nome ?? "—"} />
              <Field label="Conjunto" value={l.conjunto?.nome ?? "—"} />
              <Field label="Anúncio" value={l.anuncio?.nome ?? "—"} />
              <Field label="UTM Source" value={l.utm_source ?? "—"} />
              <Field label="UTM Campaign" value={l.utm_campaign ?? "—"} />
              <Field label="UTM Content" value={l.utm_content ?? "—"} />
              <Field label="fbclid" value={l.fbclid ?? "—"} />
              <Field label="Meta Lead ID" value={l.meta_lead_id ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Field label="Criado" value={formatDate(l.created_at)} />
              <Field label="Atribuído" value={formatDate(l.atribuido_em)} />
              <Field label="1ª mensagem" value={formatDate(l.primeira_mensagem_em)} />
              <Field label="1ª resposta" value={formatDate(l.primeira_resposta_em)} />
              <Field label="Qualificado" value={formatDate(l.qualificado_em)} />
              <Field label="Visita" value={formatDate(l.visita_agendada_em)} />
              <Field label="Proposta" value={formatDate(l.proposta_em)} />
              <Field label="Vendido" value={formatDate(l.vendido_em)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-all">{value}</span>
    </div>
  );
}
