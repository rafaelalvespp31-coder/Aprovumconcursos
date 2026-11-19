/**
 * Completar uma aula já catalogada com os exemplos visuais (":::exemplo" — tirinha, carimbo e
 * esquema) e a seção de flashcards, sem refazer a aula: o painel gera o comando com os títulos
 * das seções, a IA devolve só os blocos e o painel acrescenta cada um à seção certa.
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

/** Só as regras dos exemplos visuais (sem o bloco genérico de flashcards, que aqui é pedido à parte e de forma completa). */
function visualOnlyRules(): string {
  const r = visualRules();
  const i = r.indexOf("\n\nFLASHCARDS");
  return i >= 0 ? r.slice(0, i) : r;
}

const DIGEST_MAX = 14_000;

/** Resumo de TODA a aula (título + trecho de cada seção) para a IA montar flashcards que cubram o assunto inteiro. */
function lessonDigest(lesson: EnrichLesson): string {
  const body = lesson.sections.filter((s) => s.kind !== "flashcards" && s.kind !== "texto_legal");
  const per = Math.max(260, Math.min(900, Math.floor(DIGEST_MAX / Math.max(1, body.length))));
  let out = "";
  for (const s of body) {
    const text = s.kind === "resumo" || s.kind === "checklist" ? extractPractice(s.bodyMarkdown).body.trim().slice(0, 3000) : excerpt(s.bodyMarkdown, per);
    if (!text) continue;
    const piece = `### ${s.title}\n${text}\n\n`;
    if (out.length + piece.length > DIGEST_MAX + 6000) break;
    out += piece;
  }
  return out.trim();
}

