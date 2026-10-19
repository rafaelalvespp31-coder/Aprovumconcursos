import type { RulerState } from "@/components/coverage-ruler";
import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure } from "@/domain/content/extract";
import { getSessionUser } from "@/server/auth";
import { getPublicCatalogStats } from "@/server/public-stats";
import { publicEnv } from "@/lib/env";
import { LandingHeader } from "@/components/landing/header";
import { CareersCarousel } from "@/components/landing/careers-carousel";
import { LandingContentPreview, LandingFinalCta, LandingFooter, LandingHero, LandingHowItWorks, LandingStats } from "@/components/landing/sections";

const DEMO = `Art. 5º Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade, nos termos seguintes:
I - homens e mulheres são iguais em direitos e obrigações, nos termos desta Constituição;
II - ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei;
III - ninguém será submetido a tortura nem a tratamento desumano ou degradante;`;

// Estados ilustrativos para a demonstração (claramente identificados na página).
const DEMO_STATES: RulerState[] = ["dominado", "dominado", "dominado", "praticado", "ensinado", "ensinado", "nao_verificado", "planejado", "planejado", "planejado", "pendente", "pendente", "pendente", "pendente"];

/**
 * Landing pública do APROVUM: cabeçalho, hero, carrossel de carreiras, indicadores reais,
 * como funciona, prévia de conteúdo (decomposição real do Art. 5º), chamada final e rodapé.
 * Quem já entrou vê "Ir para o painel" / "Começar um estudo" no lugar do cadastro.
 */
export default async function Home() {
  const configured = publicEnv().configured;
  const [user, stats] = await Promise.all([
    configured ? getSessionUser().catch(() => null) : Promise.resolve(null),
    configured ? getPublicCatalogStats().catch(() => null) : Promise.resolve(null),
  ]);
  const { nodes } = extractStructure(normalizeContent(DEMO).normalized);
  const items = nodes.filter((n) => n.requiresDirectCoverage);
  const segments = items.map((n, i) => ({ key: n.key, state: DEMO_STATES[i % DEMO_STATES.length]!, title: n.title }));
  const primaryHref = user ? "/nova-trilha" : "/cadastro";

  return (
    <div className="lp">
      <div className="lp-textura" aria-hidden />
      <LandingHeader loggedIn={!!user} />
      <main className="lp-main">
        <LandingHero primaryHref={primaryHref} primaryLabel={user ? "Começar um estudo" : "Criar conta grátis"} />
        <CareersCarousel ctaHref={primaryHref} />
        <LandingStats stats={stats} />
        <LandingHowItWorks />
        <LandingContentPreview demo={DEMO} nodes={nodes} segments={segments} />
        <LandingFinalCta href={primaryHref} label={user ? "Começar um estudo" : "Criar conta agora"} />
      </main>
      <LandingFooter />
    </div>
  );
}
