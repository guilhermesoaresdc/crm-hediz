"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Check, ExternalLink } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Aba = "geral" | "perfil";

const VERTICAIS: Array<{ value: string; label: string }> = [
  { value: "UNDEFINED", label: "Outros" },
  { value: "OTHER", label: "Outros" },
  { value: "AUTO", label: "Automotivo" },
  { value: "BEAUTY", label: "Beleza, Spa e Salão" },
  { value: "APPAREL", label: "Moda e Vestuário" },
  { value: "EDU", label: "Educação" },
  { value: "ENTERTAIN", label: "Entretenimento" },
  { value: "EVENT_PLAN", label: "Eventos" },
  { value: "FINANCE", label: "Finanças e Bancos" },
  { value: "GROCERY", label: "Alimentos e Mercado" },
  { value: "GOVT", label: "Governo" },
  { value: "HOTEL", label: "Hotelaria e Hospedagem" },
  { value: "HEALTH", label: "Saúde" },
  { value: "NONPROFIT", label: "ONG" },
  { value: "PROF_SERVICES", label: "Serviços Profissionais" },
  { value: "RETAIL", label: "Varejo" },
  { value: "TRAVEL", label: "Viagens e Turismo" },
  { value: "RESTAURANT", label: "Restaurante" },
];

function qualityBadge(rating?: string | null) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  const variant =
    rating === "GREEN"
      ? "success"
      : rating === "YELLOW"
        ? "warning"
        : rating === "RED"
          ? "destructive"
          : "secondary";
  const label =
    rating === "GREEN"
      ? "Alta"
      : rating === "YELLOW"
        ? "Média"
        : rating === "RED"
          ? "Baixa"
          : "Desconhecido";
  return <Badge variant={variant as "success" | "warning" | "destructive" | "secondary"}>{label}</Badge>;
}

function statusBadge(status?: string | null) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const normalized = status.toLowerCase();
  const isOk =
    normalized.includes("approved") ||
    normalized.includes("verified") ||
    normalized === "green";
  return (
    <Badge variant={isOk ? "success" : "secondary"}>
      {isOk ? "Aprovado" : status}
    </Badge>
  );
}

