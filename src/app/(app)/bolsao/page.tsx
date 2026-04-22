"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function BolsaoPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const { data, isLoading, refetch } = api.bolsao.disponiveis.useQuery();

  const pegar = api.bolsao.pegar.useMutation({
    onSuccess: (_r, vars) => {
      utils.bolsao.disponiveis.invalidate();
      utils.lead.listar.invalidate();
      router.push(`/leads/${vars.lead_id}`);
    },
  });

  // Poll a cada 15s enquanto tela está aberta
  useEffect(() => {
    const t = setInterval(() => refetch(), 15_000);
    return () => clearInterval(t);
  }, [refetch]);

  return (
    <div className="p-8 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Bolsão</h1>
        <p className="text-muted-foreground">
          Leads disponíveis pra qualquer corretor elegível pegar. Primeiro que pegar leva.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !data?.length ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum lead no bolsão no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((lead: any) => (
            <Card key={lead.id}>
              <CardHeader>
                <CardTitle className="text-base">{lead.nome}</CardTitle>
                <div className="text-sm text-muted-foreground">{lead.whatsapp}</div>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.campanha?.nome && (
                  <Badge variant="outline">📣 {lead.campanha.nome}</Badge>
                )}
                {lead.anuncio?.nome && (
                  <div className="text-xs text-muted-foreground">🎯 {lead.anuncio.nome}</div>
                )}
                <div className="text-xs text-muted-foreground">
                  Expira: {formatDate(lead.bolsao_expira_em)}
                </div>
                <Button
                  className="w-full"
                  disabled={pegar.isPending}
                  onClick={() => pegar.mutate({ lead_id: lead.id })}
                >
                  Pegar lead
                </Button>
                {pegar.error && (
                  <p className="text-xs text-destructive">{pegar.error.message}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
