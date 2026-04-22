import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex items-center justify-between h-16">
          <div className="font-semibold text-lg">CRM Hédiz</div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/signup">
              <Button>Começar trial</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1 container flex items-center">
        <div className="max-w-3xl mx-auto py-20 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Atribuição de ponta a ponta pro seu negócio imobiliário
          </h1>
          <p className="text-xl text-muted-foreground mb-10">
            Do clique no anúncio até a venda fechada. Descubra qual criativo, campanha e
            corretor geram vendas reais — e devolva essa inteligência pro Meta.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg">Testar grátis por 14 dias</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CRM Hédiz
      </footer>
    </main>
  );
}
