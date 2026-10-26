/**
 * Completar uma aula já catalogada com os exemplos visuais (":::exemplo" — tirinha, carimbo e
 * esquema) e a seção de flashcards, sem refazer a aula: o painel gera o comando com os títulos
 * das seções, o ChatGPT devolve só os blocos e o painel acrescenta cada um à seção certa.
 */
import { extractPractice, PRACTICE_KINDS } from "@/domain/content/practice";
import { visualRules } from "./export";
import { fold } from "./upload";

export interface EnrichSection {
  kind: string;
  title: string;
  bodyMarkdown: string;
  nodeKeys: string[];
  module?: string;
  [k: string]: unknown;
}
export interface EnrichLesson {
  sections: EnrichSection[];
  [k: string]: unknown;
}

const MAX_BODY = 12_000;
export const FLASH_TITLE = "Flashcards de revisão";

export const hasExample = (md: string) => extractPractice(md).cases.length > 0;

/** Cartões no formato "**Pergunta?**\n→ resposta" (mesma leitura da apostila). */
export function countFlashcards(md: string): number {
  return md
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => /^\*\*[\s\S]+?\*\*/.test(b) && /(?:^|\n)\s*(?:→|->)\s*\S/.test(b)).length;
}

/** Situação da aula: quais seções pedem exemplo e ainda não têm, e se há flashcards. */
export function enrichStatus(lesson: EnrichLesson) {
  const teaching = lesson.sections.map((s, i) => ({ s, i })).filter(({ s }) => PRACTICE_KINDS.has(s.kind));
  const missing = teaching.filter(({ s }) => !hasExample(s.bodyMarkdown));
  const flash = lesson.sections.find((s) => s.kind === "flashcards");
  return {
    teaching: teaching.length,
    withExample: teaching.length - missing.length,
    missing: missing.map(({ s, i }) => ({ index: i, title: s.title, kind: s.kind })),
    flashcards: flash ? countFlashcards(flash.bodyMarkdown) : 0,
  };
}

