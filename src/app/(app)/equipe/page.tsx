"use client";

import { useState } from "react";
import { Copy, UserPlus, Check } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Role = "gerente" | "corretor" | "financeiro";

export default function EquipePage() {
  const utils = api.useUtils();
  const { data: usuarios, isLoading } = api.usuario.listar.useQuery();
  const { data: equipes } = api.equipe.listar.useQuery();
  const { data: me } = api.auth.me.useQuery();

  const [modalOpen, setModalOpen] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{
    email: string;
    senha: string;
    nome: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    role: "corretor" as Role,
    equipe_id: "",
    telefone: "",
    creci: "",
  });

  const convidar = api.usuario.convidar.useMutation({
    onSuccess: (res) => {
      setSenhaGerada({ email: form.email, senha: res.senha_temporaria, nome: form.nome });
      setModalOpen(false);
      setForm({ nome: "", email: "", role: "corretor", equipe_id: "", telefone: "", creci: "" });
      utils.usuario.listar.invalidate();
    },
  });

  const desativar = api.usuario.desativar.useMutation({
    onSuccess: () => utils.usuario.listar.invalidate(),
  });
  const reativar = api.usuario.reativar.useMutation({
    onSuccess: () => utils.usuario.listar.invalidate(),
  });

  const podeGerenciar = me?.role === "super_admin";

  function copiarCredenciais() {
    if (!senhaGerada) return;
    const texto = `Email: ${senhaGerada.email}\nSenha temporária: ${senhaGerada.senha}\n\nAcesse em: ${window.location.origin}/login`;
    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground text-sm">
            {usuarios?.length ?? 0} usuários
          </p>
        </div>
        {podeGerenciar && (
          <Button onClick={() => setModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Convidar corretor</span>
            <span className="sm:hidden">Convidar</span>
          </Button>
        )}
      </div>

      {/* Banner com credenciais geradas */}
      {senhaGerada && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-green-800 dark:text-green-300 mb-2">
                  ✓ {senhaGerada.nome} foi adicionado(a)
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  Envie estas credenciais ao corretor. Ele pode trocar a senha depois.
                </div>
                <div className="font-mono text-sm bg-background rounded border p-3 space-y-1">
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-bold">{senhaGerada.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Senha:</span>{" "}
                    <span className="font-bold">{senhaGerada.senha}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={copiarCredenciais}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-2">{copied ? "Copiado" : "Copiar"}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSenhaGerada(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de convite */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setModalOpen(false)}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Convidar pessoa para a equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  convidar.mutate({
                    nome: form.nome,
                    email: form.email,
                    role: form.role,
                    equipe_id: form.equipe_id || null,
                    telefone: form.telefone || undefined,
                    creci: form.creci || undefined,
                  });
                }}
              >
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input
                    required
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Role *</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    >
                      <option value="corretor">Corretor</option>
                      <option value="gerente">Gerente</option>
                      <option value="financeiro">Financeiro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Equipe</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.equipe_id}
                      onChange={(e) => setForm({ ...form, equipe_id: e.target.value })}
                    >
                      <option value="">Sem equipe</option>
                      {equipes?.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>CRECI</Label>
                    <Input
                      value={form.creci}
                      onChange={(e) => setForm({ ...form, creci: e.target.value })}
                    />
                  </div>
                </div>
                {convidar.error && (
                  <p className="text-sm text-destructive">{convidar.error.message}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={convidar.isPending}>
                    {convidar.isPending ? "Criando..." : "Criar conta"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !usuarios?.length ? (
            <p className="text-muted-foreground text-center py-8">Nenhum usuário.</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left border-b">
                    <th className="py-2 px-6">Nome</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Equipe</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Leads hoje</th>
                    {podeGerenciar && <th className="py-2 px-6 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const eq = equipes?.find((e) => e.id === u.equipe_id);
                    return (
                      <tr key={u.id} className="border-b">
                        <td className="py-3 px-6 font-medium whitespace-nowrap">{u.nome}</td>
                        <td className="py-3 px-3 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-3">
                          <Badge variant="outline">{u.role}</Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          {eq?.nome ?? "—"}
                        </td>
                        <td className="py-3 px-3">
                          {!u.ativo ? (
                            <Badge variant="destructive">inativo</Badge>
                          ) : u.em_pausa ? (
                            <Badge variant="warning">em pausa</Badge>
                          ) : (
                            <Badge variant="success">ativo</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          {u.leads_hoje}/{u.limite_leads_dia}
                        </td>
                        {podeGerenciar && (
                          <td className="py-3 px-6 text-right">
                            {u.id !== me?.id && (
                              u.ativo ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => desativar.mutate({ id: u.id })}
                                  disabled={desativar.isPending}
                                >
                                  Desativar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => reativar.mutate({ id: u.id })}
                                  disabled={reativar.isPending}
                                >
                                  Reativar
                                </Button>
                              )
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
