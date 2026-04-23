"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Step = "business" | "waba" | "phone" | "concluir";

export default function SelecionarWhatsappPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("business");

  const [selecao, setSelecao] = useState({
    meta_business_id: "",
    meta_business_nome: "",
    whatsapp_business_account_id: "",
    whatsapp_business_account_nome: "",
    whatsapp_phone_number_id: "",
    whatsapp_phone_display: "",
  });

  const {
    data: businessesData,
    isLoading: businessesLoading,
    error: businessesError,
  } = api.config.listarBusinessesMeta.useQuery();

  const { data: wabas, isLoading: wabasLoading } = api.config.listarWabasMeta.useQuery(
    { business_id: selecao.meta_business_id },
    { enabled: !!selecao.meta_business_id },
  );

  const { data: phones, isLoading: phonesLoading } = api.config.listarPhonesWaba.useQuery(
    { waba_id: selecao.whatsapp_business_account_id },
    { enabled: !!selecao.whatsapp_business_account_id },
  );

  const finalizar = api.config.finalizarConexaoWhatsapp.useMutation({
    onSuccess: () => router.push("/integracoes?whatsapp=conectado"),
  });

  useEffect(() => {
    if (!businessesData?.businesses) return;
    if (businessesData.businesses.length === 1) {
      const b = businessesData.businesses[0];
      setSelecao((s) => ({ ...s, meta_business_id: b.id, meta_business_nome: b.name }));
      setStep("waba");
    }
  }, [businessesData]);

  if (businessesLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando Business Managers...
        </div>
      </div>
    );
  }

  if (businessesError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Conecte com Facebook primeiro</h1>
        <p className="text-muted-foreground text-sm">
          Pra configurar WhatsApp, é preciso ter autenticado com Facebook antes.
        </p>
        <div className="flex gap-2">
          <a href="/api/auth/meta/start">
            <Button>Continuar com Facebook</Button>
          </a>
          <Link href="/integracoes">
            <Button variant="outline">Voltar</Button>
          </Link>
        </div>
        <div className="text-xs text-destructive">{businessesError.message}</div>
      </div>
    );
  }

  if (!businessesData) return null;
  const businesses = businessesData.businesses;

  const steps: { id: Step; label: string }[] = [
    { id: "business", label: "Business" },
    { id: "waba", label: "WhatsApp Account" },
    { id: "phone", label: "Número" },
    { id: "concluir", label: "Revisar" },
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

      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-600 inline-flex items-center justify-center">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Conectar WhatsApp Business</h1>
          <p className="text-muted-foreground text-sm">
            Escolha a conta WhatsApp Business e o número que vai disparar as mensagens.
          </p>
        </div>
      </div>

      {/* Stepper clicável */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {steps.map((s, i) => {
          const currentIdx = steps.findIndex((x) => x.id === step);
          const done = i < currentIdx;
          const current = i === currentIdx;
          const clicavel = done;
          const stepEl = (
            <>
              <div
                className={cn(
                  "h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold transition-colors",
                  done && "bg-success text-success-foreground",
                  current && "bg-primary text-primary-foreground",
                  !done && !current && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn(current ? "text-foreground font-medium" : "text-muted-foreground")}>
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
                >
                  {stepEl}
                </button>
              ) : (
                <div className="flex items-center gap-2">{stepEl}</div>
              )}
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
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
                Nenhum Business Manager encontrado.
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
                    }));
                    setStep("waba");
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

      {/* WABA */}
      {step === "waba" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Escolha a conta WhatsApp Business</CardTitle>
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
            {wabasLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando WABAs...
              </div>
            ) : !wabas || wabas.length === 0 ? (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
                <div>Nenhuma conta WhatsApp Business encontrada nessa BM.</div>
                <div className="text-xs text-muted-foreground">
                  Crie uma em{" "}
                  <a
                    href="https://business.facebook.com/wa/manage/home"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    business.facebook.com/wa/manage
                  </a>
                  , registre um número e volte aqui.
                </div>
              </div>
            ) : (
              wabas.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setSelecao((s) => ({
                      ...s,
                      whatsapp_business_account_id: w.id,
                      whatsapp_business_account_nome: w.name,
                    }));
                    setStep("phone");
                  }}
                  className="w-full text-left px-4 py-3 rounded-md border hover:border-primary hover:bg-accent/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{w.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{w.id}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Phone */}
      {step === "phone" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Escolha o número</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  WABA: <strong>{selecao.whatsapp_business_account_nome}</strong>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setStep("waba")}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {phonesLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando números...
              </div>
            ) : !phones || phones.length === 0 ? (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
                <div>Nenhum número registrado nessa WABA.</div>
                <div className="text-xs text-muted-foreground">
                  Registre um em{" "}
                  <a
                    href="https://business.facebook.com/wa/manage/home"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    business.facebook.com/wa/manage
                  </a>
                  .
                </div>
              </div>
            ) : (
              phones.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelecao((s) => ({
                      ...s,
                      whatsapp_phone_number_id: p.id,
                      whatsapp_phone_display: p.display_phone_number,
                    }));
                    setStep("concluir");
                  }}
                  className="w-full text-left px-4 py-3 rounded-md border hover:border-primary hover:bg-accent/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {p.display_phone_number}
                      {p.verified_name && (
                        <Badge variant="outline" className="text-[10px]">
                          {p.verified_name}
                        </Badge>
                      )}
                      {p.quality_rating && p.quality_rating !== "GREEN" && (
                        <Badge variant="warning" className="text-[10px]">
                          Qualidade: {p.quality_rating}
                        </Badge>
                      )}
                      {p.code_verification_status === "VERIFIED" && (
                        <Badge variant="success" className="text-[10px]">
                          ✓ verificado
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Concluir */}
      {step === "concluir" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base">Revisão</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setStep("phone")}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm">
              <Row label="Business" value={selecao.meta_business_nome} />
              <Row label="WABA" value={selecao.whatsapp_business_account_nome} />
              <Row
                label="Número"
                value={`${selecao.whatsapp_phone_display} (${selecao.whatsapp_phone_number_id})`}
              />
            </dl>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              ⚠️ Antes de enviar mensagens: aprove pelo menos um template no{" "}
              <a
                href="https://business.facebook.com/wa/manage/message-templates/"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                WhatsApp Manager → Mensagens modelo
              </a>
              . Sem template aprovado, não é possível iniciar conversas (só responder em até 24h
              após o lead mandar mensagem).
            </div>

            {finalizar.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {finalizar.error.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() =>
                  finalizar.mutate({
                    whatsapp_business_account_id: selecao.whatsapp_business_account_id,
                    whatsapp_business_account_nome:
                      selecao.whatsapp_business_account_nome || undefined,
                    whatsapp_phone_number_id: selecao.whatsapp_phone_number_id,
                    whatsapp_phone_display: selecao.whatsapp_phone_display || undefined,
                  })
                }
                disabled={finalizar.isPending}
              >
                {finalizar.isPending ? "Conectando..." : "Conectar WhatsApp"}
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
