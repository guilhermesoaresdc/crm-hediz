import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ChatNav } from "./_components/chat-nav";

export default function FerramentasChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0">
      <aside className="w-60 border-r bg-card flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 inline-flex items-center justify-center">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Ferramentas do Chat</div>
              <div className="text-[11px] text-muted-foreground">
                WhatsApp Business
              </div>
            </div>
          </div>
        </div>
        <ChatNav />
      </aside>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
