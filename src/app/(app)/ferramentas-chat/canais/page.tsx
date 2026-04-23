"use client";

import Link from "next/link";
import { Plus, Trash2, Settings2, Phone, Facebook } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

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

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Canais</h1>
          <p className="text-muted-foreground text-sm">
            Conecte quantos números WhatsApp Business precisar
          </p>
        </div>
        {oauthPronto ? (
          <Link href="/ferramentas-chat/canais/novo">
            <Button>
              <Plus className="h-4 w-4" />
              Conectar novo número
            </Button>
          </Link>
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
              <Link href="/ferramentas-chat/canais/novo">
                <Button>
                  <Plus className="h-4 w-4" />
                  Conectar primeiro número
                </Button>
              </Link>
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
