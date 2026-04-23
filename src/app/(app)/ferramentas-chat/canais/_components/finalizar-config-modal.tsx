"use client";

import { Check, Facebook, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type CanalCriado = {
  id: string;
  nome: string;
  phone: string;
};

export function FinalizarConfigModal({
  canais,
  onClose,
  onConfigurar,
}: {
  canais: CanalCriado[];
  onClose: () => void;
  onConfigurar: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-8 space-y-6">
          {/* Linha de progresso Kommo-style */}
          <div className="flex items-center justify-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center">
                <Check className="h-3 w-3 text-success-foreground" />
              </div>
              <span className="text-muted-foreground">Selecionar aplicativo</span>
            </div>
            <div className="h-px w-6 bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center">
                <Check className="h-3 w-3 text-success-foreground" />
              </div>
              <span className="text-muted-foreground">Conectar Facebook</span>
            </div>
            <div className="h-px w-6 bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center">
                <Check className="h-3 w-3 text-success-foreground" />
              </div>
              <span className="font-medium">Finalizar configuração</span>
            </div>
          </div>

          {/* Ícones Facebook + WhatsApp + CRM */}
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="h-12 w-12 rounded-full bg-[#1877F2] flex items-center justify-center">
              <Facebook className="h-6 w-6 text-white fill-white" />
            </div>
            <div className="w-12 border-t-2 border-dashed border-border" />
            <div className="h-10 w-10 rounded-full bg-[#25D366] flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white fill-white" />
            </div>
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              H
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">Finalizar configuração</h2>
            {canais.length === 1 ? (
              <p className="text-sm text-muted-foreground">
                Seu número{" "}
                <span className="font-mono font-medium text-foreground">
                  {canais[0].phone}
                </span>{" "}
                agora está conectado. Novas mensagens aparecerão no CRM Hediz. Se você
                selecionou a importação de chat, mantenha o aplicativo aberto no seu
                telefone.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {canais.length} números agora estão conectados. Novas mensagens
                aparecerão no CRM Hediz.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Você já pode começar a configurar modelos do WhatsApp e usá-los para
              automatizar conversas.
            </p>
          </div>

          {canais.length > 1 && (
            <div className="rounded-md border divide-y">
              {canais.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 text-sm"
                >
                  <div>
                    <div className="font-mono font-medium">{c.phone}</div>
                    <div className="text-xs text-muted-foreground">{c.nome}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onConfigurar(c.id)}
                  >
                    Configurar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-2">
            {canais.length === 1 && (
              <Button
                variant="outline"
                onClick={() => onConfigurar(canais[0].id)}
              >
                Configurar canal
              </Button>
            )}
            <Button onClick={onClose}>Finalizar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
