"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Info } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BotaoQR = { type: "QUICK_REPLY"; text: string };
type BotaoURL = { type: "URL"; text: string; url: string };
type BotaoTel = { type: "PHONE_NUMBER"; text: string; phone_number: string };
type Botao = BotaoQR | BotaoURL | BotaoTel;
type TipoBotao = Botao["type"];

const CATEGORIAS = [
  {
    value: "UTILITY" as const,
    label: "Utility",
    desc: "Confirmações, updates, notificações transacionais. Preço menor.",
  },
  {
    value: "MARKETING" as const,
    label: "Marketing",
    desc: "Promoções, ofertas, convites. Preço maior e política mais rígida.",
  },
  {
    value: "AUTHENTICATION" as const,
    label: "Authentication",
    desc: "Códigos OTP, verificação 2FA.",
  },
];

export default function NovoTemplatePage() {
  const router = useRouter();
  const { data: canais } = api.canal.listar.useQuery();

  const [form, setForm] = useState({
    canal_id: "",
    nome: "",
    categoria: "UTILITY" as "UTILITY" | "MARKETING" | "AUTHENTICATION",
    idioma: "pt_BR",
    header_text: "",
    body_text: "",
    footer_text: "",
  });
  const [botoes, setBotoes] = useState<Botao[]>([]);
  const [exemplosHeader, setExemplosHeader] = useState<string[]>([]);
  const [exemplosBody, setExemplosBody] = useState<string[]>([]);

  // Auto-seleciona primeiro canal se só tem 1
  if (!form.canal_id && canais?.length === 1) {
    setForm((f) => ({ ...f, canal_id: canais[0].id }));
  }

  // Detecta variáveis {{1}}, {{2}} no header e body
  const varsHeader = useMemo(
    () => contarVariaveis(form.header_text),
    [form.header_text],
  );
  const varsBody = useMemo(() => contarVariaveis(form.body_text), [form.body_text]);

  const criar = api.template.criarNoMeta.useMutation({
    onSuccess: () => router.push("/ferramentas-chat/modelos"),
  });

  function addBotao(tipo: TipoBotao) {
    if (botoes.length >= 3) return;
    const novo: Botao =
      tipo === "URL"
        ? { type: "URL", text: "", url: "" }
        : tipo === "PHONE_NUMBER"
          ? { type: "PHONE_NUMBER", text: "", phone_number: "" }
          : { type: "QUICK_REPLY", text: "" };
    setBotoes([...botoes, novo]);
  }

  function updateBotao(i: number, patch: Partial<Botao>) {
    setBotoes(botoes.map((b, idx) => (idx === i ? ({ ...b, ...patch } as Botao) : b)));
  }

  function removeBotao(i: number) {
    setBotoes(botoes.filter((_, idx) => idx !== i));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    // Ajusta arrays de exemplos ao tamanho certo
    const expHeader = exemplosHeader.slice(0, varsHeader);
    const expBody = exemplosBody.slice(0, varsBody);

    // Normaliza pra discriminated union do Zod (TS não estreita Botao[] sozinho)
    const botoesNorm = botoes.map((b): Botao => {
      if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
      if (b.type === "PHONE_NUMBER")
        return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number };
      return { type: "QUICK_REPLY", text: b.text };
    });

    criar.mutate({
      canal_id: form.canal_id,
      nome: form.nome,
      categoria: form.categoria,
      idioma: form.idioma,
      header_text: form.header_text || undefined,
      body_text: form.body_text,
      footer_text: form.footer_text || undefined,
      botoes: botoesNorm.length ? (botoesNorm as never) : undefined,
      exemplos_header: expHeader.length ? expHeader : undefined,
      exemplos_body: expBody.length ? expBody : undefined,
    });
  }

  const bodyPreview = preencherVars(form.body_text, exemplosBody);
  const headerPreview = preencherVars(form.header_text, exemplosHeader);

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link
          href="/ferramentas-chat/modelos"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Modelos
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Novo modelo de mensagem</h1>
        <p className="text-muted-foreground text-sm">
          Criado na Meta como <strong>PENDING</strong>. Aprovação leva de minutos até
          24h.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* FORM */}
        <form onSubmit={enviar} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Básico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Canal *</Label>
                <select
                  required
                  value={form.canal_id}
                  onChange={(e) => setForm({ ...form, canal_id: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Selecione um canal</option>
                  {canais?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.whatsapp_phone_display})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome (interno) *</Label>
                  <Input
                    required
                    placeholder="boas_vindas_lead"
                    value={form.nome}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nome: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    só letras minúsculas, números e _
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Idioma *</Label>
                  <select
                    value={form.idioma}
                    onChange={(e) => setForm({ ...form, idioma: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="pt_BR">Português (BR)</option>
                    <option value="pt_PT">Português (PT)</option>
                    <option value="en_US">English (US)</option>
                    <option value="es_ES">Español (ES)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <div className="space-y-1.5">
                  {CATEGORIAS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, categoria: c.value })}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-md border text-sm transition-colors",
                        form.categoria === c.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent/50",
                      )}
                    >
                      <div className="font-medium">{c.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Cabeçalho (opcional) · máx 60 caracteres</Label>
                <Input
                  maxLength={60}
                  value={form.header_text}
                  onChange={(e) => setForm({ ...form, header_text: e.target.value })}
                  placeholder="Olá {{1}}!"
                />
                <p className="text-[11px] text-muted-foreground">
                  Use <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code> pra variáveis.
                </p>
              </div>

              {/* Exemplos header */}
              {varsHeader > 0 && (
                <div className="rounded-md bg-muted/50 p-3 space-y-2">
                  <div className="text-xs font-medium flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Exemplos pras variáveis do cabeçalho
                  </div>
                  {Array.from({ length: varsHeader }).map((_, i) => (
                    <Input
                      key={i}
                      placeholder={`Exemplo {{${i + 1}}}`}
                      value={exemplosHeader[i] ?? ""}
                      onChange={(e) => {
                        const novo = [...exemplosHeader];
                        novo[i] = e.target.value;
                        setExemplosHeader(novo);
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Corpo * · máx 1024 caracteres</Label>
                <textarea
                  required
                  maxLength={1024}
                  value={form.body_text}
                  onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                  placeholder="Oi {{1}}, sou o {{2}} da Hédiz Imobiliária. Vi seu interesse no imóvel {{3}}..."
                  className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  rows={5}
                />
                <p className="text-[11px] text-muted-foreground">
                  {form.body_text.length} / 1024 — detectadas {varsBody} variável
                  {varsBody !== 1 ? "s" : ""}
                </p>
              </div>

              {varsBody > 0 && (
                <div className="rounded-md bg-muted/50 p-3 space-y-2">
                  <div className="text-xs font-medium flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Exemplos pras variáveis do corpo (obrigatório)
                  </div>
                  {Array.from({ length: varsBody }).map((_, i) => (
                    <Input
                      key={i}
                      placeholder={`Exemplo {{${i + 1}}}`}
                      value={exemplosBody[i] ?? ""}
                      onChange={(e) => {
                        const novo = [...exemplosBody];
                        novo[i] = e.target.value;
                        setExemplosBody(novo);
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Rodapé (opcional) · máx 60 caracteres</Label>
                <Input
                  maxLength={60}
                  value={form.footer_text}
                  onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                  placeholder="Hédiz Imobiliária"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Botões (opcional, máx 3)</CardTitle>
                {botoes.length < 3 && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBotao("QUICK_REPLY")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Quick Reply
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBotao("URL")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      URL
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBotao("PHONE_NUMBER")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Telefone
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {botoes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum botão adicionado. Quick Reply envia texto de volta, URL abre
                  link, Telefone disca.
                </p>
              )}
              {botoes.map((b, i) => (
                <div
                  key={i}
                  className="p-3 rounded-md border bg-muted/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {b.type}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => removeBotao(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Texto do botão (máx 25)"
                    maxLength={25}
                    value={b.text}
                    onChange={(e) => updateBotao(i, { text: e.target.value })}
                  />
                  {b.type === "URL" && (
                    <Input
                      placeholder="https://..."
                      value={b.url ?? ""}
                      onChange={(e) => updateBotao(i, { url: e.target.value })}
                    />
                  )}
                  {b.type === "PHONE_NUMBER" && (
                    <Input
                      placeholder="+5511999999999"
                      value={b.phone_number ?? ""}
                      onChange={(e) =>
                        updateBotao(i, { phone_number: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {criar.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {criar.error.message}
            </div>
          )}

          <div className="flex gap-2 sticky bottom-0 bg-background py-3">
            <Button type="submit" disabled={criar.isPending || !form.canal_id}>
              {criar.isPending ? "Enviando pra Meta..." : "Enviar para aprovação"}
            </Button>
            <Link href="/ferramentas-chat/modelos">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>

        {/* PREVIEW */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Prévia
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20 border">
            <div className="max-w-[340px] bg-white dark:bg-card rounded-lg p-3 shadow-sm space-y-1.5">
              {(headerPreview || form.header_text) && (
                <div className="font-semibold text-sm">
                  {headerPreview || form.header_text}
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap min-h-[20px]">
                {bodyPreview || form.body_text || (
                  <span className="text-muted-foreground italic">
                    Digite o corpo da mensagem...
                  </span>
                )}
              </div>
              {form.footer_text && (
                <div className="text-xs text-muted-foreground italic pt-1">
                  {form.footer_text}
                </div>
              )}
              {botoes.length > 0 && (
                <div className="border-t pt-2 mt-2 space-y-1">
                  {botoes.map((b, i) => (
                    <div
                      key={i}
                      className="text-center text-sm text-primary py-1 border rounded-md bg-primary/5"
                    >
                      {b.text || `[Botão ${i + 1}]`}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 text-center">
              Assim aparece no WhatsApp do lead
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function contarVariaveis(text: string): number {
  const matches = text.match(/\{\{(\d+)\}\}/g) ?? [];
  const nums = matches.map((m) => parseInt(m.replace(/\{\{|\}\}/g, ""), 10));
  return nums.length > 0 ? Math.max(...nums) : 0;
}

function preencherVars(text: string, exemplos: string[]): string {
  if (!text) return "";
  return text.replace(/\{\{(\d+)\}\}/g, (_, numStr) => {
    const n = parseInt(numStr, 10) - 1;
    return exemplos[n] || `[${numStr}]`;
  });
}