function excerpt(md: string, max = 280): string {
  const plain = extractPractice(md)
    .body.replace(/^\s*[>|#-].*$/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max).replace(/\s+\S*$/, "")}…` : plain;
}

/** Comando para o ChatGPT devolver só os blocos que faltam. */
export function buildEnrichPrompt(title: string, lesson: EnrichLesson): string {
  const st = enrichStatus(lesson);
  const targets = st.missing.map((m) => lesson.sections[m.index]!);
  const list = targets.map((s, n) => `${n + 1}. ${s.title}\n   Assunto: ${excerpt(s.bodyMarkdown)}`).join("\n");
  const resumo = lesson.sections.find((s) => s.kind === "resumo");
  const needFlash = st.flashcards < 4;
  return `Vou te passar as seções de uma aula já pronta sobre "${title}". Escreva SÓ os blocos que faltam: um exemplo visual para cada seção listada${needFlash ? " e os flashcards de revisão" : ""}. Não reescreva a aula.

${visualRules()}

FORMATO DA RESPOSTA (obrigatório)
- Responda SOMENTE com o texto abaixo, dentro de UM único bloco de código, sem nada antes ou depois.
- Use o título de cada seção EXATAMENTE como está na lista.
- Para cada seção: a linha "--- SEÇÃO: título ---" e, embaixo, um bloco :::exemplo completo (Situação, Pergunta, Resposta, Tirinha, Carimbo e Esquema), fechado com ":::".
- O exemplo tem que ser sobre o assunto da seção e estar correto. Não invente lei, súmula, número de processo nem dado.

=== EXEMPLOS VISUAIS ===
--- SEÇÃO: (título exato) ---
:::exemplo
Situação: …
Pergunta: …
Resposta: …
Tirinha: [ … ]
Carimbo: … | erro
Esquema: { … }
:::
${needFlash ? `
=== FLASHCARDS ===
(12 a 15 cartões, separados por linha em branco)
**Pergunta curta?**
→ Resposta curta, com **negrito** no essencial.
` : ""}
SEÇÕES QUE PRECISAM DE EXEMPLO (${targets.length})
${list || "(nenhuma — todas já têm)"}
${needFlash && resumo ? `\nRESUMO DA AULA (base para os flashcards)\n${extractPractice(resumo.bodyMarkdown).body.slice(0, 2500)}\n` : ""}`;
}

export interface EnrichParse {
  examples: Array<{ index: number; title: string; block: string; visual: boolean }>;
  flashcards: string | null;
  flashCount: number;
  errors: string[];
  warnings: string[];
}

function clean(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[​﻿]/g, "")
    .split("\n")
    .filter((l) => !/^\s*```[\w-]*\s*$/.test(l))
    .map((l) => l.replace(/^\s*(?:#{1,6}\s+)?(?:\*\*|__)\s*((?:={3,}|-{3,})[^*_]+?(?:={3,}|-{3,}))\s*(?:\*\*|__)\s*$/, "$1").replace(/^\s*#{1,6}\s+((?:={3,}|-{3,}).*)$/, "$1"))
    .join("\n");
}

const keyOf = (s: string) => fold(s).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/** Lê a resposta do ChatGPT e liga cada bloco à seção da aula (pelo título). */
export function parseEnrichment(raw: string, lesson: EnrichLesson): EnrichParse {
  const text = clean(raw);
  const errors: string[] = [];
  const warnings: string[] = [];
  const examples: EnrichParse["examples"] = [];
  const byTitle = new Map(lesson.sections.map((s, i) => [keyOf(s.title), i]));
  const used = new Set<number>();

  const flashAt = text.search(/^[ \t]*={3,}[ \t]*FLASHCARDS?[ \t]*=*[ \t]*$/im);
  const examplesPart = flashAt >= 0 ? text.slice(0, flashAt) : text;
  const flashPart = flashAt >= 0 ? text.slice(flashAt).replace(/^.*\n?/, "") : "";

  const chunks = examplesPart.split(/^\s*-{3,}\s*SE[ÇC][ÃA]O\s*:\s*/im).slice(1);
  for (const chunk of chunks) {
    const nl = chunk.indexOf("\n");
    const head = (nl < 0 ? chunk : chunk.slice(0, nl)).replace(/-{3,}\s*$/, "").trim();
    const title = head.includes("|") ? head.split("|").slice(1).join("|").trim() : head;
    const body = nl < 0 ? "" : chunk.slice(nl + 1).split(/^\s*={3,}.*$/m)[0]!.trim();
    const index = byTitle.get(keyOf(title)) ?? byTitle.get(keyOf(head));
    if (index === undefined) {
      errors.push(`Seção “${title}” não existe nesta aula: use o título exatamente como no comando.`);
      continue;
    }
    if (used.has(index)) {
      warnings.push(`“${title}” veio mais de uma vez: fica só o primeiro exemplo.`);
      continue;
    }
    const m = body.match(/(?:^|\n)[ \t]*:::exemplo[ \t]*\n[\s\S]*?\n[ \t]*:::[ \t]*(?=\n|$)/);
    const cases = m ? extractPractice(m[0]).cases : [];
    if (!m || !cases.length) {
      errors.push(`“${title}”: falta o bloco :::exemplo completo (Situação, Pergunta e Resposta, fechado com ":::").`);
      continue;
    }
    const c = cases[0]!;
    const visual = Boolean(c.strip?.length || c.scheme);
    if (!c.strip?.length) warnings.push(`“${title}”: a tirinha não veio ou o JSON está inválido (o card aparece sem ela).`);
    if (!c.scheme) warnings.push(`“${title}”: o esquema não veio ou o JSON está inválido.`);
    const s = lesson.sections[index]!;
    if (hasExample(s.bodyMarkdown)) warnings.push(`“${s.title}” já tinha exemplo visual: o novo entra como mais um.`);
    if (s.bodyMarkdown.length + m[0].length + 2 > MAX_BODY) {
      errors.push(`“${s.title}”: com o exemplo a seção passaria de ${MAX_BODY.toLocaleString("pt-BR")} caracteres. Encurte o exemplo.`);
      continue;
    }
    used.add(index);
    examples.push({ index, title: s.title, block: m[0].trim(), visual });
  }

  let flashcards: string | null = null;
  const flashMd = flashPart.split(/^\s*={3,}.*$/m)[0]!.replace(/^\s*\(.*\)\s*$/gm, "").trim();
  const flashCount = flashMd ? countFlashcards(flashMd) : 0;
  if (flashPart.trim()) {
    if (flashCount < 4) errors.push(`Flashcards: só ${flashCount} cartão(ões) no formato "**Pergunta?**" e, na linha seguinte, "→ resposta".`);
    else if (flashMd.length > MAX_BODY) errors.push("Flashcards: texto grande demais; use até 15 cartões curtos.");
    else flashcards = flashMd;
  }
  if (!examples.length && !flashcards && !errors.length) errors.push("Não achei blocos “--- SEÇÃO: … ---” com :::exemplo nem “=== FLASHCARDS ===”. Cole a resposta do ChatGPT inteira.");
  return { examples, flashcards, flashCount, errors, warnings };
}

/** Aplica os blocos na aula (sem mexer no resto). A seção de flashcards entra logo depois do Resumo. */
export function applyEnrichment<L extends EnrichLesson>(lesson: L, p: EnrichParse): L {
  const sections = lesson.sections.map((s) => ({ ...s }));
  for (const e of p.examples) sections[e.index]!.bodyMarkdown = `${sections[e.index]!.bodyMarkdown.trimEnd()}\n\n${e.block}`;
  if (p.flashcards) {
    const existing = sections.findIndex((s) => s.kind === "flashcards");
    if (existing >= 0) sections[existing]!.bodyMarkdown = p.flashcards;
    else {
      const ri = sections.map((s) => s.kind).lastIndexOf("resumo");
      const anchor = ri >= 0 ? ri : sections.length - 1;
      const a = sections[anchor]!;
      const flash: EnrichSection = { kind: "flashcards", title: FLASH_TITLE, bodyMarkdown: p.flashcards, nodeKeys: [...a.nodeKeys].slice(0, 40), ...(a.module ? { module: a.module } : {}) };
      sections.splice(anchor + 1, 0, flash);
    }
  }
  return { ...lesson, sections };
}
