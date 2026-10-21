import { publicEnv } from "@/lib/env";
import { ENDED_ELSEWHERE } from "@/lib/session";
import { LoginHeader } from "@/components/login/login-header";
import { LoginForm } from "@/components/login/login-form";
import { FeatureHighlights } from "@/components/login/feature-highlights";
import { LoginFooter } from "@/components/login/login-footer";

export const metadata = { title: "Entrar" };

const NOTICES: Record<string, string> = {
  saiu: "Você saiu da sua conta.",
  link: "O link é inválido ou expirou. Entre novamente ou solicite um novo link.",
  [ENDED_ELSEWHERE]: "Sua conta foi acessada em outro aparelho e esta sessão foi encerrada. Cada conta fica conectada em um aparelho por vez.",
};

/**
 * Tela de login tática do APROVUM. A arte dos soldados é uma camada de imagem; todo o
 * formulário é HTML real, conectado ao login existente (Supabase).
 * Desktop: soldados à esquerda, painel à direita. Celular: soldados no topo e painel abaixo.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const notice = sp.saiu ? NOTICES.saiu : sp.erro === "link" ? NOTICES.link : sp.motivo === ENDED_ELSEWHERE ? NOTICES[ENDED_ELSEWHERE] : null;
  const configured = publicEnv().configured;
  return (
    <div className="login-tela">
      <div className="login-fundo" aria-hidden />
      {/* Desktop: cena de fundo em tela cheia (soldados à esquerda + fumaça); no celular a arte fica no topo */}
      <div className="login-cena" aria-hidden />
      <LoginHeader />

      <main className="login-palco">
        {/* Arte dos soldados (camada visual; não contém texto nem campos) */}
        <picture className="login-arte" aria-hidden>
          <source media="(max-width: 899px)" srcSet="/images/aprovum-login-hero-mobile.webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/aprovum-login-hero.webp" alt="" width={700} height={1040} fetchPriority="high" decoding="async" />
        </picture>

        <section className="login-painel-wrap" aria-labelledby="login-titulo">
          <div className="login-painel">
            <div className="login-painel-miolo">
              <span className="login-barras login-barras-titulo" aria-hidden>{"///"}</span>
              <h1 id="login-titulo" className="login-titulo">
                Acesso à
                <span className="block text-[#FF1E12]">plataforma</span>
              </h1>
              {!configured && (
                <p className="login-aviso login-aviso-erro mt-4" role="alert">
                  Autenticação não configurada: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
                </p>
              )}
              <div className="mt-6 lg:mt-8">
                <LoginForm next={sp.next} notice={notice} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <FeatureHighlights />
      <LoginFooter />
    </div>
  );
}
