"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Inbox,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function WebhookDebugPage() {
  const utils = api.useUtils();
  const [copiedPayload, setCopiedPayload] = useState<string | null>(null);

  const { data: stats, isLoading: loadingStats } =
    api.webhookDebug.stats.useQuery(undefined, {
      refetchInterval: 5_000,
    });

  const { data: logs, isLoading: loadingLogs } =
    api.webhookDebug.listarLogs.useQuery(
      { source: "whatsapp", limit: 30 },
      { refetchInterval: 5_000 },
    );

  function refresh() {
    utils.webhookDebug.stats.invalidate();
    utils.webhookDebug.listarLogs.invalidate();
  }

  function copyPayload(id: string, payload: unknown) {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(id);
    setTimeout(() => setCopiedPayload(null), 1500);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link
          href="/integracoes"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Integrações
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Debug de Webhooks</h1>
          <p className="text-muted-foreground text-sm">
            Diagnóstico pra ver o que a Meta tá mandando pro seu endpoint.
          </p>
        </div>
        <Button onClick={refresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </div>

      {/* Diagnóstico rápido */}
      {!loadingStats && stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard
            label="Últimas 24h"
            value={stats.whatsapp_logs_24h.toString()}
            sub="webhooks recebidos"
            ok={stats.whatsapp_logs_24h > 0}
          />
          <StatCard
            label="Última hora"
            value={stats.whatsapp_logs_1h.toString()}
            sub="webhooks recebidos"
            ok={stats.whatsapp_logs_1h > 0}
          />
          <StatCard
            label="Canais"
            value={stats.canais.length.toString()}
            sub="WhatsApp cadastrados"
            ok={stats.canais.length > 0}
          />
          <StatCard
            label="Última mensagem recebida"
            value={
              stats.ultima_mensagem_recebida
                ? formatDate(stats.ultima_mensagem_recebida.created_at)
                : "—"
            }
            sub={
              stats.ultima_mensagem_recebida
                ? (stats.ultima_mensagem_recebida.conteudo ?? "").slice(0, 30)
                : "nenhuma ainda"
            }
            ok={!!stats.ultima_mensagem_recebida}
          />
        </div>
      )}

      {/* Diagnóstico do que pode estar errado */}
      {!loadingStats && stats && stats.whatsapp_logs_24h === 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">
                  Nenhum webhook recebido nas últimas 24h
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  A Meta ainda não bateu no seu endpoint. Provavelmente é uma dessas:
                </div>
              </div>
            </div>
            <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
              <li>
                <strong>Callback URL</strong> não foi verificada com sucesso (botão
                "Verificar e salvar" não apareceu verde)
              </li>
              <li>
                Campo <code className="text-xs bg-muted px-1 rounded">messages</code>{" "}
                não está com o toggle ligado em "Assinar"
              </li>
              <li>
                <strong>WHATSAPP_VERIFY_TOKEN</strong> na Vercel não bate com o que
                você colocou na Meta
              </li>
              <li>
                A WABA não está com este app como "subscrito" (acontece quando o
                número foi adicionado via outra via)
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Canais ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Canais WhatsApp cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.canais?.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhum canal cadastrado. Cadastre um em /ferramentas-chat/canais.
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.canais.map((c: any) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-md border text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.nome}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {c.whatsapp_phone_display} · ID {c.whatsapp_phone_number_id}
                    </div>
                  </div>
                  <Badge variant={c.ativo ? "success" : "secondary"}>
                    {c.ativo ? "ativo" : "inativo"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            O <code className="text-[10px] bg-muted px-1 rounded">phone_number_id</code>{" "}
            no webhook tem que bater com um desses acima pra a mensagem ser processada.
          </p>
        </CardContent>
      </Card>

      {/* Logs brutos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Últimas {logs?.length ?? 0} requisições da Meta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : !logs?.length ? (
            <div className="text-center py-8 space-y-2">
              <Inbox className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-sm text-muted-foreground">
                Nenhum webhook recebido ainda.
              </p>
              <p className="text-xs text-muted-foreground">
                Manda uma mensagem pro seu WhatsApp cadastrado de outro celular.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {logs.map((log: any) => (
                <li key={log.id} className="rounded-md border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/30 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{formatDate(log.created_at)}</span>
                      {log.processado ? (
                        <Badge variant="success" className="text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                          processado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          recebido
                        </Badge>
                      )}
                      {log.erro && (
                        <Badge variant="destructive" className="text-[10px]">
                          <XCircle className="h-3 w-3 mr-0.5" />
                          erro
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {resumirPayload(log.payload_raw)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px]"
                      onClick={() => copyPayload(log.id, log.payload_raw)}
                    >
                      {copiedPayload === log.id ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedPayload === log.id ? "Copiado" : "Copiar JSON"}
                    </Button>
                  </div>
                  <pre className="text-[11px] bg-background p-3 overflow-x-auto max-h-40 font-mono">
                    {JSON.stringify(log.payload_raw, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  ok,
}: {
  label: string;
  value: string;
  sub: string;
  ok: boolean;
}) {
  return (
    <Card className={ok ? "border-success/40" : undefined}>
      <CardContent className="pt-5">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          {ok ? (
            <CheckCircle2 className="h-3 w-3 text-success" />
          ) : (
            <XCircle className="h-3 w-3 text-muted-foreground" />
          )}
          {label}
        </div>
        <div className="text-xl font-bold mt-1">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function resumirPayload(payload: any): string {
  try {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const field = change?.field;

    if (field === "messages") {
      const numMsgs = value?.messages?.length ?? 0;
      const numStatuses = value?.statuses?.length ?? 0;
      const phoneId = value?.metadata?.phone_number_id;
      const from = value?.messages?.[0]?.from;
      const body = value?.messages?.[0]?.text?.body?.slice(0, 50);

      if (numMsgs > 0) {
        return `📩 ${numMsgs} msg de ${from}${body ? `: "${body}"` : ""} (phone_id: ${phoneId})`;
      }
      if (numStatuses > 0) {
        const status = value.statuses[0].status;
        return `📊 ${numStatuses} status: ${status}`;
      }
      return `field: ${field}`;
    }
    return `field: ${field ?? "?"}`;
  } catch {
    return "—";
  }
}
