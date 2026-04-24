"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Instagram,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function InstagramCanaisPage() {
  const utils = api.useUtils();
  const { data: canais, isLoading } = api.instagram.listar.useQuery();
  const { data: disponiveis, isLoading: loadingDisp, error: dispErr } =
    api.instagram.listarDisponiveis.useQuery();

  const conectar = api.instagram.conectar.useMutation({
    onSuccess: () => utils.instagram.listar.invalidate(),
  });
  const desconectar = api.instagram.desconectar.useMutation({
    onSuccess: () => utils.instagram.listar.invalidate(),
  });

  const [nomeApelido, setNomeApelido] = useState<Record<string, string>>({});

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
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
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 text-white inline-flex items-center justify-center">
          <Instagram className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Instagram</h1>
          <p className="text-muted-foreground text-sm">
            DMs e comentários de Instagram Professional Accounts conectados via
            Facebook Login.
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 border p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Pré-requisito:</strong> a conta Instagram
        precisa ser <strong>Professional</strong> e estar vinculada a uma{" "}
        <strong>Page do Facebook</strong>. A conexão usa o mesmo OAuth Meta
        (Integrações → Meta).
      </div>

      {/* Canais já conectados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas conectadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : !canais?.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta Instagram conectada ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {canais.map((c: any) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white inline-flex items-center justify-center flex-shrink-0">
                      <Instagram className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        @{c.username} <span className="text-muted-foreground text-xs">· {c.nome}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        Page: {c.pagina_nome} ·{" "}
                        {c.seguidores?.toLocaleString("pt-BR") ?? "—"} seguidores
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.ativo ? "success" : "secondary"}>
                      {c.ativo ? "ativo" : "inativo"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Desconectar @${c.username}?`)) {
                          desconectar.mutate({ id: c.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Disponíveis pra conectar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disponíveis pra conectar</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDisp ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando contas...
            </div>
          ) : dispErr ? (
            <div className="rounded-md bg-warning/10 border border-warning/20 p-3 text-sm text-warning">
              {dispErr.message}
              <Link
                href="/integracoes"
                className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
              >
                Conectar Meta <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : !disponiveis?.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta Instagram Professional vinculada às Pages que você tem
              acesso. Converte sua conta IG pra Professional e linka com a Page.
            </p>
          ) : (
            <ul className="space-y-2">
              {disponiveis.map((d: any) => {
                const jaConectada = canais?.some(
                  (c: any) =>
                    c.instagram_business_account_id === d.instagram_business_account_id,
                );
                return (
                  <li
                    key={d.instagram_business_account_id}
                    className="flex items-center justify-between p-3 rounded-md border gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white inline-flex items-center justify-center flex-shrink-0">
                        <Instagram className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">@{d.username}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          Page: {d.pagina_nome} ·{" "}
                          {d.followers_count?.toLocaleString("pt-BR") ?? "—"} seguidores
                        </div>
                      </div>
                    </div>
                    {jaConectada ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Conectada
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          placeholder="Apelido"
                          value={
                            nomeApelido[d.instagram_business_account_id] ??
                            `@${d.username}`
                          }
                          onChange={(e) =>
                            setNomeApelido((s) => ({
                              ...s,
                              [d.instagram_business_account_id]: e.target.value,
                            }))
                          }
                          className="h-8 w-32 sm:w-40 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            conectar.mutate({
                              nome:
                                nomeApelido[d.instagram_business_account_id] ??
                                `@${d.username}`,
                              instagram_business_account_id:
                                d.instagram_business_account_id,
                              username: d.username,
                              pagina_id: d.pagina_id,
                              pagina_nome: d.pagina_nome,
                              access_token: d.access_token,
                              seguidores: d.followers_count,
                            })
                          }
                          disabled={conectar.isPending}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Conectar
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
