"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function NovoLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    observacoes: "",
  });

  const criar = api.lead.criar.useMutation({
    onSuccess: (res) => {
      if (res.ja_existia) {
        // Mostra aviso inline, não redireciona direto
        return;
      }
      router.push(`/leads/${res.id}`);
    },
  });

  // Debounced check pra mostrar duplicado ENQUANTO digita
  const [whatsappParaChecar, setWhatsappParaChecar] = useState("");
  useEffect(() => {
    if (form.whatsapp.replace(/\D/g, "").length < 10) {
      setWhatsappParaChecar("");
      return;
    }
    const t = setTimeout(() => setWhatsappParaChecar(form.whatsapp), 600);
    return () => clearTimeout(t);
  }, [form.whatsapp]);

  const { data: duplicados } = api.lead.verificarDuplicados.useQuery(
    { whatsapp: whatsappParaChecar },
    { enabled: !!whatsappParaChecar },
  );

  const temDuplicado = (duplicados?.length ?? 0) > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Novo lead</h1>

      {/* Aviso de lead já existente (após tentativa) */}
      {criar.data?.ja_existia && (
        <Card className="mb-4 border-warning/40 bg-warning/5">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Lead já existia</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {criar.data.aviso}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/leads/${criar.data.id}`}>
                <Button size="sm">Abrir lead existente</Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  criar.mutate({
                    nome: form.nome,
                    whatsapp: form.whatsapp,
                    email: form.email || undefined,
                    observacoes: form.observacoes || undefined,
                    origem: "manual",
                    forcar_duplicado: true,
                  });
                }}
              >
                Criar mesmo assim (duplicado)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados do lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              criar.mutate({
                nome: form.nome,
                whatsapp: form.whatsapp,
                email: form.email || undefined,
                observacoes: form.observacoes || undefined,
                origem: "manual",
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                required
                placeholder="+55 11 99999-9999"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />

              {/* Preview de duplicados encontrados ao digitar */}
              {temDuplicado && (
                <div className="rounded-md bg-warning/10 border border-warning/20 p-2 text-xs space-y-2">
                  <div className="font-medium flex items-center gap-1 text-warning">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Já existe lead com esse número:
                  </div>
                  {duplicados?.map((d: any) => (
                    <Link
                      key={d.id}
                      href={`/leads/${d.id}`}
                      className="flex items-center justify-between p-2 rounded bg-background hover:bg-accent transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{d.nome}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {d.whatsapp} · {formatDate(d.created_at)}
                          {d.corretor?.nome && ` · ${d.corretor.nome}`}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {d.status}
                      </Badge>
                    </Link>
                  ))}
                  <p className="text-[11px] text-muted-foreground">
                    Se criar, os campos que faltavam no lead existente serão
                    enriquecidos automaticamente em vez de duplicar.
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
            {criar.error && (
              <p className="text-sm text-destructive">{criar.error.message}</p>
            )}
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : temDuplicado ? (
                "Abrir lead existente (enriquecer)"
              ) : (
                "Criar e distribuir"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Se o WhatsApp já existir, abrimos o lead existente e enriquecemos os
              campos em branco — evitando duplicados.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
