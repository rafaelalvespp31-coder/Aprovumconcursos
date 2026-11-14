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
  const d = input.today ?? new Date();
  const data = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return NOVO_COMANDO_BASE.replace("{{DATA}}", data).replace("{{NOTA}}", nota).replace("{{DADOS}}", dados);
}
