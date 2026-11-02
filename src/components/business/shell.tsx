import type { ReactNode } from "react";
import {
  BarChart3,
  BadgeDollarSign,
  Gauge,
  LogOut,
  TrendingUp,
} from "lucide-react";
import {
  BUSINESS_SECTIONS,
  type BusinessSectionId,
} from "@/domain/partner/sections";

const ICON: Record<BusinessSectionId, ReactNode> = {
  "visao-geral": <Gauge />,
  crescimento: <TrendingUp />,
  comercial: <BadgeDollarSign />,
  desempenho: <BarChart3 />,
};

/** Moldura do APROVUM BUSINESS: menu lateral (no celular, barra no topo) com as seções liberadas. */
export function BusinessShell({
  sections,
  who,
  signOut,
  children,
}: {
  sections: ReadonlySet<BusinessSectionId>;
  who: { name: string | null; email: string | null };
  signOut?: () => Promise<void>;
  children: ReactNode;
}) {
  const nav = BUSINESS_SECTIONS.filter((s) => sections.has(s.id));
  return (
    <div className="bz" data-testid="business-shell">
      <aside className="bz-lateral">
        <div className="bz-marca">
          <span className="bz-marca-a">APROVUM</span>
          <span className="bz-marca-b">BUSINESS</span>
          <span className="bz-marca-c">Partner Dashboard</span>
        </div>
        {nav.length > 0 && (
          <nav aria-label="Seções" className="bz-nav">
            {nav.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                <span aria-hidden>{ICON[s.id]}</span>
                {s.label}
              </a>
            ))}
          </nav>
        )}
        <div className="bz-quem">
          <p className="truncate font-semibold text-white">
            {who.name ?? "Sócio"}
          </p>
          {who.email && <p className="truncate">{who.email}</p>}
          {signOut && (
            <form action={signOut}>
              <button type="submit" className="bz-sair">
                <LogOut aria-hidden /> Sair
              </button>
            </form>
          )}
        </div>
      </aside>
      <main className="bz-conteudo">
        <header className="bz-cabecalho">
          <p className="bz-sobre">APROVUM BUSINESS — PARTNER DASHBOARD</p>
          <h1>Indicadores da plataforma</h1>
        </header>
        {children}
      </main>
    </div>
  );
}

/** Estado sem indicadores (acesso desativado, sem permissão, erro). */
export function BusinessNotice({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div className="bz-card bz-estado" data-testid={testId} role="status">
      <p className="text-lg font-bold text-white">{title}</p>
      <div>{children}</div>
    </div>
  );
}
