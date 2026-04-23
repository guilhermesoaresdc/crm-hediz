import { MessageCircle } from "lucide-react";
import { ChatNav } from "./_components/chat-nav";

export default function FerramentasChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row h-full min-h-0">
      <aside className="md:w-60 border-b md:border-b-0 md:border-r bg-card flex flex-col md:flex-shrink-0">
        <div className="p-3 md:p-4 border-b md:border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 inline-flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">Ferramentas do Chat</div>
              <div className="text-[11px] text-muted-foreground truncate">
                WhatsApp Business
              </div>
            </div>
          </div>
        </div>
        <ChatNav />
      </aside>
      <div className="flex-1 overflow-auto min-w-0">{children}</div>
    </div>
  );
}
