"use client";

import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function VendasPage() {
  const { data, isLoading } = api.venda.listar.useQuery();

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">Vendas</h1>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !data?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma venda registrada ainda. Registre uma venda pela página do lead vendido.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left border-b">
                  <th className="py-2">Lead</th>
                  <th className="py-2">Corretor</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Data</th>
                  <th className="py-2">CAPI</th>
                </tr>
              </thead>
              <tbody>
                {data.map((v: any) => (
                  <tr key={v.id} className="border-b">
                    <td className="py-3">
                      <Link href={`/leads/${v.lead_id}`} className="hover:underline">
                        {v.lead?.nome ?? v.lead_id}
                      </Link>
                    </td>
                    <td className="py-3">{v.corretor?.nome ?? "—"}</td>
                    <td className="py-3 font-medium">{formatCurrency(Number(v.valor_venda))}</td>
                    <td className="py-3">{formatDate(v.data_venda)}</td>
                    <td className="py-3">
                      {v.enviado_capi ? (
                        <Badge variant="success">enviado</Badge>
                      ) : (
                        <Badge variant="warning">pendente</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
