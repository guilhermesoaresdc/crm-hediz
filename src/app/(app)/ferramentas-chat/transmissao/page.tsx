import { Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TransmissaoPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Transmissão</h1>
        <p className="text-muted-foreground text-sm">
          Envie mensagens em massa para listas de leads usando templates aprovados
        </p>
      </div>

      <Card>
        <CardContent className="pt-10 pb-10 text-center space-y-3">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
          <div>
            <div className="font-semibold">Em breve</div>
            <div className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Crie listas filtradas (por equipe, campanha, status) e dispare
              mensagens usando qualquer template aprovado. Com controle de taxa
              de envio pra não exceder limites da Meta.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
