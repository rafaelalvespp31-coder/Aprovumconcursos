import Link from "next/link";
import { Lock } from "lucide-react";
import { publicEnv } from "@/lib/env";
import { CadastroForm } from "@/components/cadastro/cadastro-form";
import { CadastroRodape } from "@/components/cadastro/cadastro-rodape";
import "@/components/cadastro/cadastro.css";

export const metadata = { title: "Criar conta" };

/**
 * Tela de cadastro tática do APROVUM. A arte do topo (soldado, caveira, marca e bandeira) é uma
 * camada de imagem; todo o formulário é HTML real ligado ao cadastro existente (Supabase).
 */
export default function SignUpPage() {
  const configured = publicEnv().configured;
  return (
    <div className="cd-tela">
      <div className="cd-fundo" aria-hidden>
        <span className="cd-fumaca" />
        <span className="cd-faixa cd-faixa-e1" />
        <span className="cd-faixa cd-faixa-e2" />
        <span className="cd-faixa cd-faixa-d1" />
        <span className="cd-faixa cd-faixa-d2" />
        <span className="cd-brasas">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</span>
      </div>

      <header className="cd-hero">
        <div className="cd-hero-desfoque" aria-hidden />
        <div className="cd-hero-arte">
          <Link href="/" aria-label="APROVUM — início" className="cd-hero-link">
            <picture>
              <source media="(max-width: 640px)" srcSet="/cadastro/hero-sm.webp 941w, /cadastro/hero.webp 1882w" sizes="100vw" />
              <img src="/cadastro/hero.webp" alt="APROVUM — Sua preparação. Seu próximo cargo." width={1882} height={652} fetchPriority="high" decoding="async" />
            </picture>
          </Link>
          <p className="cd-selo">
            <Lock aria-hidden strokeWidth={2.4} />
            <span>
              <b>Ambiente Seguro</b>
              <small>Seus dados protegidos</small>
            </span>
          </p>
        </div>
      </header>

      <main className="cd-palco">
        {!configured && (
          <p className="cd-aviso" role="alert">
            Autenticação não configurada: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
          </p>
        )}
        <CadastroForm />
      </main>

      <CadastroRodape />
    </div>
  );
}
