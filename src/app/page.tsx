import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { CoverageRuler, RulerLegend, type RulerState } from "@/components/coverage-ruler";
import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure } from "@/domain/content/extract";
import { getSessionUser } from "@/server/auth";
import { publicEnv } from "@/lib/env";

const DEMO = `NOÇÕES DE DIREITO ADMINISTRATIVO: 1 Estado, governo e administração pública: conceitos; elementos; poderes. 2 Ato administrativo. 2.1 Conceito, requisitos, atributos, classificação e espécies. 2.2 Invalidação, anulação e revogação. 3 Poderes administrativos. 3.1 Hierárquico; disciplinar; regulamentar; de polícia. 4 Licitações e contratos.`;

// Estados ilustrativos para a demonstração (claramente identificados na página).
const DEMO_STATES: RulerState[] = ["dominado", "dominado", "dominado", "praticado", "ensinado", "ensinado", "nao_verificado", "planejado", "planejado", "planejado", "pendente", "pendente", "pendente", "pendente"];

export default async function Home() {
  const user = publicEnv().configured ? await getSessionUser().catch(() => null) : null;
  const { nodes } = extractStructure(normalizeContent(DEMO).normalized);
  const items = nodes.filter((n) => n.requiresDirectCoverage);
  const segments = items.map((n, i) => ({ key: n.key, state: DEMO_STATES[i % DEMO_STATES.length]!, title: n.title }));

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <ButtonLink href="/painel">Ir para o painel</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/entrar" variant="discreto">Entrar</ButtonLink>
              <ButtonLink href="/cadastro" className="hidden sm:inline-flex">Criar conta</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:pt-16">
          <div className="max-w-xl">
            <h1 className="t-display">Cole o edital. Estude tudo o que ele pede.</h1>
            <p className="mt-5 text-[1.1rem] leading-relaxed text-tinta-suave">
              O Nível Aprovado separa cada item do conteúdo programático, monta aulas e questões para cada um e mostra, item por item,
              o que você já estudou e o que já domina.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={user ? "/nova-trilha" : "/cadastro"}>{user ? "Criar uma trilha" : "Criar conta grátis"}</ButtonLink>
              <ButtonLink href="#como-funciona" variant="secundario">Como funciona</ButtonLink>
            </div>
            <p className="mt-4 t-small text-tinta-fraca">Do edital à aprovação, um nível de cada vez.</p>
          </div>

          <figure className="rounded-lg border border-linha bg-superficie p-5 shadow-[0_1px_0_#d9deea]">
            <figcaption className="t-small text-tinta-suave">
              Este trecho de edital foi decomposto agora pelo motor do Nível Aprovado:
            </figcaption>
            <blockquote className="mt-3 border-l-2 border-linha-forte pl-3 font-serif text-[0.95rem] leading-relaxed text-tinta-suave">
              {DEMO}
            </blockquote>
            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="t-h3">{items.length} itens a cobrir</p>
                <p className="t-tiny text-tinta-fraca">Progresso ilustrativo</p>
              </div>
              <div className="mt-2">
                <CoverageRuler segments={segments} label="Cobertura do exemplo" size="lg" />
              </div>
              <div className="mt-2">
                <RulerLegend states={["dominado", "ensinado", "nao_verificado", "planejado", "pendente"]} />
              </div>
            </div>
            <ol className="mt-5 divide-y divide-linha border-t border-linha">
              {nodes.slice(0, 14).map((n) => (
                <li key={n.key} className="flex gap-3 py-2 t-small" style={{ paddingLeft: `${Math.min(n.depth, 3) * 14}px` }}>
                  <span className="w-8 shrink-0 font-semibold text-azul">{n.marker ?? ""}</span>
                  <span className={n.requiresDirectCoverage ? "text-tinta" : "font-semibold text-tinta"}>{n.title}</span>
                </li>
              ))}
            </ol>
          </figure>
        </section>

        <section id="como-funciona" className="border-y border-linha bg-superficie">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="t-h1 max-w-xl">Como funciona</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {[
                ["Escolha a banca e cole o conteúdo", "Edital inteiro, uma matéria, um artigo de lei ou um tema. A banca orienta o estilo dos exercícios."],
                ["Confira a trilha antes de começar", "Veja os módulos, as aulas e qual item do edital cada aula cobre. Itens sem aula aparecem destacados — nada some sem aviso."],
                ["Estude, responda e revise", "Cada aula termina com questões comentadas. Você avança quando demonstra o aprendizado, e as revisões voltam no tempo certo."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nevoa font-bold text-azul" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="t-h3">{t}</h3>
                    <p className="mt-1 text-tinta-suave">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="t-h1 max-w-xl">O que você pode conferir</h2>
          <dl className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {[
              ["Ler não é dominar", "Uma aula lida conta como estudada. Domínio só depois de acertar as questões e manter o acerto numa revisão dias depois."],
              ["Lei com origem marcada", "O texto legal exibido é o que você colou. Doutrina e jurisprudência citadas ficam marcadas como não verificadas até a conferência na fonte oficial."],
              ["Questões de treino, não de prova", "Os exercícios são elaborados para treinamento no estilo da banca escolhida e identificados como originais. Nunca são apresentados como questões oficiais."],
              ["Lacunas avisadas", "Se o conteúdo colado pula um item (por exemplo, inciso III depois do II), a trilha avisa antes de você começar."],
            ].map(([t, d]) => (
              <div key={t} className="border-l-2 border-azul pl-4">
                <dt className="t-h3">{t}</dt>
                <dd className="mt-1 text-tinta-suave">{d}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10">
            <ButtonLink href={user ? "/nova-trilha" : "/cadastro"}>{user ? "Criar uma trilha" : "Criar conta grátis"}</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-linha">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 t-small text-tinta-fraca">
          <span>Nível Aprovado</span>
          <span>Conteúdo gerado com apoio de IA, com verificação de cobertura e sinalização de pontos não verificados.</span>
        </div>
      </footer>
    </div>
  );
}
