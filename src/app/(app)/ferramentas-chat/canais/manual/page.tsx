"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, Send, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CanalManualPage() {
  const router = useRouter();
  const utils = api.useUtils();

  const [form, setForm] = useState({
    nome: "Número de teste Meta",
    whatsapp_phone_number_id: "",
    whatsapp_business_account_id: "",
    whatsapp_phone_display: "",
    whatsapp_business_account_nome: "",
    access_token: "",
  });

  const [canalCriado, setCanalCriado] = useState<{ id: string } | null>(null);
  const [teste, setTeste] = useState({
    para: "",
    template_name: "hello_world",
    language_code: "en_US",
  });
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);

  const criarManual = api.canal.criarManual.useMutation({
    onSuccess: (data) => {
      setCanalCriado({ id: data.id });
      utils.canal.listar.invalidate();
    },
  });

  const enviarTeste = api.canal.enviarTeste.useMutation({
    onSuccess: (data) => {
      setResultadoTeste(`Sucesso — message_id: ${data.resposta?.messages?.[0]?.id ?? "?"}`);
    },
    onError: (err) => {
      setResultadoTeste(`Erro: ${err.message}`);
    },
  });

  function handleCriar() {
    criarManual.mutate({
      nome: form.nome.trim(),
      whatsapp_phone_number_id: form.whatsapp_phone_number_id.trim(),
      whatsapp_business_account_id: form.whatsapp_business_account_id.trim(),
      whatsapp_phone_display: form.whatsapp_phone_display.trim() || undefined,
      whatsapp_business_account_nome:
        form.whatsapp_business_account_nome.trim() || undefined,
      access_token: form.access_token.trim(),
    });
  }

  function handleEnviarTeste() {
    if (!canalCriado) return;
    setResultadoTeste(null);
    enviarTeste.mutate({
      canal_id: canalCriado.id,
      para: teste.para.replace(/\D/g, ""),
      template_name: teste.template_name.trim(),
      language_code: teste.language_code.trim(),
    });
  }

  const podeCriar =
    form.nome.trim().length >= 2 &&
    /^\d+$/.test(form.whatsapp_phone_number_id.trim()) &&
    /^\d+$/.test(form.whatsapp_business_account_id.trim()) &&
    form.access_token.trim().length > 20;

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
        <div className="h-10 w-10 rounded-lg bg-orange-500/10 text-orange-600 inline-flex items-center justify-center">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Conectar com credenciais manuais
          </h1>
          <p className="text-muted-foreground text-sm">
            Cole Phone Number ID, WABA ID e Access Token do painel Meta
            developers.
          </p>
        </div>
      </div>

      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardContent className="pt-5 space-y-2 text-xs text-muted-foreground">
          <div>
            <strong className="text-foreground">Quando usar:</strong> número de
            teste do painel Meta (<code>developers.facebook.com/apps</code> →
            WhatsApp → API Setup), System User Token, ou qualquer caso em que o
            OAuth não está configurado.
          </div>
          <div>
            <strong className="text-foreground">Atenção:</strong> o token de
            teste do painel Meta expira em 24h. Pra produção, use OAuth ou gere
            um System User Token permanente.
          </div>
        </CardContent>
      </Card>

      {!canalCriado ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credenciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Apelido do canal</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Número de teste"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone Number ID</Label>
                <Input
                  value={form.whatsapp_phone_number_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      whatsapp_phone_number_id: e.target.value,
                    }))
                  }
                  placeholder="214709365058593"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp Business Account ID</Label>
                <Input
                  value={form.whatsapp_business_account_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      whatsapp_business_account_id: e.target.value,
                    }))
                  }
                  placeholder="224044924120499"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Número de exibição (opcional)</Label>
                <Input
                  value={form.whatsapp_phone_display}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      whatsapp_phone_display: e.target.value,
                    }))
                  }
                  placeholder="+1 (555) 073-0659"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nome da WABA (opcional)</Label>
                <Input
                  value={form.whatsapp_business_account_nome}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      whatsapp_business_account_nome: e.target.value,
                    }))
                  }
                  placeholder="Minha WABA de Teste"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Access Token</Label>
              <textarea
                value={form.access_token}
                onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))}
                placeholder="EAASYVw...cole o token inteiro aqui"
                className="w-full min-h-[90px] rounded-md border bg-background px-3 py-2 text-sm font-mono break-all"
              />
            </div>

            {criarManual.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {criarManual.error.message}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleCriar}
              disabled={!podeCriar || criarManual.isPending}
            >
              {criarManual.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando canal...
                </>
              ) : (
                "Conectar canal"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2 text-success font-medium">
              <CheckCircle2 className="h-5 w-5" />
              Canal criado com sucesso
            </div>
            <p className="text-sm text-muted-foreground">
              Agora você pode enviar um template de teste pra validar que a
              credencial funciona.
            </p>
          </CardContent>
        </Card>
      )}

      {canalCriado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enviar mensagem de teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              Usa o template <code>hello_world</code> (pré-aprovado em toda WABA
              nova). O destinatário precisa estar na lista "Recipients" do painel
              Meta se você estiver usando o número de teste.
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Destinatário (E.164 só dígitos)</Label>
                <Input
                  value={teste.para}
                  onChange={(e) => setTeste((t) => ({ ...t, para: e.target.value }))}
                  placeholder="5511972425144"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Template</Label>
                <Input
                  value={teste.template_name}
                  onChange={(e) =>
                    setTeste((t) => ({ ...t, template_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Idioma</Label>
                <Input
                  value={teste.language_code}
                  onChange={(e) =>
                    setTeste((t) => ({ ...t, language_code: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleEnviarTeste}
                disabled={!teste.para.trim() || enviarTeste.isPending}
              >
                {enviarTeste.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar template
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/ferramentas-chat/canais")}
              >
                Voltar aos canais
              </Button>
            </div>

            {resultadoTeste && (
              <div
                className={
                  resultadoTeste.startsWith("Sucesso")
                    ? "rounded-md bg-success/10 border border-success/20 p-3 text-sm text-success font-mono break-all"
                    : "rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-mono break-all"
                }
              >
                {resultadoTeste}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
