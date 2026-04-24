"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  XCircle,
  DollarSign,
  Send,
  Inbox,
  Zap,
  Building,
  Phone,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";

const TIER_LIMITS: Record<string, number> = {
  TIER_50: 50,
  TIER_250: 250,
  TIER_1K: 1_000,
  TIER_10K: 10_000,
  TIER_100K: 100_000,
  TIER_UNLIMITED: Infinity,
};

const TIER_LABELS: Record<string, string> = {
  TIER_50: "50 conversas iniciadas / dia",
  TIER_250: "250 conversas iniciadas / dia",
  TIER_1K: "1.000 conversas iniciadas / dia",
  TIER_10K: "10.000 conversas iniciadas / dia",
  TIER_100K: "100.000 conversas iniciadas / dia",
  TIER_UNLIMITED: "Ilimitado",
};

export default function CanalStatusPage() {
  const { id } = useParams<{ id: string }>();
  const utils = api.useUtils();

  const { data: status, isLoading } = api.canal.statusCompleto.useQuery(
    { id },
    { enabled: !!id },
  );
  const { data: phones } = api.canal.listarPhonesDaWaba.useQuery(
    { id },
    { enabled: !!id },
  );

  const sincronizar = api.canal.sincronizarStatus.useMutation({
    onSuccess: () => {
      utils.canal.statusCompleto.invalidate({ id });
      utils.canal.listarPhonesDaWaba.invalidate({ id });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando status...
      </div>
    );
  }
  if (!status) {
    return <div className="p-4 sm:p-6 lg:p-8">Canal não encontrado</div>;
  }

  const tier = status.messaging_limit_tier ?? null;
  const limite = tier ? TIER_LIMITS[tier] : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link
          href="/ferramentas-chat/canais"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Canais
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{status.nome}</h1>
          <p className="text-muted-foreground text-sm">
            {status.whatsapp_phone_display} · {status.verified_name}
          </p>
        </div>
        <Button
          onClick={() => sincronizar.mutate({ id })}
          disabled={sincronizar.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 ${sincronizar.isPending ? "animate-spin" : ""}`}
          />
          {sincronizar.isPending ? "Sincronizando..." : "Sincronizar com Meta"}
        </Button>
      </div>

      {status.ultimo_sync_status_em && (
        <div className="text-xs text-muted-foreground">
          Última sincronização: {formatDate(status.ultimo_sync_status_em)}
        </div>
      )}

      {sincronizar.error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {sincronizar.error.message}
        </div>
      )}

      {/* Tier + status primários */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Tier de mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tier ? (
              <>
                <div className="text-2xl font-bold">
                  {TIER_LABELS[tier] ?? tier}
                </div>
                {limite !== null && limite !== Infinity && (
                  <ProgressoTier
                    atual={status.conversas_pagas_30d ?? 0}
                    limite={limite * 30}
                    label="Conversas pagas (30d)"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Limite de <strong>conversas iniciadas por você</strong> em 24h. A
                  Meta aumenta automático quando você tem alta qualidade e boa
                  frequência.
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Clique em "Sincronizar com Meta" pra buscar o tier.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Saúde do número
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Field
              label="Quality rating"
              value={<QualityBadge rating={status.quality_rating} />}
            />
            <Field
              label="Status"
              value={<StatusBadge status={status.phone_status} />}
            />
            <Field
              label="Nome verificado"
              value={<NameStatusBadge status={status.name_status} />}
            />
            <Field
              label="Throughput"
              value={
                <span className="text-xs">
                  {status.throughput_level ?? "STANDARD"}
                </span>
              }
            />
            {status.is_official_business_account && (
              <Field
                label="Oficial"
                value={<Badge variant="success">✓ Conta oficial</Badge>}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics 30d */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Uso nos últimos 30 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Metric
              icon={<Send className="h-4 w-4" />}
              label="Enviadas"
              value={(status.msgs_enviadas_30d ?? 0).toLocaleString("pt-BR")}
            />
            <Metric
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Entregues"
              value={(status.msgs_entregues_30d ?? 0).toLocaleString("pt-BR")}
            />
            <Metric
              icon={<Inbox className="h-4 w-4" />}
              label="Conversas"
              value={(status.conversas_pagas_30d ?? 0).toLocaleString("pt-BR")}
            />
            <Metric
              icon={<DollarSign className="h-4 w-4" />}
              label="Custo"
              value={formatCurrency((status.custo_30d_cents ?? 0) / 100)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            Business Manager + WABA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Field label="BM nome" value={status.meta_business_nome ?? "—"} />
          <Field label="BM id" value={
            <span className="font-mono text-xs">{status.meta_business_id ?? "—"}</span>
          } />
          <Field
            label="Verificação BM"
            value={<BMBadge status={status.meta_business_status} />}
          />
          <Field
            label="Status WABA"
            value={<WabaBadge status={status.waba_status} />}
          />
        </CardContent>
      </Card>

      {/* Phone numbers da WABA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Números cadastrados nesta WABA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!phones || phones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum outro número registrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">Número</th>
                    <th className="py-2">Nome</th>
                    <th className="py-2">Qualidade</th>
                    <th className="py-2">Verificado</th>
                  </tr>
                </thead>
                <tbody>
                  {phones.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-b-0">
                      <td className="py-2 font-mono">
                        {p.display_phone_number ?? "—"}
                      </td>
                      <td className="py-2">{p.verified_name ?? "—"}</td>
                      <td className="py-2">
                        <QualityBadge rating={p.quality_rating} />
                      </td>
                      <td className="py-2 text-xs">
                        {p.code_verification_status === "VERIFIED" ? (
                          <Badge variant="success">✓</Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {p.code_verification_status ?? "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Cada WABA suporta até <strong>25 phone numbers</strong>. Pra adicionar
            mais um, volte em Canais → "Cadastrar número novo".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressoTier({
  atual,
  limite,
  label,
}: {
  atual: number;
  limite: number;
  label: string;
}) {
  const pct = Math.min(100, (atual / limite) * 100);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-semibold">
          {atual.toLocaleString("pt-BR")} / {limite.toLocaleString("pt-BR")}
        </span>
      </div>
      <div className="h-2 bg-muted rounded overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function QualityBadge({ rating }: { rating: string | null | undefined }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  if (rating === "GREEN") return <Badge variant="success">Verde (ok)</Badge>;
  if (rating === "YELLOW") return <Badge variant="warning">Amarelo</Badge>;
  if (rating === "RED") return <Badge variant="destructive">Vermelho</Badge>;
  return <Badge variant="outline">{rating}</Badge>;
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const map: Record<string, { v: "success" | "warning" | "destructive"; icon: any }> = {
    CONNECTED: { v: "success", icon: CheckCircle2 },
    OFFLINE: { v: "warning", icon: AlertCircle },
    FLAGGED: { v: "warning", icon: AlertCircle },
    BANNED: { v: "destructive", icon: XCircle },
  };
  const cfg = map[status];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.v}>
      <Icon className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  );
}

function NameStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  if (status === "APPROVED") return <Badge variant="success">Aprovado</Badge>;
  if (status === "PENDING") return <Badge variant="warning">Pendente</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejeitado</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function BMBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  if (status === "verified") return <Badge variant="success">✓ Verificado</Badge>;
  if (status === "pending") return <Badge variant="warning">Pendente</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function WabaBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  if (status === "APPROVED") return <Badge variant="success">Aprovado</Badge>;
  if (status === "PENDING") return <Badge variant="warning">Pendente</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
