"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  ArrowLeft,
  PhoneCall,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "@/components/ui/country-select";
import {
  findCountryByIso,
  formatPhone,
  getMaxDigits,
  getPlaceholder,
} from "@/lib/countries";
import { cn } from "@/lib/utils";

type Step =
  | "business"
  | "waba"
  | "numero"
  | "metodo_codigo"
  | "verificar_codigo"
  | "pin"
  | "registrar"
  | "nome_canal";

const STEP_ORDER: Step[] = [
  "business",
  "waba",
  "numero",
  "metodo_codigo",
  "verificar_codigo",
  "pin",
  "nome_canal",
];

export default function NovoNumeroPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("business");

  const [dados, setDados] = useState({
    business_id: "",
    business_nome: "",
    waba_id: "",
    waba_nome: "",
    iso: "BR",
    cc: "55",
    phone_number: "",
    verified_name: "",
    phone_number_id: "",
    metodo_codigo: "SMS" as "SMS" | "VOICE",
    codigo: "",
    pin: gerarPin(),
    pin_copiado: false,
    nome_canal: "",
  });

  const { data: businesses, isLoading: loadingBus } =
    api.canal.listarBusinessesDisponiveis.useQuery();
  const { data: wabas, isLoading: loadingWabas } = api.canal.listarWabasDisponiveis.useQuery(
    { business_id: dados.business_id },
    { enabled: !!dados.business_id },
  );

  const adicionar = api.canal.adicionarNumero.useMutation({
    onSuccess: (r) => {
      setDados((d) => ({ ...d, phone_number_id: r.id }));
      setStep("metodo_codigo");
    },
  });
  const requisitar = api.canal.requisitarCodigo.useMutation({
    onSuccess: () => setStep("verificar_codigo"),
  });
  const verificar = api.canal.verificarCodigo.useMutation({
    onSuccess: () => setStep("pin"),
  });
  const registrar = api.canal.registrarNumero.useMutation({
    onSuccess: () => setStep("nome_canal"),
  });
  const criar = api.canal.criar.useMutation({
    onSuccess: () => router.push("/ferramentas-chat/canais"),
  });

  // Auto-skip business único
  useEffect(() => {
    if (businesses?.length === 1 && step === "business") {
      const b = businesses[0];
      setDados((d) => ({ ...d, business_id: b.id, business_nome: b.name }));
      setStep("waba");
    }
  }, [businesses, step]);

  function copiarPin() {
    navigator.clipboard.writeText(dados.pin);
    setDados((d) => ({ ...d, pin_copiado: true }));
    setTimeout(() => setDados((d) => ({ ...d, pin_copiado: false })), 2000);
  }

  function voltar() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx <= 0) {
      router.push("/ferramentas-chat/canais");
      return;
    }
    setStep(STEP_ORDER[idx - 1]);
  }

  function setIso(iso: string) {
    const c = findCountryByIso(iso);
    if (!c) return;
    setDados((d) => ({
      ...d,
      iso: c.iso,
      cc: c.code,
      // Trunca se o novo país tem limite menor
      phone_number: d.phone_number.slice(0, getMaxDigits(c.iso)),
    }));
  }

  function setPhoneInput(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, getMaxDigits(dados.iso));
    setDados((d) => ({ ...d, phone_number: digits }));
  }

  if (loadingBus) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }

  const selectedCountry = findCountryByIso(dados.iso);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
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
          <PhoneCall className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Cadastrar número novo</h1>
          <p className="text-muted-foreground text-sm">
            Adicione um número que ainda não está na sua WABA. Tudo direto pelo CRM.
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 border p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Pré-requisitos:</strong> O número precisa
        estar disponível (não pode estar em uso em nenhum WhatsApp comum). Você vai
        receber um código por SMS ou voz pra verificar a posse.
      </div>

      {/* Stepper compacto */}
      <Stepper step={step} />

      {/* Business */}
      {step === "business" && (
        <Card>
          <CardHeader>
            <StepHeader titulo="Escolha o Business" onVoltar={voltar} />
          </CardHeader>
          <CardContent className="space-y-2">
            {businesses?.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setDados((d) => ({ ...d, business_id: b.id, business_nome: b.name }));
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
            ))}
          </CardContent>
        </Card>
      )}

      {/* WABA */}
      {step === "waba" && (
        <Card>
          <CardHeader>
            <StepHeader
              titulo="Escolha a WABA"
              subtitulo={
                <>
                  Business: <strong>{dados.business_nome}</strong>
                </>
              }
              onVoltar={voltar}
            />
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingWabas ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : (
              wabas?.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setDados((d) => ({ ...d, waba_id: w.id, waba_nome: w.name }));
                    setStep("numero");
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

      {/* Número */}
      {step === "numero" && (
        <Card>
          <CardHeader>
            <StepHeader titulo="Dados do número" onVoltar={voltar} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[140px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label>País *</Label>
                <CountrySelect value={dados.iso} onChange={setIso} />
              </div>
              <div className="space-y-1.5">
                <Label>Número *</Label>
                <Input
                  value={formatPhone(dados.phone_number, dados.iso)}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder={getPlaceholder(dados.iso)}
                  inputMode="tel"
                  autoComplete="tel-national"
                />
                <p className="text-[11px] text-muted-foreground">
                  Só dígitos. A formatação é aplicada automaticamente.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nome de exibição (verified name) *</Label>
              <Input
                maxLength={25}
                value={dados.verified_name}
                onChange={(e) =>
                  setDados((d) => ({ ...d, verified_name: e.target.value }))
                }
                placeholder="Hédiz Imobiliária"
              />
              <p className="text-[11px] text-muted-foreground">
                Nome comercial mostrado nas conversas. Máx 25 caracteres. Deve ser o
                nome da empresa/marca (não nome pessoal) — a Meta rejeita nomes que
                violam as diretrizes.
              </p>
            </div>

            {adicionar.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {adicionar.error.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={voltar}
                disabled={adicionar.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={() =>
                  adicionar.mutate({
                    waba_id: dados.waba_id,
                    cc: dados.cc,
                    phone_number: dados.phone_number,
                    verified_name: dados.verified_name,
                  })
                }
                disabled={
                  adicionar.isPending ||
                  !dados.cc ||
                  !dados.phone_number ||
                  !dados.verified_name
                }
              >
                {adicionar.isPending ? "Cadastrando..." : "Cadastrar e ir pra verificação"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Método código */}
      {step === "metodo_codigo" && (
        <Card>
          <CardHeader>
            <StepHeader titulo="Como receber o código?" onVoltar={voltar} />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-muted/50 p-3 text-xs">
              <strong>Número cadastrado:</strong>{" "}
              {selectedCountry?.flag} +{dados.cc}{" "}
              {formatPhone(dados.phone_number, dados.iso)}
              <br />
              Você vai receber um código de 6 dígitos pra confirmar a posse.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDados((d) => ({ ...d, metodo_codigo: "SMS" }))}
                className={cn(
                  "p-4 rounded-md border text-left transition-colors",
                  dados.metodo_codigo === "SMS"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50",
                )}
              >
                <div className="font-medium">SMS</div>
                <div className="text-xs text-muted-foreground">
                  Recebe mensagem de texto
                </div>
              </button>
              <button
                onClick={() => setDados((d) => ({ ...d, metodo_codigo: "VOICE" }))}
                className={cn(
                  "p-4 rounded-md border text-left transition-colors",
                  dados.metodo_codigo === "VOICE"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50",
                )}
              >
                <div className="font-medium">Ligação de voz</div>
                <div className="text-xs text-muted-foreground">
                  Receba ligação com o código
                </div>
              </button>
            </div>

            {requisitar.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {requisitar.error.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={voltar} disabled={requisitar.isPending}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={() =>
                  requisitar.mutate({
                    phone_number_id: dados.phone_number_id,
                    method: dados.metodo_codigo,
                  })
                }
                disabled={requisitar.isPending}
              >
                {requisitar.isPending
                  ? "Enviando..."
                  : `Enviar código por ${dados.metodo_codigo === "SMS" ? "SMS" : "voz"}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inserir código */}
      {step === "verificar_codigo" && (
        <Card>
          <CardHeader>
            <StepHeader titulo="Insira o código recebido" onVoltar={voltar} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-success/10 border border-success/20 p-3 text-xs text-success">
              ✓ Código enviado por {dados.metodo_codigo === "SMS" ? "SMS" : "voz"} para{" "}
              {selectedCountry?.flag} +{dados.cc}{" "}
              {formatPhone(dados.phone_number, dados.iso)}.
            </div>

            <div className="space-y-1.5">
              <Label>Código de verificação (6 dígitos)</Label>
              <Input
                maxLength={6}
                value={dados.codigo}
                onChange={(e) =>
                  setDados((d) => ({ ...d, codigo: e.target.value.replace(/\D/g, "") }))
                }
                placeholder="123456"
                className="text-center text-lg tracking-widest font-mono"
                inputMode="numeric"
              />
            </div>

            {verificar.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {verificar.error.message}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={voltar} disabled={verificar.isPending}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button
                onClick={() =>
                  verificar.mutate({
                    phone_number_id: dados.phone_number_id,
                    code: dados.codigo,
                  })
                }
                disabled={verificar.isPending || dados.codigo.length < 4}
              >
                {verificar.isPending ? "Verificando..." : "Verificar"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("metodo_codigo")}>
                Reenviar código
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PIN 2FA */}
      {step === "pin" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                <CardTitle className="text-base">PIN 2FA (6 dígitos)</CardTitle>
              </div>
              <Button size="sm" variant="ghost" onClick={voltar}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/50 border p-3 text-xs">
              O Meta exige um PIN de 6 dígitos como segundo fator de autenticação do
              número. Geramos um pra você — <strong>guarde em local seguro</strong>.
              Esse PIN será necessário caso queira reconfigurar o número no futuro.
            </div>

            <div className="flex items-center justify-between bg-card border rounded-md p-4">
              <div className="font-mono text-3xl tracking-widest">{dados.pin}</div>
              <Button size="sm" variant="outline" onClick={copiarPin}>
                {dados.pin_copiado ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {dados.pin_copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Quer escolher seu próprio PIN?{" "}
              <button
                type="button"
                onClick={() => {
                  const novo = prompt("Digite um PIN de 6 dígitos:") ?? "";
                  if (/^\d{6}$/.test(novo)) {
                    setDados((d) => ({ ...d, pin: novo }));
                  } else if (novo) {
                    alert("PIN deve ter exatamente 6 dígitos.");
                  }
                }}
                className="text-primary hover:underline"
              >
                Definir manualmente
              </button>
            </div>

            <Button
              className="w-full"
              onClick={() =>
                registrar.mutate({
                  phone_number_id: dados.phone_number_id,
                  pin: dados.pin,
                })
              }
              disabled={registrar.isPending}
            >
              {registrar.isPending ? "Registrando..." : "Registrar número na Cloud API"}
            </Button>

            {registrar.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {registrar.error.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Apelido + criar canal */}
      {step === "nome_canal" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Número registrado! Dê um apelido
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={voltar}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-success/10 border border-success/20 p-3 text-sm">
              <div className="font-semibold text-success mb-1">Tudo pronto!</div>
              <div className="text-xs">
                {selectedCountry?.flag} +{dados.cc}{" "}
                {formatPhone(dados.phone_number, dados.iso)} ({dados.verified_name}) está
                ativo na Cloud API. Falta só dar um apelido pra esse canal no CRM.
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Apelido do canal</Label>
              <Input
                value={dados.nome_canal}
                onChange={(e) => setDados((d) => ({ ...d, nome_canal: e.target.value }))}
                placeholder="Ex: Equipe Principal"
              />
            </div>

            {criar.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {criar.error.message}
              </div>
            )}

            <Button
              className="w-full"
              onClick={() =>
                criar.mutate({
                  nome: dados.nome_canal || dados.verified_name,
                  whatsapp_business_account_id: dados.waba_id,
                  whatsapp_business_account_nome: dados.waba_nome,
                  whatsapp_phone_number_id: dados.phone_number_id,
                  whatsapp_phone_display: `+${dados.cc} ${formatPhone(dados.phone_number, dados.iso)}`,
                  verified_name: dados.verified_name,
                })
              }
              disabled={criar.isPending || !dados.nome_canal.trim()}
            >
              {criar.isPending ? "Criando canal..." : "Criar canal e finalizar"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepHeader({
  titulo,
  subtitulo,
  onVoltar,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  onVoltar: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <CardTitle className="text-base">{titulo}</CardTitle>
        {subtitulo && (
          <div className="text-xs text-muted-foreground mt-1">{subtitulo}</div>
        )}
      </div>
      <Button size="sm" variant="ghost" onClick={onVoltar}>
        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
        Voltar
      </Button>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels: { id: Step; label: string }[] = [
    { id: "business", label: "Business" },
    { id: "waba", label: "WABA" },
    { id: "numero", label: "Número" },
    { id: "metodo_codigo", label: "Verificar" },
    { id: "pin", label: "PIN" },
    { id: "nome_canal", label: "Concluir" },
  ];
  const idx = labels.findIndex((l) =>
    l.id === "metodo_codigo" && step === "verificar_codigo"
      ? true
      : l.id === "nome_canal" && step === "registrar"
        ? true
        : l.id === step,
  );
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      {labels.map((l, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <div key={l.id} className="flex items-center gap-2">
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
              {l.label}
            </span>
            {i < labels.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function gerarPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