/** Comando para a IA devolver só os blocos que faltam (exemplos visuais e/ou flashcards completos). */
export function buildEnrichPrompt(title: string, lesson: EnrichLesson): string {
  const st = enrichStatus(lesson);
  const targets = st.missing.map((m) => lesson.sections[m.index]!);
  const list = targets.map((s, n) => `${n + 1}. ${s.title}\n   Assunto: ${excerpt(s.bodyMarkdown, 600)}`).join("\n");
  const needFlash = st.flashcards < 4;
  const needEx = targets.length > 0;
  const what = [needEx ? "um exemplo visual para cada seção listada" : "", needFlash ? "os flashcards de revisão da aula inteira" : ""].filter(Boolean).join(" e ");
  return `Vou te passar as seções de uma aula já pronta sobre "${title}". Escreva SÓ os blocos que faltam: ${what}. Não reescreva a aula.

${needEx ? `${visualOnlyRules()}\n\n` : ""}FORMATO DA RESPOSTA (obrigatório)
- Responda SOMENTE com o texto abaixo, dentro de UM único bloco de código, sem nada antes ou depois.
${needEx ? `- Use o título de cada seção EXATAMENTE como está na lista.
- Para cada seção: a linha "--- SEÇÃO: título ---" e, embaixo, um bloco :::exemplo completo (Situação, Pergunta, Resposta, Tirinha, Carimbo e Esquema), fechado com ":::".
- O exemplo tem que ser sobre o assunto da seção e estar correto. Não invente lei, súmula, número de processo nem dado.
` : ""}${needFlash ? `- Os flashcards vêm no fim, sob a linha "=== FLASHCARDS ===", e são OBRIGATÓRIOS.
` : ""}- Entregue tudo completo, sem resumir nem deixar "etc.". Se a resposta for cortada por tamanho, eu peço "continue": retome exatamente de onde parou, sem repetir nada.
${needEx ? `
=== EXEMPLOS VISUAIS ===
--- SEÇÃO: (título exato) ---
:::exemplo
Situação: (caso curto sobre o assunto da seção)
Pergunta: (o que decidir)
Resposta: (resposta com **negrito** no essencial)
Tirinha: [{"cenario": "rua", "legenda": "(quadro 1)", "personagens": [{"p": "investigado", "lado": "esq", "pose": "pega", "humor": "serio", "objeto": "celular"}, {"p": "cidadao", "lado": "dir", "pose": "fala", "humor": "surpreso"}], "fala": {"quem": 1, "texto": "(fala curta)"}}, {"cenario": "delegacia", "legenda": "(quadro 2)", "personagens": [{"p": "delegado", "lado": "centro", "pose": "fala", "humor": "serio"}], "fala": {"quem": 0, "texto": "(fala curta)"}, "efeito": "PÁ!"}]
Carimbo: (resultado em poucas palavras) | ok
Esquema: {"tipo": "fluxo", "titulo": "(título)", "passos": [{"rotulo": "(pergunta 1)", "estado": "ok", "detalhe": "(resposta)"}, {"rotulo": "(pergunta 2)", "estado": "ok"}, {"rotulo": "(conclusão)", "estado": "neutro"}]}
:::
(repita para TODAS as ${targets.length} seções da lista, uma por uma, na ordem. TODO exemplo leva Tirinha, Carimbo e Esquema preenchidos com JSON válido: aspas retas, uma linha cada, nada de "…" nem de linha faltando. Exemplo sem Tirinha/Esquema é recusado.)
` : ""}${needFlash ? `
=== FLASHCARDS ===
(EXATAMENTE 15 cartões, separados por linha em branco, cobrindo a aula INTEIRA: pelo menos um cartão por tema do material abaixo — conceitos, elementos, penas e prazos, exceções, pegadinhas e diferenças entre institutos parecidos —, sem repetir pergunta)
**Pergunta curta?**
→ Resposta curta, com **negrito** no essencial.

Regras dos flashcards: só o que está no material abaixo ou é lei/jurisprudência que você tem certeza que existe; nada de pergunta vaga ("fale sobre…"); a resposta cabe em até 2 linhas; cada cartão começa com "**" e a resposta começa com "→ " na linha seguinte.
` : ""}${needEx ? `
SEÇÕES QUE PRECISAM DE EXEMPLO (${targets.length})
${list}
` : ""}${needFlash ? `
MATERIAL DA AULA (base dos flashcards)
${lessonDigest(lesson)}
` : ""}
CONFERÊNCIA FINAL (por dentro, sem escrever): ${needEx ? `há um :::exemplo para cada uma das ${targets.length} seções, e cada um com as linhas Tirinha, Carimbo e Esquema completas (JSON válido)? ` : ""}${needFlash ? "há 15 flashcards no formato certo? " : ""}Se faltar algo, complete antes de responder.`;
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

/** Lê a resposta da IA e liga cada bloco à seção da aula (pelo título). */
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
      warnings.push(`Seção “${title}” não existe nesta aula; ignorada.`);
      continue;
    }
    if (used.has(index)) {
      warnings.push(`“${title}” veio mais de uma vez: fica só o primeiro exemplo.`);
      continue;
    }
    const m = body.match(/(?:^|\n)[ \t]*:::exemplo[ \t]*\n[\s\S]*?\n[ \t]*:::[ \t]*(?=\n|$)/);
    const cases = m ? extractPractice(m[0]).cases : [];
    if (!m || !cases.length) {
      warnings.push(`“${title}”: sem bloco :::exemplo completo; seção ignorada (não bloqueia).`);
      continue;
    }
    const c = cases[0]!;
    const visual = Boolean(c.strip?.length || c.scheme);
    if (!c.strip?.length) warnings.push(`“${title}”: a tirinha não veio ou o JSON está inválido (o card aparece sem ela).`);
    if (!c.scheme) warnings.push(`“${title}”: o esquema não veio ou o JSON está inválido.`);
    const s = lesson.sections[index]!;
    if (hasExample(s.bodyMarkdown)) warnings.push(`“${s.title}” já tinha exemplo visual: o novo entra como mais um.`);
    let block = m[0].trim();
    if (s.bodyMarkdown.length + block.length + 2 > MAX_BODY) {
      // encurta sozinho: tira tirinha/carimbo/esquema (as linhas maiores) e mantém Situação/Pergunta/Resposta
      const slim = block.split("\n").filter((l) => !/^\s*(?:Tirinha|Carimbo|Esquema)\s*:/i.test(l)).join("\n");
      if (s.bodyMarkdown.length + slim.length + 2 <= MAX_BODY && extractPractice(slim).cases.length) {
        block = slim;
        warnings.push(`“${s.title}”: exemplo encurtado (sem tirinha/esquema) para caber na seção.`);
      } else {
        warnings.push(`“${s.title}”: a seção já está no limite; exemplo não adicionado.`);
        continue;
      }
    }
    used.add(index);
    examples.push({ index, title: s.title, block, visual: block === m[0].trim() ? visual : false });
  }

  let flashcards: string | null = null;
  const flashMd = flashPart.split(/^\s*={3,}.*$/m)[0]!.replace(/^\s*\(.*\)\s*$/gm, "").trim();
  const flashCount = flashMd ? countFlashcards(flashMd) : 0;
  if (flashPart.trim()) {
    if (flashCount < 4) errors.push(`Flashcards: só ${flashCount} cartão(ões) no formato "**Pergunta?**" e, na linha seguinte, "→ resposta".`);
    else if (flashMd.length > MAX_BODY) errors.push("Flashcards: texto grande demais; use até 15 cartões curtos.");
    else flashcards = flashMd;
  }
  if (!examples.length && !flashcards && !errors.length) errors.push("Não achei blocos “--- SEÇÃO: … ---” com :::exemplo nem “=== FLASHCARDS ===”. Cole a resposta da IA inteira.");
  return { examples, flashcards, flashCount, errors, warnings };
}

/** Aplica os blocos na aula (sem mexer no resto). A seção de flashcards entra no fim da aula, no módulo "Revisão final", depois do resumo e do checklist. */
export function applyEnrichment<L extends EnrichLesson>(lesson: L, p: EnrichParse): L {
  const sections = lesson.sections.map((s) => ({ ...s }));
  for (const e of p.examples) sections[e.index]!.bodyMarkdown = `${sections[e.index]!.bodyMarkdown.trimEnd()}\n\n${e.block}`;
  if (p.flashcards) {
    const existing = sections.findIndex((s) => s.kind === "flashcards");
    if (existing >= 0) sections[existing]!.bodyMarkdown = p.flashcards;
    else {
      // Fica no fim da aula, no módulo "Revisão final", depois do resumo e do checklist (a revisão em cartões fecha o estudo).
      const kinds = sections.map((s) => s.kind);
      const ri = Math.max(kinds.lastIndexOf("resumo"), kinds.lastIndexOf("checklist"));
      const anchor = ri >= 0 ? ri : sections.length - 1;
      const a = sections[anchor]!;
      const hasModules = sections.some((s) => s.module);
      const module = hasModules ? (ri >= 0 && a.module ? a.module : "Revisão final") : undefined;
      const flash: EnrichSection = { kind: "flashcards", title: FLASH_TITLE, bodyMarkdown: p.flashcards, nodeKeys: [...a.nodeKeys].slice(0, 40), ...(module ? { module } : {}) };
      sections.splice(anchor + 1, 0, flash);
    }
  }
  return { ...lesson, sections };
}
