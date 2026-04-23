"use client";

import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Megaphone,
  BarChart3,
  Plug,
  CheckCircle2,
  Circle,
  Sparkles,
  Bot,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function FerramentasChatHubPage() {
  const { data: canais } = api.canal.listar.useQuery();
  const { data: templates } = api.template.listar.useQuery();

  const canaisAtivos = canais?.filter((c) => c.ativo).length ?? 0;
  const totalTemplates = templates?.length ?? 0;
  const temAoMenosUmCanal = (canais?.length ?? 0) > 0;
  const temAoMenosUmTemplate = totalTemplates > 0;

  // Progresso do setup
  const steps = [
    { done: temAoMenosUmCanal, label: "Conectar primeiro canal WhatsApp" },
    { done: temAoMenosUmTemplate, label: "Sincronizar modelos aprovados" },
    { done: false, label: "Configurar respostas automáticas (em breve)" },
    { done: false, label: "Criar primeira transmissão (em breve)" },
  ];
  const pct = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Ferramentas do Chat</h1>
        <p className="text-muted-foreground text-sm">
          WhatsApp Business — canais, modelos, transmissões e automações
        </p>
      </div>

      {/* Setup progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-baseline justify-between mb-1">
            <div className="font-semibold">Aproveite o WhatsApp ao máximo</div>
            <div className="text-sm text-muted-foreground">{pct}%</div>
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            Complete os passos abaixo pra destravar o potencial da operação.
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <ul className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className={cn(s.done && "text-muted-foreground line-through")}>
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Recursos */}
      <div>
        <div className="font-semibold mb-3">Recursos</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FeatureCard
            href="/ferramentas-chat/canais"
            icon={<Plug className="h-5 w-5" />}
            title="Canais"
            desc={
              canaisAtivos > 0
                ? `${canaisAtivos} número${canaisAtivos > 1 ? "s" : ""} conectado${canaisAtivos > 1 ? "s" : ""}`
                : "Conecte números WhatsApp Business"
            }
            accent="green"
          />
          <FeatureCard
            href="/ferramentas-chat/modelos"
            icon={<FileText className="h-5 w-5" />}
            title="Modelos"
            desc={
              totalTemplates > 0
                ? `${totalTemplates} template${totalTemplates > 1 ? "s" : ""} sincronizado${totalTemplates > 1 ? "s" : ""}`
                : "Templates oficiais aprovados pelo Meta"
            }
            accent="blue"
          />
          <FeatureCard
            href="/ferramentas-chat/transmissao"
            icon={<Megaphone className="h-5 w-5" />}
            title="Transmissão"
            desc="Envie mensagens em massa para listas de leads"
            accent="purple"
            soon
          />
          <FeatureCard
            href="/ferramentas-chat/estatisticas"
            icon={<BarChart3 className="h-5 w-5" />}
            title="Estatísticas"
            desc="Entregas, leituras, cliques e custo por conversa"
            accent="amber"
            soon
          />
          <FeatureCard
            href="#"
            icon={<Bot className="h-5 w-5" />}
            title="Bots (Salesbot)"
            desc="Fluxos automáticos com gatilhos e condições"
            accent="indigo"
            soon
          />
          <FeatureCard
            href="#"
            icon={<Sparkles className="h-5 w-5" />}
            title="Agente de IA"
            desc="Responda 24/7 com base em sua base de conhecimento"
            accent="pink"
            soon
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  href,
  icon,
  title,
  desc,
  accent,
  soon,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: "green" | "blue" | "purple" | "amber" | "indigo" | "pink";
  soon?: boolean;
}) {
  const accents = {
    green: "bg-green-500/10 text-green-600",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
    amber: "bg-amber-500/10 text-amber-600",
    indigo: "bg-indigo-500/10 text-indigo-600",
    pink: "bg-pink-500/10 text-pink-600",
  };

  const content = (
    <Card
      className={cn(
        "transition-all",
        !soon && "hover:border-primary/50 hover:shadow-md cursor-pointer",
        soon && "opacity-70",
      )}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              "h-10 w-10 rounded-lg inline-flex items-center justify-center",
              accents[accent],
            )}
          >
            {icon}
          </div>
          {soon ? (
            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              em breve
            </span>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="font-semibold mb-1">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
      </CardContent>
    </Card>
  );

  return soon ? content : <Link href={href}>{content}</Link>;
}
