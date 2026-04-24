"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Send, AlertCircle, FileText, MessageCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
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
    { enabled: !!id, refetchInterval: 5_000 },
  );


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

          <WhatsAppCard
            leadId={l.id}
            leadNome={l.nome}
            whatsapp={l.whatsapp}
            mensagens={mensagens ?? []}
          />

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

function WhatsAppCard({
  leadId,
  leadNome,
  whatsapp,
  mensagens,
}: {
  leadId: string;
  leadNome: string;
  whatsapp: string;
  mensagens: any[];
}) {
  const utils = api.useUtils();
  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState<"texto" | "template">("texto");
  const [templateId, setTemplateId] = useState<string>("");

  const { data: templates } = api.template.listar.useQuery();
  const templatesAprovados = (templates ?? []).filter(
    (t: any) => t.status === "APPROVED",
  );

  const enviar = api.mensagem.enviar.useMutation({
    onSuccess: () => {
      utils.mensagem.listarPorLead.invalidate({ lead_id: leadId });
      utils.lead.detalhes.invalidate({ id: leadId });
    },
  });

  // Janela de 24h
  const ultimaRecebida = mensagens
    .filter((m) => m.direcao === "recebida")
    .slice(-1)[0];
  const dentroJanela24h = ultimaRecebida
    ? Date.now() - new Date(ultimaRecebida.created_at).getTime() <
      24 * 60 * 60 * 1000
    : false;

  function onEnviar() {
    if (modo === "texto") {
      if (!texto.trim()) return;
      enviar.mutate(
        { lead_id: leadId, tipo: "texto", texto },
        { onSuccess: () => setTexto("") },
      );
    } else {
      const tpl = templatesAprovados.find((t: any) => t.id === templateId);
      if (!tpl) return;
      enviar.mutate(
        {
          lead_id: leadId,
          tipo: "template",
          template_nome: tpl.nome,
          template_idioma: tpl.idioma ?? "pt_BR",
        },
        { onSuccess: () => setTemplateId("") },
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            WhatsApp
          </CardTitle>
          <Link href="/atendimento">
            <Button size="sm" variant="ghost" className="text-xs">
              Abrir no Atendimento
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mensagens.length > 0 ? (
          <div className="max-h-96 overflow-y-auto space-y-2 rounded-md border bg-muted/20 p-3">
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.direcao === "enviada" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-md px-3 py-2 text-sm max-w-[85%]",
                    m.direcao === "enviada"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border",
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {m.conteudo ||
                      (m.template_nome ? `📋 Template: ${m.template_nome}` : "—")}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-[11px]",
                      m.direcao === "enviada"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatDate(m.created_at)}
                    {m.status_entrega && ` · ${m.status_entrega}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground py-3">
            Nenhuma mensagem ainda.
          </div>
        )}

        {!dentroJanela24h && (
          <div className="flex items-start gap-2 text-xs bg-warning/10 text-warning border border-warning/20 rounded-md p-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Fora da janela de 24h.</strong> WhatsApp oficial só permite
              texto livre depois que o cliente responde. Use um template aprovado
              pra iniciar o contato.
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setModo("texto")}
            className={cn(
              "px-2 py-1 rounded transition-colors",
              modo === "texto"
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            Texto livre
          </button>
          <button
            onClick={() => setModo("template")}
            className={cn(
              "px-2 py-1 rounded transition-colors inline-flex items-center gap-1",
              modo === "template"
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <FileText className="h-3 w-3" />
            Template ({templatesAprovados.length})
          </button>
        </div>

        {modo === "texto" ? (
          <div className="flex gap-2 items-end">
            <textarea
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none min-h-[60px]"
              placeholder={
                dentroJanela24h
                  ? `Olá ${leadNome}, tudo bem?`
                  : "Cliente fora da janela de 24h — use um template."
              }
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onEnviar();
                }
              }}
              disabled={enviar.isPending}
            />
            <Button
              disabled={!texto.trim() || enviar.isPending}
              onClick={onEnviar}
              size="sm"
              className="h-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione um template aprovado...</option>
              {templatesAprovados.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.idioma})
                </option>
              ))}
            </select>
            <Button
              onClick={onEnviar}
              disabled={!templateId || enviar.isPending}
              size="sm"
              className="h-10"
            >
              <Send className="h-4 w-4 mr-1" />
              Enviar
            </Button>
          </div>
        )}

        {modo === "template" && templatesAprovados.length === 0 && (
          <div className="text-xs text-muted-foreground">
            Nenhum template aprovado.{" "}
            <Link
              href="/ferramentas-chat/modelos/novo"
              className="text-primary hover:underline"
            >
              Criar agora →
            </Link>
          </div>
        )}

        {enviar.error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1">
            {enviar.error.message}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Para: <span className="font-mono">{whatsapp}</span>
        </div>
      </CardContent>
    </Card>
  );
}
