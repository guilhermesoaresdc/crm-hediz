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
  const { data: assets, isLoading, error } = api.config.listarAssetsMeta.useQuery();
  const [step, setStep] = useState<Step>("business");

  const [selecao, setSelecao] = useState({
    meta_business_id: "",
    meta_business_nome: "",
    meta_ad_account_id: "",
    meta_ad_account_nome: "",
    meta_page_id: "",
    meta_page_nome: "",
    page_access_token: "",
    meta_pixel_id: "",
    meta_capi_token: "",
  });

  const { data: pixels, isLoading: pixelsLoading } = api.config.listarPixelsMeta.useQuery(
    { ad_account_id: selecao.meta_ad_account_id },
    { enabled: !!selecao.meta_ad_account_id && step !== "business" && step !== "ad_account" },
  );

  const finalizar = api.config.finalizarConexaoMeta.useMutation({
    onSuccess: () => {
      router.push("/integracoes?meta=conectado");
    },
  });

  // Auto-avança para primeira etapa viável
  useEffect(() => {
    if (!assets) return;
    if (assets.businesses.length === 1) {
      const b = assets.businesses[0];
      setSelecao((s) => ({ ...s, meta_business_id: b.id, meta_business_nome: b.name }));
      setStep("ad_account");
    }
  }, [assets]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando seus businesses e ad accounts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl space-y-4">
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

  if (!assets) return null;

  const steps: { id: Step; label: string }[] = [
    { id: "business", label: "Business" },
    { id: "ad_account", label: "Ad Account" },
    { id: "page", label: "Página" },
    { id: "pixel", label: "Pixel" },
    { id: "capi", label: "CAPI Token" },
  ];

  return (
    <div className="p-8 max-w-3xl space-y-6">
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
        <h1 className="text-3xl font-bold">Conectar Meta Ads</h1>
        <p className="text-muted-foreground text-sm">
          Escolha qual business, conta de anúncios e página usar.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs">
        {steps.map((s, i) => {
          const currentIdx = steps.findIndex((x) => x.id === step);
          const done = i < currentIdx;
          const current = i === currentIdx;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold",
                  done && "bg-success text-success-foreground",
                  current && "bg-primary text-primary-foreground",
                  !done && !current && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  current ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
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
            {assets.businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum Business Manager encontrado. Verifique se seu usuário Facebook tem
                acesso a algum Business Manager.
              </p>
            ) : (
              assets.businesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelecao((s) => ({
                      ...s,
                      meta_business_id: b.id,
                      meta_business_nome: b.name,
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
            <CardTitle className="text-base">Escolha a conta de anúncios</CardTitle>
            <div className="text-xs text-muted-foreground">
              Business: <strong>{selecao.meta_business_nome}</strong>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {assets.ad_accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma ad account acessível. Verifique permissões no Business Manager.
              </p>
            ) : (
              assets.ad_accounts.map((a) => (
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
            <CardTitle className="text-base">Escolha a página (opcional)</CardTitle>
            <div className="text-xs text-muted-foreground">
              Usada pra receber leads do Lead Ads. Pode pular e configurar depois.
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {assets.pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma página acessível. Você pode pular.
              </p>
            ) : (
              assets.pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelecao((s) => ({
                      ...s,
                      meta_page_id: p.id,
                      meta_page_nome: p.name,
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
            <CardTitle className="text-base">Escolha o Pixel (opcional)</CardTitle>
            <div className="text-xs text-muted-foreground">
              Usado para Conversion API. Sem pixel o envio de Lead/Purchase fica
              desativado.
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
                    setSelecao((s) => ({ ...s, meta_pixel_id: p.id }));
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
            <CardTitle className="text-base">
              Conversion API Token (opcional)
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Se deixar vazio, usamos o access token do login. Recomendado: gerar um
              token dedicado de system user no Events Manager pra CAPI.
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>CAPI Access Token (opcional)</Label>
              <Input
                type="password"
                value={selecao.meta_capi_token}
                onChange={(e) =>
                  setSelecao((s) => ({ ...s, meta_capi_token: e.target.value }))
                }
                placeholder="Deixe vazio pra usar o token do login"
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
            <CardTitle className="text-base">Revisão</CardTitle>
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
                    meta_ad_account_id: selecao.meta_ad_account_id,
                    meta_page_id: selecao.meta_page_id || undefined,
                    meta_pixel_id: selecao.meta_pixel_id || undefined,
                    meta_capi_token: selecao.meta_capi_token || undefined,
                    page_access_token: selecao.page_access_token || undefined,
                  })
                }
                disabled={finalizar.isPending}
              >
                {finalizar.isPending ? "Conectando..." : "Conectar e sincronizar"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("business")}>
                Voltar ao início
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
