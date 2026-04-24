"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  QrCode,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function BaileysCanaisPage() {
  const utils = api.useUtils();
  const { data: canais, isLoading } = api.baileys.listar.useQuery(undefined, {
    refetchInterval: 10_000,
  });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [qrParaCanalId, setQrParaCanalId] = useState<string | null>(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link
          href="/ferramentas-chat/canais"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Canais
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-green-600 text-white inline-flex items-center justify-center">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">WhatsApp QR Code</h1>
          <p className="text-muted-foreground text-sm">
            Conexão via leitura de QR code (WhatsApp Web). Usa uma instância{" "}
            <a
              href="https://doc.evolution-api.com"
              target="_blank"
              className="text-primary hover:underline"
              rel="noreferrer"
            >
              Evolution API
            </a>{" "}
            externa rodando o Baileys.
          </p>
        </div>
      </div>

      <div className="rounded-md bg-warning/10 border border-warning/20 p-3 text-xs">
        <strong className="text-warning">⚠️ Atenção ao risco de ban.</strong> A API
        não oficial (Baileys/WhatsApp Web) não é autorizada pela Meta. Números
        podem ser banidos sem aviso. Use pra testes ou clientes que aceitam o
        risco — pra produção recomendamos o WhatsApp Cloud API oficial.
      </div>

      {/* Pré-requisito: servidor Evolution API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servidor Evolution API</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground">
            O Vercel não pode rodar Baileys (processo precisa ficar vivo 24/7).
            Você precisa rodar a <strong>Evolution API</strong> em um servidor
            externo e conectar aqui.
          </p>
          <p className="text-muted-foreground">
            <strong>Opções:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <a
                href="https://railway.app"
                target="_blank"
                className="text-primary hover:underline"
                rel="noreferrer"
              >
                Railway <ExternalLink className="inline h-3 w-3" />
              </a>{" "}
              — deploy de 1 clique, ~5 USD/mês
            </li>
            <li>VPS Hetzner / DigitalOcean rodando Docker</li>
            <li>
              <a
                href="https://github.com/EvolutionAPI/evolution-api"
                target="_blank"
                className="text-primary hover:underline"
                rel="noreferrer"
              >
                Docs do Evolution API <ExternalLink className="inline h-3 w-3" />
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Lista de canais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Conexões ativas</CardTitle>
            <Button size="sm" onClick={() => setMostrarForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Novo QR
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : !canais?.length && !mostrarForm ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conexão via QR ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {canais?.map((c: any) => (
                <li key={c.id} className="p-3 rounded-md border space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-green-600 text-white inline-flex items-center justify-center flex-shrink-0">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.nome}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.instancia_nome} · {c.numero_telefone ?? "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      {c.status !== "conectado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQrParaCanalId(c.id)}
                        >
                          <QrCode className="h-3.5 w-3.5 mr-1" />
                          QR
                        </Button>
                      )}
                      <DeletarBtn id={c.id} nome={c.nome} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {mostrarForm && <NovoCanalForm onClose={() => setMostrarForm(false)} />}

      {qrParaCanalId && (
        <QrCodeModal
          canalId={qrParaCanalId}
          onClose={() => setQrParaCanalId(null)}
        />
      )}
    </div>
  );
}

function NovoCanalForm({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils();
  const [form, setForm] = useState({
    nome: "",
    instancia_url: "",
    instancia_api_key: "",
    instancia_nome: "",
  });

  const testar = api.baileys.testarServidor.useMutation();
  const criar = api.baileys.criar.useMutation({
    onSuccess: () => {
      utils.baileys.listar.invalidate();
      onClose();
    },
  });

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-base">Nova conexão QR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Apelido</Label>
          <Input
            placeholder="Ex: Atendimento WhatsApp 2"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>URL da Evolution API</Label>
          <Input
            placeholder="https://evo.meuservidor.com"
            value={form.instancia_url}
            onChange={(e) => setForm({ ...form, instancia_url: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>API Key global</Label>
          <Input
            type="password"
            placeholder="•••••••••••••"
            value={form.instancia_api_key}
            onChange={(e) =>
              setForm({ ...form, instancia_api_key: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nome da instância no servidor</Label>
          <Input
            placeholder="atendimento-imob (apenas letras, números, _ e -)"
            value={form.instancia_nome}
            onChange={(e) => setForm({ ...form, instancia_nome: e.target.value })}
          />
        </div>

        {testar.data && (
          <div
            className={
              testar.data.ok
                ? "rounded-md bg-success/10 border border-success/20 p-2 text-xs text-success"
                : "rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive"
            }
          >
            {testar.data.ok
              ? `✓ Conectado${testar.data.versao ? ` (v${testar.data.versao})` : ""}`
              : `✗ ${testar.data.erro}`}
          </div>
        )}
        {criar.error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
            {criar.error.message}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() =>
              testar.mutate({
                url: form.instancia_url,
                api_key: form.instancia_api_key,
              })
            }
            disabled={testar.isPending || !form.instancia_url || !form.instancia_api_key}
          >
            {testar.isPending ? "Testando..." : "Testar servidor"}
          </Button>
          <Button
            onClick={() => criar.mutate(form)}
            disabled={
              criar.isPending ||
              !form.nome ||
              !form.instancia_url ||
              !form.instancia_api_key ||
              !form.instancia_nome
            }
          >
            {criar.isPending ? "Criando..." : "Criar e gerar QR"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QrCodeModal({
  canalId,
  onClose,
}: {
  canalId: string;
  onClose: () => void;
}) {
  const obterQr = api.baileys.obterQr.useMutation();
  const sincronizar = api.baileys.sincronizarStatus.useMutation();
  const [qr, setQr] = useState<string | null>(null);
  const [estado, setEstado] = useState<string>("aguardando");

  async function gerar() {
    try {
      const r = await obterQr.mutateAsync({ id: canalId });
      setQr(r.base64 ?? null);
    } catch {
      /* mostra no erro */
    }
  }

  useEffect(() => {
    gerar();
    const intervalQr = setInterval(gerar, 25_000);
    const intervalStatus = setInterval(async () => {
      try {
        const s = await sincronizar.mutateAsync({ id: canalId });
        setEstado(s.status);
        if (s.status === "conectado") {
          clearInterval(intervalQr);
          clearInterval(intervalStatus);
          setTimeout(onClose, 1200);
        }
      } catch {
        /* continua tentando */
      }
    }, 5_000);
    return () => {
      clearInterval(intervalQr);
      clearInterval(intervalStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canalId]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Escaneie no seu WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          {estado === "conectado" ? (
            <div className="py-10 flex flex-col items-center gap-2 text-success">
              <CheckCircle2 className="h-10 w-10" />
              <div className="font-semibold">Conectado!</div>
            </div>
          ) : qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="QR code"
              className="w-full max-w-[280px] mx-auto rounded border"
            />
          ) : obterQr.error ? (
            <div className="text-sm text-destructive py-10">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              {obterQr.error.message}
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <div className="text-xs">Gerando QR...</div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            WhatsApp → Configurações → Dispositivos conectados → Conectar um
            dispositivo. O QR atualiza a cada ~25s.
          </p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={gerar}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Gerar novo QR
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "conectado")
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Conectado
      </Badge>
    );
  if (status === "aguardando_qr")
    return <Badge variant="warning">Aguardando QR</Badge>;
  if (status === "falha") return <Badge variant="destructive">Falha</Badge>;
  return <Badge variant="secondary">Desconectado</Badge>;
}

function DeletarBtn({ id, nome }: { id: string; nome: string }) {
  const utils = api.useUtils();
  const deletar = api.baileys.deletar.useMutation({
    onSuccess: () => utils.baileys.listar.invalidate(),
  });
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (confirm(`Remover a conexão "${nome}"?`)) deletar.mutate({ id });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
