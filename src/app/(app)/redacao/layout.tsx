import { RedacaoNav } from "@/components/redacao/nav";

// A correção roda em segundo plano nesta rota: precisa de tempo de função longo (4 etapas de IA).
export const maxDuration = 300;

export default function RedacaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5" data-testid="redacao-elite">
      <RedacaoNav />
      {children}
    </div>
  );
}
