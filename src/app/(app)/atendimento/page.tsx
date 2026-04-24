"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Search,
  Send,
  Instagram,
  Facebook,
  Inbox,
  FileText,
  Loader2,
  ArrowLeft,
  Clock,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Channel = "whatsapp" | "instagram" | "facebook";

export default function AtendimentoPage() {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [busca, setBusca] = useState("");
  const [conversaId, setConversaId] = useState<string | null>(null);

  const { data: conversas, isLoading } = api.conversa.listar.useQuery(
    { busca: busca || undefined },
    { enabled: channel === "whatsapp", refetchInterval: 15_000 },
  );

  return (
    <div className="h-full flex flex-col">
      {/* Tabs de canais (omnichannel) */}
      <div className="border-b bg-card px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-end gap-1 overflow-x-auto">
          <ChannelTab
            active={channel === "whatsapp"}
            onClick={() => setChannel("whatsapp")}
            icon={<MessageCircle className="h-4 w-4" />}
            label="WhatsApp"
            badge={conversas?.length ?? 0}
            color="text-green-600"
          />
          <ChannelTab
            active={channel === "instagram"}
            onClick={() => setChannel("instagram")}
            icon={<Instagram className="h-4 w-4" />}
            label="Instagram"
            disabled
            soon
          />
          <ChannelTab
            active={channel === "facebook"}
            onClick={() => setChannel("facebook")}
            icon={<Facebook className="h-4 w-4" />}
            label="Facebook"
            disabled
            soon
          />
        </div>
      </div>

      {channel !== "whatsapp" ? (
        <EmBreve channel={channel} />
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Lista de conversas */}
          <aside
            className={cn(
              "w-full md:w-[340px] md:flex-shrink-0 border-r flex flex-col bg-card",
              conversaId && "hidden md:flex",
            )}
          >
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar nome ou número..."
                  className="w-full h-9 pl-9 pr-3 rounded-md bg-muted/50 border border-transparent focus:border-border focus:bg-background outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando conversas...
                </div>
              ) : !conversas || conversas.length === 0 ? (
                <EmptyList />
              ) : (
                <ul>
                  {conversas.map((c: any) => (
                    <li key={c.id}>
                      <button
                        onClick={() => setConversaId(c.id)}
                        className={cn(
                          "w-full text-left px-3 py-3 border-b hover:bg-accent/50 transition-colors flex gap-3",
                          conversaId === c.id && "bg-primary/5 border-l-2 border-l-primary",
                        )}
                      >
                        <Avatar nome={c.lead?.nome ?? c.whatsapp_numero} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="font-medium text-sm truncate">
                              {c.lead?.nome ?? c.whatsapp_numero}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex-shrink-0">
                              {c.ultima_mensagem_em
                                ? formatDateShort(c.ultima_mensagem_em)
                                : ""}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {c.ultima_mensagem
                              ? prefixoMensagem(c.ultima_mensagem)
                              : "Sem mensagens"}
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 h-4">
                              {c.canal?.verified_name ?? c.canal?.nome ?? "WhatsApp"}
                            </Badge>
                            {c.corretor?.nome && (
                              <span className="text-[10px] text-muted-foreground">
                                · {c.corretor.nome}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* Chat ativo */}
          <section
            className={cn(
              "flex-1 flex flex-col min-w-0",
              !conversaId && "hidden md:flex",
            )}
          >
            {conversaId ? (
              <ConversaView
                conversaId={conversaId}
                onBack={() => setConversaId(null)}
              />
            ) : (
              <EmptyChat />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ConversaView({
  conversaId,
  onBack,
}: {
  conversaId: string;
  onBack: () => void;
}) {
  const utils = api.useUtils();
  const { data: conversa } = api.conversa.detalhes.useQuery({ id: conversaId });
  const { data: mensagens, isLoading } = api.mensagem.listarPorConversa.useQuery(
    { conversa_id: conversaId },
    { refetchInterval: 15_000 },
  );
  const { data: templates } = api.template.listar.useQuery(
    conversa?.canal_id ? { canal_id: conversa.canal_id } : undefined,
    { enabled: !!conversa },
  );

  const enviar = api.mensagem.enviar.useMutation({
    onSuccess: () => {
      utils.mensagem.listarPorConversa.invalidate({ conversa_id: conversaId });
      utils.conversa.listar.invalidate();
    },
  });

  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState<"texto" | "template">("texto");
  const [templateId, setTemplateId] = useState<string>("");

  const l = (conversa as any)?.lead;
  const canal = (conversa as any)?.canal;

  // Janela de 24h: se a última mensagem RECEBIDA foi há mais de 24h ou nunca,
  // Meta exige template pra novos envios.
  const ultimaRecebida = (mensagens ?? [])
    .filter((m: any) => m.direcao === "recebida")
    .pop();
  const dentroJanela24h = ultimaRecebida
    ? Date.now() - new Date(ultimaRecebida.created_at).getTime() < 24 * 60 * 60 * 1000
    : false;

  const templatesAprovados = (templates ?? []).filter(
    (t: any) => t.status === "APPROVED",
  );

  function onEnviar() {
    if (!l?.id) return;
    if (modo === "texto") {
      if (!texto.trim()) return;
      enviar.mutate(
        { lead_id: l.id, tipo: "texto", texto },
        { onSuccess: () => setTexto("") },
      );
    } else {
      const tpl = templatesAprovados.find((t: any) => t.id === templateId);
      if (!tpl) return;
      enviar.mutate(
        {
          lead_id: l.id,
          tipo: "template",
          template_nome: tpl.nome,
          template_idioma: tpl.idioma ?? "pt_BR",
        },
        { onSuccess: () => setTemplateId("") },
      );
    }
  }

  return (
    <>
      {/* Header da conversa */}
      <div className="border-b bg-card p-3 flex items-center gap-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={onBack}
          className="md:hidden h-8 w-8 p-0 flex-shrink-0"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar nome={l?.nome ?? conversa?.whatsapp_numero ?? "?"} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">
            {l?.nome ?? conversa?.whatsapp_numero}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {conversa?.whatsapp_numero} · {canal?.verified_name ?? canal?.nome}
          </div>
        </div>
        {l?.id && (
          <Link href={`/leads/${l.id}`}>
            <Button size="sm" variant="outline">
              Abrir lead
            </Button>
          </Link>
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-muted/20 space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : !mensagens || mensagens.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Nenhuma mensagem ainda. Envie a primeira abaixo.
          </div>
        ) : (
          mensagens.map((m: any) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.direcao === "enviada" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-md px-3 py-2 text-sm",
                  m.direcao === "enviada"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border",
                )}
              >
                <div className="whitespace-pre-wrap break-words">
                  {m.conteudo ||
                    (m.template_nome ? `📋 Template: ${m.template_nome}` : "—")}
                </div>
                <div
                  className={cn(
                    "mt-1 text-[11px] flex items-center gap-1",
                    m.direcao === "enviada"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {formatDate(m.created_at)}
                  {m.status_entrega && ` · ${m.status_entrega}`}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t bg-card p-3 space-y-2">
        {!dentroJanela24h && (
          <div className="flex items-start gap-2 text-xs bg-warning/10 text-warning border border-warning/20 rounded-md p-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Fora da janela de 24h.</strong> O WhatsApp oficial só permite
              texto livre depois que o cliente responde. Use um template aprovado pra
              iniciar o contato.
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setModo("texto")}
            className={cn(
              "px-2 py-1 rounded transition-colors",
              modo === "texto" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent",
            )}
          >
            Texto livre
          </button>
          <button
            onClick={() => setModo("template")}
            className={cn(
              "px-2 py-1 rounded transition-colors inline-flex items-center gap-1",
              modo === "template" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <FileText className="h-3 w-3" />
            Template ({templatesAprovados.length})
          </button>
        </div>

        {modo === "texto" ? (
          <div className="flex gap-2 items-end">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onEnviar();
                }
              }}
              placeholder={
                dentroJanela24h
                  ? "Digite sua mensagem... (Enter envia)"
                  : "Cliente fora da janela de 24h — use um template."
              }
              rows={2}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none min-h-[44px]"
              disabled={enviar.isPending}
            />
            <Button
              onClick={onEnviar}
              disabled={!texto.trim() || enviar.isPending}
              size="sm"
              className="h-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione um template aprovado...</option>
              {templatesAprovados.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.idioma})
                </option>
              ))}
            </select>
            <Button
              onClick={onEnviar}
              disabled={!templateId || enviar.isPending}
              size="sm"
              className="h-10"
            >
              <Send className="h-4 w-4 mr-1" />
              Enviar
            </Button>
          </div>
        )}

        {modo === "template" && templatesAprovados.length === 0 && (
          <div className="text-xs text-muted-foreground">
            Nenhum template aprovado.{" "}
            <Link
              href="/ferramentas-chat/modelos/novo"
              className="text-primary hover:underline"
            >
              Criar agora →
            </Link>
          </div>
        )}

        {enviar.error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1">
            {enviar.error.message}
          </div>
        )}
      </div>
    </>
  );
}

function ChannelTab({
  active,
  onClick,
  icon,
  label,
  badge,
  color,
  disabled,
  soon,
}: {
  active: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  color?: string;
  disabled?: boolean;
  soon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium transition-colors rounded-t-md whitespace-nowrap",
        active
          ? "bg-background border border-b-background border-border -mb-px text-foreground"
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span className={active ? color : undefined}>{icon}</span>
      {label}
      {badge != null && badge > 0 && (
        <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-semibold">
          {badge}
        </span>
      )}
      {soon && (
        <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded">
          em breve
        </span>
      )}
    </button>
  );
}

function Avatar({ nome }: { nome: string }) {
  const initials = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
      {initials || "?"}
    </div>
  );
}

function EmptyList() {
  return (
    <div className="p-6 text-center space-y-2">
      <Inbox className="h-8 w-8 text-muted-foreground mx-auto" />
      <div className="text-sm font-medium">Nenhuma conversa ainda</div>
      <div className="text-xs text-muted-foreground">
        Quando um lead responder ou você iniciar um contato via WhatsApp, a conversa
        aparece aqui.
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center space-y-3 max-w-sm">
        <div className="h-14 w-14 rounded-full bg-muted inline-flex items-center justify-center">
          <MessageCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-base font-semibold">Selecione uma conversa</div>
        <div className="text-sm text-muted-foreground">
          Escolha uma conversa da lista ao lado pra ver as mensagens e responder.
        </div>
      </div>
    </div>
  );
}

function EmBreve({ channel }: { channel: Channel }) {
  const cfg = {
    instagram: {
      icon: <Instagram className="h-7 w-7" />,
      nome: "Instagram",
      descricao: "DMs e comentários do Instagram em um único lugar.",
      cor: "bg-gradient-to-br from-pink-500 to-purple-600 text-white",
    },
    facebook: {
      icon: <Facebook className="h-7 w-7" />,
      nome: "Facebook",
      descricao: "Mensagens e comentários de páginas do Facebook.",
      cor: "bg-blue-600 text-white",
    },
    whatsapp: {
      icon: <MessageCircle className="h-7 w-7" />,
      nome: "WhatsApp",
      descricao: "",
      cor: "bg-green-600 text-white",
    },
  }[channel];

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div
          className={cn(
            "h-16 w-16 rounded-2xl inline-flex items-center justify-center",
            cfg.cor,
          )}
        >
          {cfg.icon}
        </div>
        <div>
          <div className="text-xl font-bold">{cfg.nome} · em breve</div>
          <div className="text-sm text-muted-foreground mt-1">{cfg.descricao}</div>
        </div>
        <div className="text-xs text-muted-foreground">
          A integração com {cfg.nome} está em desenvolvimento. Vai aparecer aqui junto
          com as conversas do WhatsApp.
        </div>
      </div>
    </div>
  );
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const agora = new Date();
  const mesmoDia =
    d.getDate() === agora.getDate() &&
    d.getMonth() === agora.getMonth() &&
    d.getFullYear() === agora.getFullYear();
  if (mesmoDia) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  if (
    d.getDate() === ontem.getDate() &&
    d.getMonth() === ontem.getMonth() &&
    d.getFullYear() === ontem.getFullYear()
  ) {
    return "ontem";
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function prefixoMensagem(m: any): string {
  const prefixo = m.direcao === "enviada" ? "Você: " : "";
  if (m.tipo === "template") return `${prefixo}📋 ${m.template_nome ?? "template"}`;
  const txt = m.conteudo ?? "";
  return `${prefixo}${txt.slice(0, 60)}${txt.length > 60 ? "…" : ""}`;
}
