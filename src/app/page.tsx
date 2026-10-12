import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { CoverageRuler, RulerLegend, type RulerState } from "@/components/coverage-ruler";
import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure } from "@/domain/content/extract";
import { getSessionUser } from "@/server/auth";
import { publicEnv } from "@/lib/env";

const DEMO = `Art. 5º Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade, nos termos seguintes:
I - homens e mulheres são iguais em direitos e obrigações, nos termos desta Constituição;
II - ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei;
III - ninguém será submetido a tortura nem a tratamento desumano ou degradante;`;

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
            <h1 className="t-display">Cole o que vai estudar hoje. Saia dominando.</h1>
            <p className="mt-5 text-[1.1rem] leading-relaxed text-tinta-suave">
              Um tema, um artigo de lei, um capítulo ou uma matéria — sem precisar do edital. O APROVUM delimita o escopo, ensina em blocos curtos,
              avalia em três níveis (fácil, médio e difícil) e, ao final, entrega o PDF só daquele conteúdo.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={user ? "/nova-trilha" : "/cadastro"}>{user ? "Começar um estudo" : "Criar conta grátis"}</ButtonLink>
              <ButtonLink href="#como-funciona" variant="secundario">Como funciona</ButtonLink>
            </div>
            <p className="mt-4 t-small text-tinta-fraca">Sua preparação. Seu próximo cargo.</p>
          </div>

          <figure className="rounded-lg border border-linha bg-superficie p-5 shadow-[0_1px_0_#e5e5e5]">
            <figcaption className="t-small text-tinta-suave">
              Este trecho de lei foi decomposto agora pelo motor do APROVUM:
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
                  <span className="w-8 shrink-0 font-semibold text-destaque">{n.marker ?? ""}</span>
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
                ["Informe o conteúdo", "Ex.: “Prisão em flagrante” ou “Arts. 121 a 129 do Código Penal”. Pode colar o texto da lei. Se o pedido for ambíguo, a plataforma pergunta antes de seguir."],
                ["Estude a aula completa", "Blocos curtos, do básico ao avançado: explicação, exemplos, comparações, pegadinhas e exceções — tudo dentro do escopo pedido."],
                ["Passe pelos três níveis", "Fácil, médio e difícil, cada um com pelo menos 90%. Errou? A recuperação refaz só os pontos errados. Aprovado, o PDF do conteúdo é liberado."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nevoa font-bold text-destaque" aria-hidden>
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
              ["Cada conteúdo é independente", "Vários temas ao mesmo tempo, cada um com progresso, níveis e PDF próprios. Se o texto colado pular um item (inciso III depois do I), você é avisado antes de começar."],
            ].map(([t, d]) => (
              <div key={t} className="border-l-2 border-azul pl-4">
                <dt className="t-h3">{t}</dt>
                <dd className="mt-1 text-tinta-suave">{d}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10">
            <ButtonLink href={user ? "/nova-trilha" : "/cadastro"}>{user ? "Começar um estudo" : "Criar conta grátis"}</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-linha">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 t-small text-tinta-fraca">
          <span>APROVUM</span>
          <span>Conteúdo gerado com apoio de IA, com verificação de cobertura e sinalização de pontos não verificados.</span>
        </div>
      </footer>
    </div>
  );
}
