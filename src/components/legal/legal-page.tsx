import Link from "next/link";
import type { ReactNode } from "react";
import { CONTATO_EMAIL, LEGAL_ATUALIZADO } from "@/lib/legal";

const LINKS = [["/privacidade", "Privacidade"], ["/termos", "Termos de uso"], ["/cookies", "Cookies"], ["/reembolso", "Reembolso"]] as const;

export function Contato() {
  return CONTATO_EMAIL
    ? <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>
    : <>a página <Link href="/perfil">Perfil</Link> da plataforma (seção &quot;Seus dados&quot;)</>;
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main id="conteudo" className="legal">
      <nav aria-label="Documentos legais" className="legal-nav">
        <Link href="/">← APROVUM</Link>
        {LINKS.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <article>
        <h1>{title}</h1>
        <p className="legal-data">Última atualização: {LEGAL_ATUALIZADO}</p>
        {children}
      </article>
    </main>
  );
}
