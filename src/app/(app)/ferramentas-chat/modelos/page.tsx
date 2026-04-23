"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  FileText,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ModelosPage() {
  const utils = api.useUtils();
  const { data: canais } = api.canal.listar.useQuery();
  const [canalSelecionado, setCanalSelecionado] = useState<string>("");

  const canalId = canalSelecionado || canais?.[0]?.id || undefined;

  const { data: templates, isLoading } = api.template.listar.useQuery(
    canalId ? { canal_id: canalId } : undefined,
    { enabled: !!canais?.length },
  );

  const sincronizar = api.canal.sincronizarTemplates.useMutation({
    onSuccess: () => utils.template.listar.invalidate(),
  });

  const deletar = api.template.deletar.useMutation({
    onSuccess: () => utils.template.listar.invalidate(),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Modelos</h1>
          <p className="text-muted-foreground text-sm">
            Templates aprovados pelo Meta — use pra iniciar conversas com leads
          </p>
        </div>
        <div className="flex gap-2">
          {canalId && (
            <Button
              variant="outline"
              onClick={() => sincronizar.mutate({ canal_id: canalId })}
              disabled={sincronizar.isPending}
            >
              {sincronizar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar do Meta
            </Button>
          )}
          <Link href="/ferramentas-chat/modelos/novo">
            <Button disabled={!canais?.length}>
              <Plus className="h-4 w-4" />
              Novo modelo
            </Button>
          </Link>
        </div>
      </div>

      {!canais?.length ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
            <div>
              <div className="font-semibold">Conecte um canal primeiro</div>
              <div className="text-sm text-muted-foreground mt-1">
                Templates são vinculados a uma WABA. Conecte seu primeiro canal
                WhatsApp pra ver e sincronizar os templates aprovados.
              </div>
            </div>
            <Link href="/ferramentas-chat/canais">
              <Button>Ir pra Canais</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Seletor de canal */}
          {canais.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {canais.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCanalSelecionado(c.id)}
                  className={cn(
                    "rounded-md px-3 h-9 text-sm border transition-colors",
                    canalId === c.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input hover:bg-accent",
                  )}
                >
                  {c.nome}{" "}
                  <span className="opacity-70">({c.whatsapp_phone_display})</span>
                </button>
              ))}
            </div>
          )}

          {sincronizar.data && (
            <div className="rounded-md bg-success/10 border border-success/20 p-3 text-sm text-success">
              ✓ {sincronizar.data.saved} de {sincronizar.data.total} templates
              sincronizados.
            </div>
          )}
          {sincronizar.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {sincronizar.error.message}
            </div>
          )}

          {isLoading ? (
            <p className="text-muted-foreground">Carregando templates...</p>
          ) : !templates?.length ? (
            <Card>
              <CardContent className="pt-10 pb-10 text-center space-y-3">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                <div>
                  <div className="font-semibold">Nenhum template sincronizado</div>
                  <div className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Clique em "Sincronizar do Meta" pra trazer os templates aprovados.
                    Pra criar novos templates, use o{" "}
                    <a
                      href="https://business.facebook.com/wa/manage/message-templates/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      WhatsApp Manager <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    (Meta exige aprovação ~ alguns minutos a 24h).
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {templates.map((t: any) => (
                <Card key={t.id} className="overflow-hidden">
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{t.nome}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <StatusBadge status={t.status} />
                          {t.categoria && (
                            <Badge variant="outline" className="text-[10px]">
                              {t.categoria}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {t.idioma}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (
                            confirm(
                              `Deletar template "${t.nome}"? Isso vai removê-lo também da sua WABA no Meta.`,
                            )
                          ) {
                            deletar.mutate({ id: t.id });
                          }
                        }}
                        title="Deletar template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1.5 border">
                      {t.header_text && (
                        <div className="font-semibold text-foreground">
                          {t.header_text}
                        </div>
                      )}
                      {t.body_text && (
                        <div className="whitespace-pre-wrap line-clamp-6">
                          {t.body_text}
                        </div>
                      )}
                      {t.footer_text && (
                        <div className="text-muted-foreground italic pt-1">
                          {t.footer_text}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const variant =
    status === "APPROVED"
      ? "success"
      : status === "REJECTED"
        ? "destructive"
        : "warning";
  return (
    <Badge variant={variant} className="text-[10px]">
      {status.toLowerCase()}
    </Badge>
  );
}
