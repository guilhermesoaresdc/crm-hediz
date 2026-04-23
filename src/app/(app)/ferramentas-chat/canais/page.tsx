"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Settings2,
  Phone,
  Facebook,
  PhoneCall,
  MessageCircle,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { EmbeddedSignupButton } from "@/components/embedded-signup-button";

export default function CanaisPage() {
  const utils = api.useUtils();
  const { data: canais, isLoading } = api.canal.listar.useQuery();
  const { data: features } = api.config.features.useQuery();
  const { data: config } = api.config.obter.useQuery();

  const deletar = api.canal.deletar.useMutation({
    onSuccess: () => utils.canal.listar.invalidate(),
  });
  const atualizar = api.canal.atualizar.useMutation({
    onSuccess: () => utils.canal.listar.invalidate(),
  });

  const oauthPronto =
    (features?.metaOauthEnabled ?? false) && !!config?.meta_access_token_present;
  const embeddedPronto =
    (features?.embeddedSignupEnabled ?? false) &&
    !!features?.meta_app_id &&
    !!features?.embedded_config_id;

  const [signupMsg, setSignupMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function handleSignupSuccess(criados: Array<{ id: string; nome: string; phone: string }>) {
    if (criados.length === 0) {
      setSignupMsg({
        ok: false,
        text: "Nenhum canal novo criado (talvez já estavam conectados).",
      });
    } else {
      setSignupMsg({
        ok: true,
        text: `✓ ${criados.length} canal(is) criado(s): ${criados.map((c) => c.nome).join(", ")}`,
      });
      utils.canal.listar.invalidate();
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Canais</h1>
          <p className="text-muted-foreground text-sm">
            Conecte quantos números WhatsApp Business precisar
          </p>
        </div>
        {oauthPronto ? (
          <div className="flex gap-2 flex-wrap">
            {embeddedPronto && features ? (
              <EmbeddedSignupButton
                appId={features.meta_app_id!}
                configId={features.embedded_config_id!}
                onSuccess={handleSignupSuccess}
                onError={(msg) => setSignupMsg({ ok: false, text: msg })}
              >
                <MessageCircle className="h-4 w-4" />
                Conectar WhatsApp
              </EmbeddedSignupButton>
            ) : (
              <Link href="/ferramentas-chat/canais/novo">
                <Button>
                  <Plus className="h-4 w-4" />
                  Conectar número existente
                </Button>
              </Link>
            )}
            <Link href="/ferramentas-chat/canais/novo-numero">
              <Button variant="outline">
                <PhoneCall className="h-4 w-4" />
                Cadastrar número novo (avançado)
              </Button>
            </Link>
          </div>
        ) : (
          <Link href="/integracoes">
            <Button variant="outline">
              <Facebook className="h-4 w-4" />
              Conectar Meta primeiro
            </Button>
          </Link>
        )}
      </div>

      {!oauthPronto && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-5">
            <div className="font-semibold text-sm mb-1">Pré-requisito</div>
            <div className="text-xs text-muted-foreground">
              Pra listar seus WhatsApp Business Accounts, você precisa autenticar com
              Facebook primeiro em <strong>Integrações</strong>. Depois volta aqui e o
              botão "Conectar novo número" vai funcionar.
            </div>
          </CardContent>
        </Card>
      )}

      {signupMsg && (
        <div
          className={
            signupMsg.ok
              ? "rounded-md bg-success/10 border border-success/20 p-3 text-sm text-success"
              : "rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
          }
        >
          {signupMsg.text}
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Carregando canais...</p>
      ) : !canais?.length ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <Phone className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
            <div>
              <div className="font-semibold">Nenhum canal conectado</div>
              <div className="text-sm text-muted-foreground mt-1">
                Conecte seu primeiro número WhatsApp Business pra começar a enviar e
                receber mensagens.
              </div>
            </div>
            {oauthPronto && (
              <div className="flex gap-2 justify-center flex-wrap">
                {embeddedPronto && features ? (
                  <EmbeddedSignupButton
                    appId={features.meta_app_id!}
                    configId={features.embedded_config_id!}
                    onSuccess={handleSignupSuccess}
                    onError={(msg) => setSignupMsg({ ok: false, text: msg })}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Conectar WhatsApp
                  </EmbeddedSignupButton>
                ) : (
                  <Link href="/ferramentas-chat/canais/novo">
                    <Button>
                      <Plus className="h-4 w-4" />
                      Conectar número existente
                    </Button>
                  </Link>
                )}
                <Link href="/ferramentas-chat/canais/novo-numero">
                  <Button variant="outline">
                    <PhoneCall className="h-4 w-4" />
                    Cadastrar número novo
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-3 py-3 font-medium">Nome</th>
                  <th className="px-3 py-3 font-medium">WABA</th>
                  <th className="px-3 py-3 font-medium">Qualidade</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {canais.map((c: any) => (
                  <tr key={c.id} className="border-b">
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium">
                        {c.whatsapp_phone_display ?? "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.whatsapp_phone_number_id}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{c.nome}</div>
                      {c.verified_name && (
                        <div className="text-xs text-muted-foreground">
                          {c.verified_name}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">
                      {c.whatsapp_business_account_nome ?? c.whatsapp_business_account_id}
                    </td>
                    <td className="px-3 py-3">
                      {c.quality_rating ? (
                        <Badge
                          variant={
                            c.quality_rating === "GREEN"
                              ? "success"
                              : c.quality_rating === "YELLOW"
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {c.quality_rating}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {c.ativo ? (
                        <Badge variant="success">ativo</Badge>
                      ) : (
                        <Badge variant="secondary">inativo</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            atualizar.mutate({ id: c.id, ativo: !c.ativo })
                          }
                          title={c.ativo ? "Desativar" : "Reativar"}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Remover o canal "${c.nome}"?`)) {
                              deletar.mutate({ id: c.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
