"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Step = "business" | "waba" | "phone" | "nome";

export default function NovoCanalPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("business");

  const [selecao, setSelecao] = useState({
    meta_business_id: "",
    meta_business_nome: "",
    whatsapp_business_account_id: "",
    whatsapp_business_account_nome: "",
    whatsapp_phone_number_id: "",
    whatsapp_phone_display: "",
    verified_name: "",
    quality_rating: "",
    nome: "",
  });

  const {
    data: businesses,
    isLoading: loadingBusinesses,
    error: errorBusinesses,
  } = api.canal.listarBusinessesDisponiveis.useQuery();

  const { data: wabas, isLoading: loadingWabas } = api.canal.listarWabasDisponiveis.useQuery(
    { business_id: selecao.meta_business_id },
    { enabled: !!selecao.meta_business_id },
  );

  const { data: phones, isLoading: loadingPhones } = api.canal.listarPhonesDisponiveis.useQuery(
    { waba_id: selecao.whatsapp_business_account_id },
    { enabled: !!selecao.whatsapp_business_account_id },
  );

  const criar = api.canal.criar.useMutation({
    onSuccess: () => router.push("/ferramentas-chat/canais"),
  });

  // Auto-skip se só 1 business
  useEffect(() => {
    if (!businesses) return;
    if (businesses.length === 1) {
      const b = businesses[0];
      setSelecao((s) => ({
        ...s,
        meta_business_id: b.id,
        meta_business_nome: b.name,
      }));
      setStep("waba");
    }
  }, [businesses]);

  if (loadingBusinesses) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando Business Managers...
        </div>
      </div>
    );
  }

  if (errorBusinesses) {
    return (
      <div className="p-8 max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Conecte Meta primeiro</h1>
        <p className="text-muted-foreground text-sm">
          Pra listar suas WABAs, é preciso ter autenticado com Facebook em Integrações.
        </p>
        <div className="flex gap-2">
          <Link href="/integracoes">
            <Button>Ir pra Integrações</Button>
          </Link>
          <Link href="/ferramentas-chat/canais">
            <Button variant="outline">Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  const steps: { id: Step; label: string }[] = [
    { id: "business", label: "Business" },
    { id: "waba", label: "WABA" },
    { id: "phone", label: "Número" },
    { id: "nome", label: "Nome" },
  ];

  return (
    <div className="p-8 max-w-3xl space-y-6">
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
        <div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-600 inline-flex items-center justify-center">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Conectar novo canal WhatsApp</h1>
          <p className="text-muted-foreground text-sm">
            Escolha qual Business, WABA, número e dê um apelido.
          </p>
        </div>
      </div>

      {/* Stepper */}
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
            </>
          );
          return (
            <div key={s.id} className="flex items-center gap-2">
              {clicavel ? (
                <button onClick={() => setStep(s.id)} className="flex items-center gap-2">
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
            {businesses?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum business disponível.</p>
            ) : (
              businesses?.map((b) => (
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
                <CardTitle className="text-base">Escolha a WhatsApp Business Account</CardTitle>
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
            {loadingWabas ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : !wabas?.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma WABA nesse Business.</p>
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
            {loadingPhones ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : !phones?.length ? (
              <div className="rounded-md bg-muted/50 p-4 text-sm space-y-3">
                <div>
                  Nenhum número registrado nessa WABA ainda.
                </div>
                <Link href="/ferramentas-chat/canais/novo-numero">
                  <Button variant="outline" className="w-full">
                    Cadastrar número novo direto pelo CRM
                  </Button>
                </Link>
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
                      verified_name: p.verified_name ?? "",
                      quality_rating: p.quality_rating ?? "",
                      nome: p.verified_name ?? p.display_phone_number,
                    }));
                    setStep("nome");
                  }}
                  className="w-full text-left px-4 py-3 rounded-md border hover:border-primary hover:bg-accent/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      {p.display_phone_number}
                      {p.verified_name && (
                        <Badge variant="outline" className="text-[10px]">
                          {p.verified_name}
                        </Badge>
                      )}
                      {p.quality_rating && (
                        <Badge
                          variant={p.quality_rating === "GREEN" ? "success" : "warning"}
                          className="text-[10px]"
                        >
                          Qualidade {p.quality_rating}
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

      {/* Nome + confirmação */}
      {step === "nome" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base">Dê um apelido a este canal</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setStep("phone")}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              Escolha um nome que identifique esse canal internamente — ex: "Equipe
              Ionara", "SDR Bahia", "Atendimento Principal". Os corretores verão esse
              nome ao escolher de qual número enviar.
            </div>

            <div className="space-y-1.5">
              <Label>Apelido do canal</Label>
              <Input
                value={selecao.nome}
                onChange={(e) => setSelecao((s) => ({ ...s, nome: e.target.value }))}
                placeholder="Ex: Equipe Principal"
              />
            </div>

            <dl className="space-y-2 text-sm pt-2 border-t">
              <Row label="Número" value={selecao.whatsapp_phone_display} />
              <Row label="WABA" value={selecao.whatsapp_business_account_nome} />
              <Row label="Business" value={selecao.meta_business_nome} />
            </dl>

            {criar.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {criar.error.message}
              </div>
            )}

            <Button
              className="w-full"
              onClick={() =>
                criar.mutate({
                  nome: selecao.nome,
                  whatsapp_business_account_id: selecao.whatsapp_business_account_id,
                  whatsapp_business_account_nome: selecao.whatsapp_business_account_nome,
                  whatsapp_phone_number_id: selecao.whatsapp_phone_number_id,
                  whatsapp_phone_display: selecao.whatsapp_phone_display,
                  verified_name: selecao.verified_name || undefined,
                  quality_rating: selecao.quality_rating || undefined,
                })
              }
              disabled={criar.isPending || !selecao.nome.trim()}
            >
              {criar.isPending ? "Criando canal..." : "Conectar canal"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right truncate font-medium">{value || "—"}</dd>
    </div>
  );
}
