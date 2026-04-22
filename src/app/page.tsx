import Link from "next/link";
import { ArrowRight, Zap, Target, TrendingUp, ShieldCheck } from "lucide-react";
import { HedizWordmark } from "@/components/hediz-logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-16 border-b glass sticky top-0 z-40 flex items-center">
        <div className="container flex items-center justify-between">
          <HedizWordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium mb-8 shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              CRM imobiliário · Atribuição ponta a ponta
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
              Do clique no anúncio <br />
              <span className="text-gradient">até o fechamento</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Descubra qual criativo, campanha e corretor geram vendas reais — com ROAS
              que inclui fee da agência. Devolvemos essa inteligência pro Meta.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Testar 14 dias grátis <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-20 max-w-5xl mx-auto grid md:grid-cols-4 gap-6">
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Roleta + Bolsão"
              desc="Round-robin em 5min. Lock atômico. Elegibilidade configurável."
            />
            <Feature
              icon={<Target className="h-5 w-5" />}
              title="Atribuição real"
              desc="fbclid, UTMs e Meta Lead ID persistidos desde o primeiro clique."
            />
            <Feature
              icon={<TrendingUp className="h-5 w-5" />}
              title="ROAS verdadeiro"
              desc="Custo mídia + fee agência vs faturamento. Por campanha, conjunto e anúncio."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Purchase pro Meta"
              desc="CAPI com event_time do lead original. Atribui mesmo 90 dias depois."
            />
          </div>
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="container flex items-center justify-between text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Hédiz · Todos os direitos reservados</div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Login
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Criar conta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-5 rounded-xl border bg-card shadow-card">
      <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-3">
        {icon}
      </div>
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}
