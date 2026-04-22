"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Zap,
  MessageCircle,
  TestTube,
  Unplug,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

export default function IntegracoesPage() {
  const utils = api.useUtils();
  const { data: config } = api.config.obter.useQuery();
  const { data: syncStatus } = api.config.statusSync.useQuery(undefined, {
    refetchInterval: 10_000,
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground text-sm">
          Conecte Meta Ads, WhatsApp Business e sincronize campanhas.
        </p>
      </div>

      <MetaIntegrationCard
        config={config}
        syncStatus={syncStatus}
        onChange={() => {
          utils.config.obter.invalidate();
          utils.config.statusSync.invalidate();
        }}
      />

      <WhatsappIntegrationCard
        config={config}
        onChange={() => utils.config.obter.invalidate()}
      />
    </div>
  );
}

function MetaIntegrationCard({
  config,
  syncStatus,
  onChange,
}: {
  config: any;
  syncStatus: any;
  onChange: () => void;
}) {
  const conectado = !!config?.meta_conectado_em;
  const [editando, setEditando] = useState(!conectado);
  const [form, setForm] = useState({
    meta_business_id: "",
    meta_ad_account_id: "",
    meta_page_id: "",
    meta_access_token: "",
    meta_pixel_id: "",
    meta_capi_token: "",
  });
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const conectar = api.config.conectarMeta.useMutation({
    onSuccess: () => {
      setEditando(false);
      setForm({
        meta_business_id: "",
        meta_ad_account_id: "",
        meta_page_id: "",
        meta_access_token: "",
        meta_pixel_id: "",
        meta_capi_token: "",
      });
      onChange();
    },
  });
  const desconectar = api.config.desconectarMeta.useMutation({ onSuccess: onChange });
  const testar = api.config.testarMeta.useMutation({
    onSuccess: (r) => setTestResult({ ok: true, msg: `✓ ${r.business} (${r.ad_account})` }),
    onError: (e) => setTestResult({ ok: false, msg: e.message }),
  });
  const sincronizar = api.config.sincronizarMetaAgora.useMutation({
    onSuccess: onChange,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 inline-flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Meta Ads + Conversion API</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Sincroniza campanhas e custos · envia Lead e Purchase pro Meta
            </p>
          </div>
        </div>
        <div>
          {conectado ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Conectado
            </Badge>
          ) : (
            <Badge variant="outline">Não conectado</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {conectado && !editando && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <InfoField label="Business ID" value={config?.meta_business_id} />
              <InfoField label="Ad Account" value={config?.meta_ad_account_id} />
              <InfoField label="Page ID" value={config?.meta_page_id} />
              <InfoField label="Pixel ID" value={config?.meta_pixel_id} />
              <InfoField label="Conectado em" value={formatDate(config?.meta_conectado_em)} />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => testar.mutate()}
                disabled={testar.isPending}
              >
                {testar.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <TestTube className="h-3.5 w-3.5" />
                )}
                Testar conexão
              </Button>
              <Button
                size="sm"
                onClick={() => sincronizar.mutate({ tipo: "ambos" })}
                disabled={sincronizar.isPending}
              >
                {sincronizar.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Sincronizar agora
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditando(true)}>
                Editar credenciais
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("Desconectar Meta? Os dados sincronizados permanecem.")) {
                    desconectar.mutate();
                  }
                }}
              >
                <Unplug className="h-3.5 w-3.5" />
                Desconectar
              </Button>
            </div>

            {testResult && (
              <div
                className={cn(
                  "rounded-md p-3 text-sm border",
                  testResult.ok
                    ? "bg-success/10 border-success/20 text-success"
                    : "bg-destructive/10 border-destructive/20 text-destructive",
                )}
              >
                {testResult.msg}
              </div>
            )}

            {sincronizar.data && (
              <div className="rounded-md p-3 text-sm border bg-primary/5 border-primary/20 text-primary">
                {sincronizar.data.modo === "background"
                  ? "Sincronização disparada em background (via Inngest). Status atualiza abaixo em segundos."
                  : `Síncrono: ${sincronizar.data.campanhas} campanhas/conjuntos/anúncios, ${sincronizar.data.custos} registros de custo.`}
              </div>
            )}

            {sincronizar.error && (
              <div className="rounded-md p-3 text-sm border bg-destructive/10 border-destructive/20 text-destructive">
                {sincronizar.error.message}
              </div>
            )}

            {/* Histórico de sincronização */}
            <div className="pt-2 border-t">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Sincronizações recentes
              </div>
              <SyncHistory syncStatus={syncStatus} />
            </div>
          </>
        )}

        {editando && (
          <>
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">Onde pegar cada valor</div>
              <div>
                <strong>Business ID / Ad Account / Page ID:</strong> business.facebook.com →
                Configurações do Negócio
              </div>
              <div>
                <strong>Access Token:</strong> business.facebook.com → Business Settings → System Users
                → Generate New Token (permissões: ads_read, ads_management, leads_retrieval,
                pages_read_engagement, pages_manage_ads, business_management)
              </div>
              <div>
                <strong>Pixel ID + CAPI Token:</strong> Gerenciador de Eventos → seu Pixel → Configurações
                → Conversions API
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Business ID</Label>
                <Input
                  value={form.meta_business_id}
                  onChange={(e) => setForm({ ...form, meta_business_id: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ad Account ID</Label>
                <Input
                  placeholder="act_1234567890 (ou só o número)"
                  value={form.meta_ad_account_id}
                  onChange={(e) => setForm({ ...form, meta_ad_account_id: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Page ID</Label>
                <Input
                  value={form.meta_page_id}
                  onChange={(e) => setForm({ ...form, meta_page_id: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pixel ID</Label>
                <Input
                  value={form.meta_pixel_id}
                  onChange={(e) => setForm({ ...form, meta_pixel_id: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Access Token (System User)</Label>
                <Input
                  type="password"
                  value={form.meta_access_token}
                  onChange={(e) => setForm({ ...form, meta_access_token: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>CAPI Access Token</Label>
                <Input
                  type="password"
                  value={form.meta_capi_token}
                  onChange={(e) => setForm({ ...form, meta_capi_token: e.target.value })}
                />
              </div>
            </div>

            {conectar.error && (
              <div className="rounded-md p-3 text-sm border bg-destructive/10 border-destructive/20 text-destructive">
                {conectar.error.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => conectar.mutate(form)} disabled={conectar.isPending}>
                {conectar.isPending ? "Salvando..." : "Conectar Meta"}
              </Button>
              {conectado && (
                <Button variant="ghost" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
              )}
            </div>
          </>
        )}

        <div className="pt-2 border-t">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            URL do webhook Meta Lead Ads
          </div>
          <div className="font-mono text-xs bg-muted p-2 rounded border">
            {typeof window !== "undefined"
              ? `${window.location.origin}/api/webhooks/meta-lead`
              : "/api/webhooks/meta-lead"}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            Configure no painel Meta (app webhooks) com verify_token =
            <code className="bg-muted px-1 rounded">META_WEBHOOK_VERIFY_TOKEN</code>
            <a
              href="https://developers.facebook.com/docs/marketing-api/guides/lead-ads/quickstart/webhooks"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5 ml-1"
            >
              docs <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function WhatsappIntegrationCard({
  config,
  onChange,
}: {
  config: any;
  onChange: () => void;
}) {
  const conectado = !!config?.whatsapp_conectado_em;
  const [editando, setEditando] = useState(!conectado);
  const [form, setForm] = useState({
    whatsapp_phone_number_id: "",
    whatsapp_business_account_id: "",
    whatsapp_access_token: "",
  });

  const conectar = api.config.conectarWhatsapp.useMutation({
    onSuccess: () => {
      setEditando(false);
      setForm({
        whatsapp_phone_number_id: "",
        whatsapp_business_account_id: "",
        whatsapp_access_token: "",
      });
      onChange();
    },
  });
  const desconectar = api.config.desconectarWhatsapp.useMutation({ onSuccess: onChange });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-600 inline-flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">WhatsApp Cloud API</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Envia primeira mensagem via template oficial · recebe respostas dos leads
            </p>
          </div>
        </div>
        <div>
          {conectado ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Conectado
            </Badge>
          ) : (
            <Badge variant="outline">Não conectado</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {conectado && !editando && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <InfoField label="Phone Number ID" value={config?.whatsapp_phone_number_id} />
              <InfoField
                label="Business Account"
                value={config?.whatsapp_business_account_id}
              />
              <InfoField label="Conectado em" value={formatDate(config?.whatsapp_conectado_em)} />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setEditando(true)}>
                Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("Desconectar WhatsApp?")) desconectar.mutate();
                }}
              >
                <Unplug className="h-3.5 w-3.5" />
                Desconectar
              </Button>
            </div>
          </>
        )}

        {editando && (
          <>
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">Setup inicial</div>
              <div>
                1. Meta for Developers → seu app → WhatsApp → API Setup → cadastre o número
              </div>
              <div>
                2. <strong>Phone Number ID</strong> aparece no card "From". Business Account ID logo
                abaixo.
              </div>
              <div>
                3. <strong>Access Token</strong>: botão "Generate a token" com permissão
                whatsapp_business_messaging + whatsapp_business_management
              </div>
              <div>4. Aprove templates no WhatsApp Manager antes de enviar primeira mensagem.</div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone Number ID</Label>
                <Input
                  value={form.whatsapp_phone_number_id}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_phone_number_id: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Business Account ID</Label>
                <Input
                  value={form.whatsapp_business_account_id}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_business_account_id: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Access Token</Label>
                <Input
                  type="password"
                  value={form.whatsapp_access_token}
                  onChange={(e) => setForm({ ...form, whatsapp_access_token: e.target.value })}
                />
              </div>
            </div>

            {conectar.error && (
              <div className="rounded-md p-3 text-sm border bg-destructive/10 border-destructive/20 text-destructive">
                {conectar.error.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => conectar.mutate(form)} disabled={conectar.isPending}>
                {conectar.isPending ? "Salvando..." : "Conectar WhatsApp"}
              </Button>
              {conectado && (
                <Button variant="ghost" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
              )}
            </div>
          </>
        )}

        <div className="pt-2 border-t">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            URL do webhook WhatsApp
          </div>
          <div className="font-mono text-xs bg-muted p-2 rounded border">
            {typeof window !== "undefined"
              ? `${window.location.origin}/api/webhooks/whatsapp`
              : "/api/webhooks/whatsapp"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure no WhatsApp → Webhooks com verify_token ={" "}
            <code className="bg-muted px-1 rounded">WHATSAPP_VERIFY_TOKEN</code> — subscribe em
            messages + message_status.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-xs truncate" title={value ?? ""}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function SyncHistory({ syncStatus }: { syncStatus: any }) {
  if (!syncStatus?.recentes?.length) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhuma sincronização ainda. Clique em "Sincronizar agora".
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {syncStatus.recentes.slice(0, 5).map((log: any) => (
        <div key={log.id} className="flex items-center gap-2 text-xs">
          {log.status === "sucesso" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
          ) : log.status === "erro" ? (
            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />
          )}
          <span className="font-mono text-muted-foreground w-32 flex-shrink-0">
            {log.tipo.replace("meta_", "")}
          </span>
          <span className="text-muted-foreground w-20 flex-shrink-0">{log.items_processados} items</span>
          <span className="text-muted-foreground truncate">{formatDate(log.iniciado_em)}</span>
          {log.erro && (
            <span className="text-destructive truncate ml-auto" title={log.erro}>
              {log.erro}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
