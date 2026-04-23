"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Step = "business" | "ad_account" | "page" | "pixel" | "capi" | "concluir";

export default function SelecionarMetaAssetsPage() {
  const router = useRouter();
  const {
    data: businessesData,
    isLoading,
    error,
  } = api.config.listarBusinessesMeta.useQuery();
  const [step, setStep] = useState<Step>("business");

  const [selecao, setSelecao] = useState({
    meta_business_id: "",
    meta_business_nome: "",
    meta_business_picture_url: "",
    meta_ad_account_id: "",
    meta_ad_account_nome: "",
    meta_page_id: "",
    meta_page_nome: "",
    meta_page_picture_url: "",
    page_access_token: "",
    meta_pixel_id: "",
    meta_pixel_nome: "",
    meta_capi_token: "",
  });

  // Ad accounts + pages da BM selecionada
  const { data: businessAssets, isLoading: assetsLoading } =
    api.config.listarAssetsDoBusinessMeta.useQuery(
      { business_id: selecao.meta_business_id },
      { enabled: !!selecao.meta_business_id },
    );

  const { data: pixels, isLoading: pixelsLoading } = api.config.listarPixelsMeta.useQuery(
    { ad_account_id: selecao.meta_ad_account_id },
    { enabled: !!selecao.meta_ad_account_id && step !== "business" && step !== "ad_account" },
  );

  const finalizar = api.config.finalizarConexaoMeta.useMutation({
    onSuccess: () => {
      router.push("/integracoes?meta=conectado");
    },
  });

  // Auto-avança se user só tem 1 business
  useEffect(() => {
    if (!businessesData?.businesses) return;
    if (businessesData.businesses.length === 1) {
      const b = businessesData.businesses[0];
      setSelecao((s) => ({ ...s, meta_business_id: b.id, meta_business_nome: b.name }));
      setStep("ad_account");
    }
  }, [businessesData]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando seus businesses e ad accounts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Algo deu errado</h1>
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-destructive">
          {error.message}
        </div>
        <Link href="/integracoes">
          <Button variant="outline">Voltar para Integrações</Button>
        </Link>
      </div>
    );
  }

  if (!businessesData) return null;
  const businesses = businessesData.businesses;
  const adAccounts = businessAssets?.ad_accounts ?? [];
  const pages = businessAssets?.pages ?? [];

  const steps: { id: Step; label: string }[] = [
    { id: "business", label: "Business" },
    { id: "ad_account", label: "Ad Account" },
    { id: "page", label: "Página" },
    { id: "pixel", label: "Pixel" },
    { id: "capi", label: "CAPI Token" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/integracoes"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Integrações
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Conectar Meta Ads</h1>
        <p className="text-muted-foreground text-sm">
          Escolha qual business, conta de anúncios e página usar.
        </p>
      </div>

      {/* Stepper clicável (pra voltar a etapas anteriores) */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {steps.map((s, i) => {
          const currentIdx = steps.findIndex((x) => x.id === step);
          const done = i < currentIdx;
          const current = i === currentIdx;
          const clicavel = done; // só steps já completados
          const stepEl = (
            <>
              <div
                className={cn(
                  "h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold transition-colors",
                  done && "bg-success text-success-foreground",
                  current && "bg-primary text-primary-foreground",
                  !done && !current && "bg-muted text-muted-foreground",
                  clicavel && "group-hover:ring-2 group-hover:ring-primary/40",
                )}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  current ? "text-foreground font-medium" : "text-muted-foreground",
                  clicavel && "group-hover:text-foreground",
                )}
              >
                {s.label}
              </span>
            </>
          );
          return (
            <div key={s.id} className="flex items-center gap-2">
              {clicavel ? (
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className="flex items-center gap-2 group cursor-pointer"
                  title="Voltar pra essa etapa"
                >
                  {stepEl}
                </button>
              ) : (
                <div className="flex items-center gap-2">{stepEl}</div>
              )}
              {i < steps.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      {/* Business */}
      {step === "business" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Escolha o Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum Business Manager encontrado. Verifique se seu usuário Facebook tem
                acesso a algum Business Manager.
              </p>
            ) : (
              businesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelecao((s) => ({
                      ...s,
                      meta_business_id: b.id,
                      meta_business_nome: b.name,
                      meta_business_picture_url: b.picture?.data?.url ?? "",
                    }));
                    setStep("ad_account");
                  }}
                  className="w-full text-left px-4 py-3 rounded-md border hover:border-primary hover:bg-accent/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{b.id}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Ad Account */}
      {step === "ad_account" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Escolha a conta de anúncios</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  Business: <strong>{selecao.meta_business_nome}</strong>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setStep("business")}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {assetsLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando contas de anúncios da BM...
              </div>
            ) : adAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma ad account dessa BM. Verifique se ela possui contas próprias ou
                clientes vinculados no Business Manager.
              </p>
            ) : (
              adAccounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelecao((s) => ({
                      ...s,
                      meta_ad_account_id: a.account_id,
                      meta_ad_account_nome: a.name,
                    }));
                    setStep("page");
                  }}
                  className="w-full text-left px-4 py-3 rounded-md border hover:border-primary hover:bg-accent/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {a.name}
                      {a.currency && (
                        <Badge variant="outline" className="text-[10px]">
                          {a.currency}
                        </Badge>
                      )}
                      {a.account_status !== 1 && (
                        <Badge variant="warning" className="text-[10px]">
                          inativa
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      act_{a.account_id}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Page */}
      {step === "page" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Escolha a página (opcional)</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  Usada pra receber leads do Lead Ads. Pode pular e configurar depois.
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setStep("ad_account")}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma página dessa BM. Você pode pular.
              </p>
            ) : (
              pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelecao((s) => ({
                      ...s,
                      meta_page_id: p.id,
                      meta_page_nome: p.name,
                      meta_page_picture_url: p.picture?.data?.url ?? "",
                      page_access_token: p.access_token ?? "",
                    }));
                    setStep("pixel");
                  }}
                  className="w-full text-left px-4 py-3 rounded-md border hover:border-primary hover:bg-accent/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep("pixel")}
            >
              Pular esta etapa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pixel */}
      {step === "pixel" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Escolha o Pixel (opcional)</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  Usado para Conversion API. Sem pixel o envio de Lead/Purchase fica
                  desativado.
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setStep("page")}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pixelsLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando pixels...
              </div>
            ) : !pixels || pixels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pixel encontrado nessa ad account. Crie no Events Manager.
              </p>
            ) : (
              pixels.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelecao((s) => ({ ...s, meta_pixel_id: p.id, meta_pixel_nome: p.name }));
                    setStep("capi");
                  }}
                  className="w-full text-left px-4 py-3 rounded-md border hover:border-primary hover:bg-accent/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep("capi")}
            >
              Pular
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CAPI */}
      {step === "capi" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base">Conversion API Token (opcional)</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setStep("pixel")}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/50 border p-3 text-xs space-y-2">
              <div>
                <span className="font-medium text-foreground">Pra que serve?</span>{" "}
                O CAPI (Conversion API) envia eventos de Lead e Purchase direto do
                nosso servidor pro Meta — mesmo quando o pixel do navegador é
                bloqueado (iOS 14+, ad blockers). Isso é o que permite o Meta atribuir
                corretamente a venda à campanha e otimizar os anúncios pra leads que
                realmente viram venda.
              </div>
              <div>
                <span className="font-medium text-foreground">Onde pegar:</span>
                <ol className="list-decimal list-inside mt-1 space-y-0.5">
                  <li>
                    Abre{" "}
                    <a
                      href="https://business.facebook.com/events_manager2/list/pixel"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Events Manager
                    </a>
                  </li>
                  <li>Seleciona o Pixel que você acabou de escolher na etapa anterior</li>
                  <li>
                    Vai na aba <strong>Configurações</strong> → rola até{" "}
                    <strong>Conversions API</strong>
                  </li>
                  <li>
                    Clica em <strong>Gerar token de acesso</strong> → confirma senha FB →
                    copia o token
                  </li>
                  <li>Cola aqui abaixo</li>
                </ol>
              </div>
              <div>
                <span className="font-medium text-foreground">Se pular:</span> o
                sistema usa o mesmo token de login (funciona mas é menos seguro — o
                dedicado é recomendado pra produção).
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>CAPI Access Token (opcional)</Label>
              <Input
                type="password"
                value={selecao.meta_capi_token}
                onChange={(e) =>
                  setSelecao((s) => ({ ...s, meta_capi_token: e.target.value }))
                }
                placeholder="Cole o token do Events Manager — ou deixe vazio"
              />
            </div>
            <Button className="w-full" onClick={() => setStep("concluir")}>
              Revisar e concluir
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Concluir */}
      {step === "concluir" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base">Revisão</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setStep("capi")}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm">
              <Row label="Business" value={selecao.meta_business_nome} />
              <Row
                label="Ad Account"
                value={`${selecao.meta_ad_account_nome} (act_${selecao.meta_ad_account_id})`}
              />
              <Row
                label="Página"
                value={selecao.meta_page_nome || "— (configurar depois)"}
              />
              <Row
                label="Pixel"
                value={selecao.meta_pixel_id || "— (CAPI desativado)"}
              />
              <Row
                label="CAPI Token"
                value={selecao.meta_capi_token ? "Dedicado" : "Reusa token do login"}
              />
            </dl>

            {finalizar.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {finalizar.error.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() =>
                  finalizar.mutate({
                    meta_business_id: selecao.meta_business_id,
                    meta_business_nome: selecao.meta_business_nome || undefined,
                    meta_business_picture_url: selecao.meta_business_picture_url || undefined,
                    meta_ad_account_id: selecao.meta_ad_account_id,
                    meta_ad_account_nome: selecao.meta_ad_account_nome || undefined,
                    meta_page_id: selecao.meta_page_id || undefined,
                    meta_page_nome: selecao.meta_page_nome || undefined,
                    meta_page_picture_url: selecao.meta_page_picture_url || undefined,
                    meta_pixel_id: selecao.meta_pixel_id || undefined,
                    meta_pixel_nome: selecao.meta_pixel_nome || undefined,
                    meta_capi_token: selecao.meta_capi_token || undefined,
                    page_access_token: selecao.page_access_token || undefined,
                  })
                }
                disabled={finalizar.isPending}
              >
                {finalizar.isPending ? "Conectando..." : "Conectar e sincronizar"}
              </Button>
              <Button variant="outline" onClick={() => setStep("business")}>
                Começar de novo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right truncate">{value}</dd>
    </div>
  );
}
