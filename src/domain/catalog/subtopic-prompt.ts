/**
 * Comando do ChatGPT para UM subtópico do plano de tópicos (ex.: 4.1 Causas de exclusão da
 * ilicitude): cabeçalho com Tópico/Subtópico já preenchido, um módulo por item do edital
 * (4.1.1, 4.1.2…) e os módulos fixos de fechamento. Puro.
 */
import { DISCIPLINE_LABELS, type DisciplineMode } from "@/ai/pedagogy";
import { LESSON_PROMPT } from "./chatgpt-prompts";
import { visualRules } from "./export";
import { groupHeaderLines, type OutlineItem, type OutlineSubtopic } from "./topic-group";

const label = (x: OutlineItem) => `${x.code ? `${x.code} ` : ""}${x.title}`;

/** Parte fixa do comando-mestre: referências, a conferir e questões (mesmas regras de sempre). */
function questionsTail(): string {
  const at = LESSON_PROMPT.indexOf("=== REFERÊNCIAS ===");
  return at >= 0 ? LESSON_PROMPT.slice(at) : "";
}

export function buildSubtopicPrompt(input: { disciplineMode: string; group: OutlineItem; sub: OutlineSubtopic }): string {
  const { group, sub } = input;
  const subject = DISCIPLINE_LABELS[input.disciplineMode as DisciplineMode] ?? "";
  const items = sub.items.length ? sub.items : [{ code: sub.code ? `${sub.code}.1` : null, title: sub.title }];
  const numbered = items.map((it, i) => `${it.code ?? `${i + 1}`} ${it.title}`);
  // Limite do painel: 30 seções por aula. Até 10 itens: explicação + pegadinhas em cada um;
  // acima disso, uma seção por item (com o exemplo e a pegadinha dentro).
  const two = items.length <= 10;
  const modules = items
    .map((it, i) => {
      const key = numbered[i]!.split(" ")[0];
      const explain = `--- SEÇÃO: explicação | ${it.title} ---
Itens: ${key}
(Conceito claro e completo do item, com **negrito** nos termos-chave, tabela quando houver espécies ou requisitos, um caso concreto curto com a solução e caixa "> **Por que isso importa na prova:** …".${two ? "" : ' Termine com "> **Pegadinha:** …".'})`;
      const traps = `--- SEÇÃO: pegadinhas | Pegadinhas de prova: ${it.title} ---
Itens: ${key}
(As confusões que as bancas exploram neste item, em lista, com a resposta certa de cada uma. Caixa "> **Pegadinha:** …".)`;
      return `=== MÓDULO: ${label(it)} ===\n\n${explain}${two ? `\n\n${traps}` : ""}`;
    })
    .join("\n\n");

  return `Você vai escrever uma aula completa para concursos públicos (carreiras policiais e jurídicas) no PADRÃO APROVUM.

ESTA AULA É UM SUBTÓPICO DO EDITAL
- Matéria: ${subject}
- Tópico: ${group.code ? `${group.code}. ` : ""}${group.title}
- Subtópico (esta aula): ${label(sub)}
- Itens do edital que a aula PRECISA cobrir, nesta ordem (cada um vira um módulo):
${numbered.map((n) => `  ${n}`).join("\n")}
Não ensine os outros subtópicos do tópico: eles terão aulas próprias. Cite-os só quando for preciso para diferenciar.

FORMATO OBRIGATÓRIO
- Responda SOMENTE com o texto no formato abaixo, dentro de UM único bloco de código, sem nada antes ou depois.
- Mantenha exatamente os marcadores (=== … === e --- … ---) e os nomes dos campos (Título:, Matéria:, Tópico:, Subtópico:, Itens:, Enunciado:, Gabarito: etc.).
- Conteúdo das seções em Markdown: parágrafos curtos, **negrito** nos termos-chave, listas com "-", listas numeradas, tabelas com "|". Caixas de destaque com ">" no começo da linha.
- Não use os marcadores === ou --- dentro do conteúdo. Cada seção com no máximo 10.000 caracteres.
- Se a resposta for cortada por tamanho, eu vou pedir "continue": continue exatamente de onde parou, sem repetir nada e sem abrir explicações.
- Só cite súmulas, teses e julgados que você tem certeza que existem, com tribunal e número. O que precisar de conferência vai em "=== A CONFERIR ===".

${visualRules()}

=== AULA ===
Título: ${sub.title}
Matéria: ${subject}
${groupHeaderLines(group, sub).join("\n")}
Tipo: tema
Lei:
Artigos:
Sinônimos: (outros nomes pelos quais o aluno procura o assunto, separados por ;)
Tempo estimado: (minutos, entre 40 e 120)
Objetivo: (uma frase: "Dominar ${sub.title.toLowerCase()}: …")
Resumo: (duas ou três frases)

=== TEXTO-BASE ===
(Os itens do edital, exatamente assim, um por linha. Se a aula depender de artigos de lei, escreva antes o texto LITERAL e VIGENTE deles, um dispositivo por linha.)
${numbered.join("\n")}

=== MÓDULO: Visão geral do subtópico ===

--- SEÇÃO: introdução | Visão geral: ${sub.title} ---
Itens: ${numbered.map((n) => n.split(" ")[0]).join("; ")}
(O que é o subtópico, onde ele fica dentro de "${group.title}", e lista numerada "Nesta aula você vai estudar: …" com os itens acima. Caixa "> **Por que isso importa na prova:** …".)

${modules}

=== MÓDULO: Casos práticos e pegadinhas ===
--- SEÇÃO: exemplos | Casos práticos ---
(Três a cinco casos no estilo de prova que combinam os itens desta aula, cada um com a resolução.)
--- SEÇÃO: quadro comparativo | Quadro comparativo dos itens ---
(Tabela comparando os itens da aula: conceito, requisitos, efeito e como a banca cobra.)

=== MÓDULO: Revisão final ===
--- SEÇÃO: resumo | Resumo para revisão ---
(Tabela | Pergunta | Resposta | com 10 a 14 linhas.)
--- SEÇÃO: checklist | Checklist: você consegue… ---
(Lista "- [ ] …?" com 10 a 15 itens. Última linha: "Marcou tudo? Passe para as questões de fixação: são três níveis (fácil, médio e difícil), e cada um exige 90% de acertos.")
--- SEÇÃO: flashcards | Flashcards de revisão ---
(12 a 15 cartões no formato "**Pergunta?**" e, na linha seguinte, "→ resposta", separados por linha em branco.)

${questionsTail().replace(/um dispositivo ou item do TEXTO-BASE, ex\.: § 1º ou 3/g, `um item do TEXTO-BASE, ex.: ${items[0]!.code ?? "1"}`)}`;
}
