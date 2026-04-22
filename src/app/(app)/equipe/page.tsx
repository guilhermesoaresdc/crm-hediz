"use client";

import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EquipePage() {
  const { data, isLoading } = api.usuario.listar.useQuery();

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">Equipe</h1>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !data?.length ? (
            <p className="text-muted-foreground text-center py-8">Nenhum usuário.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left border-b">
                  <th className="py-2">Nome</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Leads hoje</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u: any) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-3 font-medium">{u.nome}</td>
                    <td className="py-3 text-muted-foreground">{u.email}</td>
                    <td className="py-3">
                      <Badge variant="outline">{u.role}</Badge>
                    </td>
                    <td className="py-3">
                      {!u.ativo ? (
                        <Badge variant="destructive">inativo</Badge>
                      ) : u.em_pausa ? (
                        <Badge variant="warning">em pausa</Badge>
                      ) : (
                        <Badge variant="success">ativo</Badge>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {u.leads_hoje}/{u.limite_leads_dia}
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
