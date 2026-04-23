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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Parâmetros operacionais da sua imobiliária
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imobiliária</CardTitle>
          <CardDescription>{imo?.nome}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Slug</div>
            <div className="font-mono">{imo?.slug}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Plano</div>
            <div>{imo?.plano}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Timezone</div>
            <div>{imo?.timezone}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bolsão de leads</CardTitle>
          <CardDescription>
            Regras pra quando um lead atribuído não recebe primeira mensagem no prazo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Timeout (minutos)</Label>
              <Input
                type="number"
                value={bolsao.bolsao_timeout_minutos}
                onChange={(e) =>
                  setBolsao({ ...bolsao, bolsao_timeout_minutos: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Elegibilidade</Label>
              <select
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={bolsao.bolsao_elegibilidade}
                onChange={(e) =>
                  setBolsao({ ...bolsao, bolsao_elegibilidade: e.target.value as never })
                }
              >
                <option value="todos">Todos os corretores</option>
                <option value="mesma_equipe">Mesma equipe</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Limite diário / corretor</Label>
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
            Entra no cálculo de ROAS real (custo total = mídia + fee)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={fee.fee_agencia_tipo}
                onChange={(e) => setFee({ ...fee, fee_agencia_tipo: e.target.value as never })}
              >
                <option value="sem_fee">Sem fee</option>
                <option value="fixo">Fixo mensal (R$)</option>
                <option value="percentual">% do gasto em mídia</option>
              </select>
            </div>
            <div className="space-y-1.5">
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
    </div>
  );
}