export function CanalConfigModal({
  canalId,
  onClose,
}: {
  canalId: string;
  onClose: () => void;
}) {
  const [aba, setAba] = useState<Aba>("geral");
  const utils = api.useUtils();

  const { data: detalhes, isLoading } = api.canal.obterDetalhes.useQuery(
    { id: canalId },
    { enabled: !!canalId },
  );
  const { data: equipes } = api.equipe.listar.useQuery();
  const { data: usuarios } = api.usuario.listar.useQuery({
    apenas_ativos: true,
  });

  const atualizar = api.canal.atualizar.useMutation({
    onSuccess: () => {
      utils.canal.listar.invalidate();
      utils.canal.obterDetalhes.invalidate({ id: canalId });
    },
  });

  // Form state (geral)
  const [equipeId, setEquipeId] = useState<string>("");
  const [corretorId, setCorretorId] = useState<string>("");
  const [fonteLead, setFonteLead] = useState<string>("");
  const [importarContatos, setImportarContatos] = useState<boolean>(false);
  const [limite, setLimite] = useState<string>("");
  const [nome, setNome] = useState<string>("");

  useEffect(() => {
    if (!detalhes) return;
    setNome(detalhes.nome ?? "");
    setEquipeId(detalhes.equipe_id ?? "");
    setCorretorId(detalhes.corretor_id ?? "");
    setFonteLead(detalhes.fonte_lead_padrao ?? "");
    setImportarContatos(detalhes.importar_contatos ?? false);
    setLimite(
      detalhes.limite_mensagens_mensal != null
        ? String(detalhes.limite_mensagens_mensal)
        : "",
    );
  }, [detalhes]);

  function salvarGeral() {
    atualizar.mutate({
      id: canalId,
      nome: nome.trim() || undefined,
      equipe_id: equipeId ? equipeId : null,
      corretor_id: corretorId ? corretorId : null,
      fonte_lead_padrao: fonteLead.trim() || null,
      importar_contatos: importarContatos,
      limite_mensagens_mensal: limite ? Number(limite) : null,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            {isLoading || !detalhes ? (
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="font-mono text-sm font-medium">
                  {detalhes.whatsapp_phone_display ?? "—"}
                </div>
                <div className="font-semibold text-base">
                  {detalhes.verified_name ?? detalhes.nome}
                </div>
                <div className="text-xs text-muted-foreground">
                  Aplicativo WhatsApp Business
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b px-5 pt-3">
          <button
            onClick={() => setAba("geral")}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-[1px] transition-colors",
              aba === "geral"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Visão geral
          </button>
          <button
            onClick={() => setAba("perfil")}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-[1px] transition-colors",
              aba === "perfil"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Informações do perfil
          </button>
        </div>

        <CardContent className="p-5 space-y-5">
          {isLoading || !detalhes ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : aba === "geral" ? (
            <>
              <div className="space-y-1">
                <Label>Nome do canal (apelido interno)</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Camila - vendas"
                />
              </div>

              <div className="space-y-1">
                <Label>Fonte do lead</Label>
                <Input
                  value={fonteLead}
                  onChange={(e) => setFonteLead(e.target.value)}
                  placeholder="Rótulo que aparece nos leads vindos deste número"
                />
                <p className="text-xs text-muted-foreground">
                  Aplicado automaticamente no campo "origem" dos novos leads deste canal.
                </p>
              </div>

              <div className="space-y-1">
                <Label>Equipe padrão</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={equipeId}
                  onChange={(e) => setEquipeId(e.target.value)}
                >
                  <option value="">Nenhuma (rateio global)</option>
                  {equipes?.map((eq: { id: string; nome: string }) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Corretor padrão</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={corretorId}
                  onChange={(e) => setCorretorId(e.target.value)}
                >
                  <option value="">Nenhum (rateio da equipe)</option>
                  {usuarios
                    ?.filter(
                      (u: { role: string; equipe_id: string | null }) =>
                        u.role === "corretor" &&
                        (!equipeId || u.equipe_id === equipeId),
                    )
                    .map((u: { id: string; nome: string }) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                </select>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input accent-primary"
                  checked={importarContatos}
                  onChange={(e) => setImportarContatos(e.target.checked)}
                />
                <div>
                  <div className="text-sm font-medium">Importar contatos</div>
                  <div className="text-xs text-muted-foreground">
                    Cria automaticamente leads no CRM a partir de novas conversas no
                    WhatsApp. Desative para gerenciar manualmente.
                  </div>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Classificação de qualidade</Label>
                  <div className="h-10 flex items-center">
                    {qualityBadge(detalhes.quality_rating)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Limite de mensagens mensal</Label>
                  <Input
                    type="number"
                    min={0}
                    value={limite}
                    onChange={(e) => setLimite(e.target.value)}
                    placeholder="Sem limite"
                  />
                </div>
              </div>

              {/* Read-only: Conta WABA */}
              <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Conta WhatsApp Business
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-y-1.5 text-sm">
                  <div className="text-muted-foreground">Nome da conta</div>
                  <div>{detalhes.whatsapp_business_account_nome ?? "—"}</div>
                  <div className="text-muted-foreground">ID</div>
                  <div className="font-mono text-xs">
                    {detalhes.whatsapp_business_account_id}
                  </div>
                  <div className="text-muted-foreground">Status</div>
                  <div>{statusBadge(detalhes.waba_status)}</div>
                </div>
              </div>

              {/* Read-only: Portfólio Meta Business */}
              <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Portfólio Meta Business
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-y-1.5 text-sm">
                  <div className="text-muted-foreground">Nome da empresa</div>
                  <div>{detalhes.meta_business_nome ?? "—"}</div>
                  <div className="text-muted-foreground">Status</div>
                  <div>{statusBadge(detalhes.meta_business_status)}</div>
                </div>
              </div>

              <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-xs flex items-start gap-2">
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                <span>
                  Para gerenciar configurações avançadas, monitorar desempenho ou
                  corrigir problemas de mensagens, acesse o{" "}
                  <a
                    href="https://business.facebook.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 underline"
                  >
                    Meta Business Suite
                  </a>
                  .
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={salvarGeral} disabled={atualizar.isPending}>
                  {atualizar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Salvar alterações
                </Button>
              </div>
              {atualizar.isSuccess && !atualizar.isPending && (
                <p className="text-xs text-success text-right">✓ Salvo</p>
              )}
              {atualizar.error && (
                <p className="text-xs text-destructive text-right">
                  {atualizar.error.message}
                </p>
              )}
            </>
          ) : (
            <AbaPerfil canalId={canalId} detalhes={detalhes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Aba: Informações do Perfil (WhatsApp Business Profile via Graph API)
// =============================================================================

function AbaPerfil({
  canalId,
  detalhes,
}: {
  canalId: string;
  detalhes: {
    verified_name: string | null;
    whatsapp_phone_display: string | null;
    waba_status: string | null;
  };
}) {
  const utils = api.useUtils();
  const { data: perfil, isLoading } = api.canal.obterPerfilWhatsapp.useQuery(
    { id: canalId },
    { enabled: !!canalId },
  );
  const atualizar = api.canal.atualizarPerfilWhatsapp.useMutation({
    onSuccess: () => utils.canal.obterPerfilWhatsapp.invalidate({ id: canalId }),
  });

  const [about, setAbout] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [vertical, setVertical] = useState("UNDEFINED");
  const [website1, setWebsite1] = useState("");
  const [website2, setWebsite2] = useState("");

  useEffect(() => {
    if (!perfil) return;
    setAbout(perfil.about ?? "");
    setDescription(perfil.description ?? "");
    setAddress(perfil.address ?? "");
    setEmail(perfil.email ?? "");
    setVertical(perfil.vertical ?? "UNDEFINED");
    setWebsite1(perfil.websites?.[0] ?? "");
    setWebsite2(perfil.websites?.[1] ?? "");
  }, [perfil]);

  function salvar() {
    const websites = [website1, website2].filter((w) => w.trim().length > 0);
    atualizar.mutate({
      id: canalId,
      about: about.trim() || undefined,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      email: email.trim() || undefined,
      vertical: vertical || undefined,
      websites: websites.length > 0 ? websites : undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Nome de exibição (read-only — precisa passar por aprovação Meta) */}
      <div className="space-y-1">
        <Label>Nome de exibição</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-10 flex items-center px-3 rounded-md border bg-muted/40 text-sm">
            {detalhes.verified_name ?? "—"}
          </div>
          {statusBadge(detalhes.waba_status)}
        </div>
        <p className="text-xs text-muted-foreground">
          O nome de exibição só pode ser alterado via Meta Business Suite — exige nova
          aprovação.
        </p>
      </div>

      <div className="space-y-1">
        <Label>Indústria</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={vertical}
          onChange={(e) => setVertical(e.target.value)}
        >
          {VERTICAIS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label>Sobre (about) — até 139 caracteres</Label>
        <Input
          maxLength={139}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Texto curto exibido no perfil"
        />
      </div>

      <div className="space-y-1">
        <Label>Descrição (opcional) — até 512 caracteres</Label>
        <textarea
          className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
          maxLength={512}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição detalhada do seu negócio"
        />
      </div>

      <div className="space-y-1">
        <Label>Endereço (opcional)</Label>
        <Input
          maxLength={256}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Coloque o endereço da sua empresa"
        />
      </div>

      <div className="space-y-1">
        <Label>Email (opcional)</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemplo@email.com"
        />
      </div>

      <div className="space-y-1">
        <Label>Website (opcional)</Label>
        <Input
          type="url"
          value={website1}
          onChange={(e) => setWebsite1(e.target.value)}
          placeholder="https://"
        />
        <Input
          type="url"
          value={website2}
          onChange={(e) => setWebsite2(e.target.value)}
          placeholder="https:// (segundo site, opcional)"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={salvar} disabled={atualizar.isPending}>
          {atualizar.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Salvar perfil
        </Button>
      </div>
      {atualizar.isSuccess && !atualizar.isPending && (
        <p className="text-xs text-success text-right">✓ Perfil atualizado na Meta</p>
      )}
      {atualizar.error && (
        <p className="text-xs text-destructive text-right">
          {atualizar.error.message}
        </p>
      )}
    </div>
  );
}
