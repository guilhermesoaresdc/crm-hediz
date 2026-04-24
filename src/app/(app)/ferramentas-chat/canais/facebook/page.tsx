"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Facebook,
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
import { Badge } from "@/components/ui/badge";

export default function FacebookCanaisPage() {
  const utils = api.useUtils();
  const { data: canais, isLoading } = api.facebook.listar.useQuery();
  const { data: disponiveis, isLoading: loadingDisp, error: dispErr } =
    api.facebook.listarDisponiveis.useQuery();

  const conectar = api.facebook.conectar.useMutation({
    onSuccess: () => utils.facebook.listar.invalidate(),
  });
  const desconectar = api.facebook.desconectar.useMutation({
    onSuccess: () => utils.facebook.listar.invalidate(),
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
        <div className="h-10 w-10 rounded-lg bg-blue-600 text-white inline-flex items-center justify-center">
          <Facebook className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Facebook Pages</h1>
          <p className="text-muted-foreground text-sm">
            Messenger e comentários de Pages do Facebook. Conexão via OAuth Meta.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Páginas conectadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : !canais?.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma Page conectada ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {canais.map((c: any) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-md border gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {c.pagina_foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.pagina_foto_url}
                        alt=""
                        className="h-9 w-9 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-blue-600 text-white inline-flex items-center justify-center flex-shrink-0">
                        <Facebook className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {c.pagina_nome}{" "}
                        <span className="text-muted-foreground text-xs">· {c.nome}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.categoria ?? "Page"} ·{" "}
                        {c.curtidas?.toLocaleString("pt-BR") ?? "—"} curtidas
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
                        if (confirm(`Desconectar ${c.pagina_nome}?`)) {
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disponíveis pra conectar</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDisp ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando Pages...
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
              Nenhuma Page disponível. Reconecte o Meta com permissões de Pages em
              /integracoes.
            </p>
          ) : (
            <ul className="space-y-2">
              {disponiveis.map((d: any) => {
                const jaConectada = canais?.some(
                  (c: any) => c.pagina_id === d.pagina_id,
                );
                return (
                  <li
                    key={d.pagina_id}
                    className="flex items-center justify-between p-3 rounded-md border gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {d.pagina_foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.pagina_foto_url}
                          alt=""
                          className="h-9 w-9 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-blue-600 text-white inline-flex items-center justify-center flex-shrink-0">
                          <Facebook className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{d.pagina_nome}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {d.categoria ?? "Page"} ·{" "}
                          {d.curtidas?.toLocaleString("pt-BR") ?? "—"} curtidas
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
                          value={nomeApelido[d.pagina_id] ?? d.pagina_nome}
                          onChange={(e) =>
                            setNomeApelido((s) => ({
                              ...s,
                              [d.pagina_id]: e.target.value,
                            }))
                          }
                          className="h-8 w-32 sm:w-40 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            conectar.mutate({
                              nome: nomeApelido[d.pagina_id] ?? d.pagina_nome,
                              pagina_id: d.pagina_id,
                              pagina_nome: d.pagina_nome,
                              pagina_foto_url: d.pagina_foto_url,
                              categoria: d.categoria,
                              curtidas: d.curtidas,
                              access_token: d.access_token,
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
