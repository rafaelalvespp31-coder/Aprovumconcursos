/**
 * NOVO COMANDO COMPLETO: comando único para a IA escrever aulas no padrão da aula de Furto (a mais
 * completa do catálogo), com fundamentação, referências, comparações e diferenciações. Serve para
 * um subtópico ou para um tópico inteiro; os dados (tópico, subtópicos e TEXTO-BASE) vão preenchidos.
 * Puro.
 */
import { disciplineLabel, isLegalMode, type DisciplineMode } from "@/ai/pedagogy";
import { NOVO_COMANDO_BASE } from "./novo-comando-base";
import { groupHeaderLines, type OutlineItem, type OutlineSubtopic } from "./topic-group";
import { expandItems } from "./subtopic-prompt";

export type NovoComandoInput = { disciplineMode: string; group: OutlineItem; subs: OutlineSubtopic[]; today?: Date };

/** Matemática: a aula ensina como professor particular, com a conta desenhada. Os blocos abaixo o app resolve sozinho. */
const NOTA_MATEMATICA = `
MATEMÁTICA — ENSINE COM A CONTA DESENHADA (obrigatório):
Nunca entregue só fórmula ou só resultado: mostre a conta montada e resolvida, um passo de cada vez, em frases curtas e palavras simples, sem pular etapa.
Ordem de cada exemplo: situação do dia a dia → o que a questão pede → como montar → resolver passo a passo explicando cada operação → destacar o resultado → como reconhecer a resposta certa.
Para desenhar a conta, escreva APENAS os números num bloco de código com a linguagem abaixo (o app faz a conta, monta o passo a passo e o resultado; nunca escreva o resultado dentro do bloco):
\`\`\`conta  →  soma|subtracao|multiplicacao|divisao|mmc|mdc seguido dos números. Ex.: mmc 12 18 · divisao 432 12
\`\`\`fracao  →  3/4 (representar) ou 1/2 + 1/3 (também - x :). Ex.: 2/3 x 3/4
\`\`\`regra3  →  direta|inversa A B C; linha seguinte opcional "Grandeza 1 | Grandeza 2". Ex.: direta 6 24 9
\`\`\`potencia  →  base expoente. Ex.: 2 5
\`\`\`porcentagem  →  percentual total [R$] ou desconto|aumento|quanto. Ex.: 20 150 R$ · desconto 20 150 R$ · quanto 30 150
\`\`\`expressao  →  a expressão com + − x : e parênteses. Ex.: 2 + 3 x (10 - 4) : 2
\`\`\`equacao  →  1º grau, ex.: 2x + 3 = 11  ·  \`\`\`equacao2 → a b c do 2º grau, ex.: 1 -5 6
\`\`\`raiz  →  144 (quadrada) ou 3 27 (índice e radicando)  ·  \`\`\`razao 12 18  ·  \`\`\`simplificar 18 24  ·  \`\`\`proporcao 3 12 5
\`\`\`regra3c  →  regra de três composta em 4 linhas: nomes | valores da 1ª situação | valores da 2ª (x) | direta ou inversa de cada grandeza
\`\`\`unidade  →  valor de para. Ex.: 3,5 km m  ·  \`\`\`geometria  →  retangulo 8 5 cm, circulo 3 cm, pitagoras 3 4…  ·  \`\`\`financeira  →  simples|composto capital taxa% tempo
Decimais: soma e subtracao aceitam vírgula (soma 12,5 3,25). Dentro dos blocos escreva só os números, nunca o resultado.
Ordem dos exemplos: do mais fácil ao mais difícil (ex.: soma 25 13 → subtracao 45 12 → multiplicacao 12 3 → divisao 12 3 → contas com "vai um" e empréstimo → multiplicacao 248 36). Cada exemplo é calculado e conferido pelo app, passo a passo, como no caderno.
Use pelo menos um bloco desenhado por conceito de cálculo e, depois dele, 1 exercício parecido com a correção comentada e o erro mais comum explicado. Equações, geometria e demais assuntos: monte cada operação em uma linha e explique a troca em palavras simples.
O EXEMPLO RESOLVIDO NÃO se repete em ":::exemplo": o exemplo fica no bloco desenhado.
`;

export function buildNovoComandoCompleto(input: NovoComandoInput): string {
  const { group, subs } = input;
  if (!subs.length) return "";
  const mode = input.disciplineMode as DisciplineMode;
  const subject = disciplineLabel(mode) ?? "";
  const legal = subject ? isLegalMode(mode) : true;
  const topicLabel = `${group.code ? `${group.code}. ` : ""}${group.title}`;
  const subLabel = (s: OutlineItem) => `${s.code ? `${s.code} ` : ""}${s.title}`;
  const blocks = subs.map((s, i) => {
    const items = expandItems(s).map((it, k) => `${it.code ?? `${k + 1}`} ${it.title}`);
    return `SUBTÓPICO ${i + 1} DE ${subs.length}\n${groupHeaderLines(group, s).join("\n")}\nTEXTO-BASE (copie exatamente, um item por linha):\n${items.join("\n")}`;
  });
  const dados = `TÓPICO: ${topicLabel}\nMATÉRIA: ${subject || "(a da aula)"}\nSUBTÓPICOS: ${subs.length}\n${subs.map((s, i) => `${i + 1}. ${subLabel(s)}`).join("\n")}\n\n${blocks.join("\n\n")}`;
  const nota = legal ? "" : '\nMatéria NÃO jurídica: onde o comando diz "texto legal", use a seção "conceitos fundamentais | Regras e definições-base"; onde diz "jurisprudência", use normas, fontes e entendimentos oficiais da área; mantenha TODAS as demais regras (9 camadas, comparações, referências, exemplos, questões).\n';
  const notaMat = mode === "matematica" ? NOTA_MATEMATICA : "";
  const d = input.today ?? new Date();
  const data = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return NOVO_COMANDO_BASE.replace("{{DATA}}", data).replace("{{NOTA}}", nota + notaMat).replace("{{DADOS}}", dados);
}
