"use client";

import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function VendasPage() {
  const { data, isLoading } = api.venda.listar.useQuery();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold">Vendas</h1>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !data?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma venda registrada ainda. Registre uma venda pela página do lead vendido.
            </p>
          ) : (
            <div className="-mx-6 overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left border-b">
                    <th className="py-2 px-6">Lead</th>
                    <th className="py-2 px-3">Corretor</th>
                    <th className="py-2 px-3">Valor</th>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-6">CAPI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((v: any) => (
                    <tr key={v.id} className="border-b">
                      <td className="py-3 px-6">
                        <Link href={`/leads/${v.lead_id}`} className="hover:underline">
                          {v.lead?.nome ?? v.lead_id}
                        </Link>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{v.corretor?.nome ?? "—"}</td>
                      <td className="py-3 px-3 font-medium whitespace-nowrap">{formatCurrency(Number(v.valor_venda))}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{formatDate(v.data_venda)}</td>
                      <td className="py-3 px-6">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
