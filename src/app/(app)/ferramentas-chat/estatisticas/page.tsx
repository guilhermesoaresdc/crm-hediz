import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function EstatisticasPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Estatísticas</h1>
        <p className="text-muted-foreground text-sm">
          Entregas, leituras, cliques e custo por conversa do WhatsApp
        </p>
      </div>

      <Card>
        <CardContent className="pt-10 pb-10 text-center space-y-3">
          <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
          <div>
            <div className="font-semibold">Em breve</div>
            <div className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Gráficos de entregas/leituras por dia, tempo médio até primeira
              resposta, custo mensal por número (WhatsApp cobra por conversa) e
              taxa de conversão por template.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
