"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ConfiguracoesPage() {
  const utils = api.useUtils();
  const { data: config } = api.config.obter.useQuery();
  const { data: imo } = api.imobiliaria.current.useQuery();

  const atualizar = api.config.atualizar.useMutation({
    onSuccess: () => utils.config.obter.invalidate(),
  });
  const conectarMeta = api.config.conectarMeta.useMutation({
    onSuccess: () => utils.config.obter.invalidate(),
  });
  const conectarWa = api.config.conectarWhatsapp.useMutation({
    onSuccess: () => utils.config.obter.invalidate(),
  });

  const [bolsao, setBolsao] = useState({
    bolsao_ativo: true,
    bolsao_timeout_minutos: 5,
    bolsao_elegibilidade: "mesma_equipe" as const,
    bolsao_limite_diario_por_corretor: 5,
  });
  const [fee, setFee] = useState({
    fee_agencia_tipo: "fixo" as const,
    fee_agencia_valor: 0,
  });

  useEffect(() => {
    if (config) {
      setBolsao({
        bolsao_ativo: config.bolsao_ativo,
        bolsao_timeout_minutos: config.bolsao_timeout_minutos,
        bolsao_elegibilidade: config.bolsao_elegibilidade as never,
        bolsao_limite_diario_por_corretor: config.bolsao_limite_diario_por_corretor,
      });
      setFee({
        fee_agencia_tipo: config.fee_agencia_tipo as never,
        fee_agencia_valor: Number(config.fee_agencia_valor),
      });
    }
  }, [config]);

  const [metaForm, setMetaForm] = useState({
    meta_business_id: "",
    meta_ad_account_id: "",
    meta_page_id: "",
    meta_access_token: "",
    meta_pixel_id: "",
    meta_capi_token: "",
  });
  const [waForm, setWaForm] = useState({
    whatsapp_phone_number_id: "",
    whatsapp_business_account_id: "",
    whatsapp_access_token: "",
  });

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Imobiliária</CardTitle>
          <CardDescription>{imo?.nome}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Slug:</span> {imo?.slug}
          </div>
          <div>
            <span className="text-muted-foreground">Plano:</span> {imo?.plano}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bolsão</CardTitle>
          <CardDescription>
            Regras pra quando um lead atribuído não recebe primeira mensagem no tempo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timeout (minutos)</Label>
              <Input
                type="number"
                value={bolsao.bolsao_timeout_minutos}
                onChange={(e) =>
                  setBolsao({ ...bolsao, bolsao_timeout_minutos: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Elegibilidade</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={bolsao.bolsao_elegibilidade}
                onChange={(e) =>
                  setBolsao({ ...bolsao, bolsao_elegibilidade: e.target.value as never })
                }
              >
                <option value="todos">Todos os corretores</option>
                <option value="mesma_equipe">Mesma equipe</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Limite diário por corretor</Label>
              <Input
                type="number"
                value={bolsao.bolsao_limite_diario_por_corretor}
                onChange={(e) =>
                  setBolsao({
                    ...bolsao,
                    bolsao_limite_diario_por_corretor: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <Button onClick={() => atualizar.mutate(bolsao)} disabled={atualizar.isPending}>
            {atualizar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee da agência</CardTitle>
          <CardDescription>
            Entra no cálculo de ROAS real (custo total = mídia + fee).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={fee.fee_agencia_tipo}
                onChange={(e) =>
                  setFee({ ...fee, fee_agencia_tipo: e.target.value as never })
                }
              >
                <option value="sem_fee">Sem fee</option>
                <option value="fixo">Fixo mensal (R$)</option>
                <option value="percentual">% do gasto em mídia</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                value={fee.fee_agencia_valor}
                onChange={(e) => setFee({ ...fee, fee_agencia_valor: Number(e.target.value) })}
              />
            </div>
          </div>
          <Button onClick={() => atualizar.mutate(fee)} disabled={atualizar.isPending}>
            Salvar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integração Meta Ads + CAPI</CardTitle>
          <CardDescription>
            {config?.meta_conectado_em ? "Conectado" : "Não conectado"}
            {config?.meta_conectado_em ? ` em ${new Date(config.meta_conectado_em).toLocaleDateString()}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Input
              placeholder="Business ID"
              value={metaForm.meta_business_id}
              onChange={(e) => setMetaForm({ ...metaForm, meta_business_id: e.target.value })}
            />
            <Input
              placeholder="Ad Account ID (com act_)"
              value={metaForm.meta_ad_account_id}
              onChange={(e) => setMetaForm({ ...metaForm, meta_ad_account_id: e.target.value })}
            />
            <Input
              placeholder="Page ID"
              value={metaForm.meta_page_id}
              onChange={(e) => setMetaForm({ ...metaForm, meta_page_id: e.target.value })}
            />
            <Input
              placeholder="Pixel ID"
              value={metaForm.meta_pixel_id}
              onChange={(e) => setMetaForm({ ...metaForm, meta_pixel_id: e.target.value })}
            />
            <Input
              placeholder="Access Token (Business)"
              value={metaForm.meta_access_token}
              onChange={(e) => setMetaForm({ ...metaForm, meta_access_token: e.target.value })}
            />
            <Input
              placeholder="CAPI Access Token"
              value={metaForm.meta_capi_token}
              onChange={(e) => setMetaForm({ ...metaForm, meta_capi_token: e.target.value })}
            />
          </div>
          <Button onClick={() => conectarMeta.mutate(metaForm)} disabled={conectarMeta.isPending}>
            {conectarMeta.isPending ? "Salvando..." : "Conectar Meta"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Cloud API</CardTitle>
          <CardDescription>
            {config?.whatsapp_conectado_em ? "Conectado" : "Não conectado"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Input
              placeholder="Phone Number ID"
              value={waForm.whatsapp_phone_number_id}
              onChange={(e) =>
                setWaForm({ ...waForm, whatsapp_phone_number_id: e.target.value })
              }
            />
            <Input
              placeholder="Business Account ID"
              value={waForm.whatsapp_business_account_id}
              onChange={(e) =>
                setWaForm({ ...waForm, whatsapp_business_account_id: e.target.value })
              }
            />
            <Input
              placeholder="Access Token"
              value={waForm.whatsapp_access_token}
              onChange={(e) => setWaForm({ ...waForm, whatsapp_access_token: e.target.value })}
              className="md:col-span-2"
            />
          </div>
          <Button onClick={() => conectarWa.mutate(waForm)} disabled={conectarWa.isPending}>
            {conectarWa.isPending ? "Salvando..." : "Conectar WhatsApp"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
