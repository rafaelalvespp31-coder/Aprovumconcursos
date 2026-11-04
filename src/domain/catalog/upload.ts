/**
 * Catalogação por upload (PDF ou .txt) — leitura do MODELO DE AULA, pura e determinística.
 *
 * O arquivo traz a aula pronta, escrita pelo administrador, em blocos marcados:
 *   === AULA ===            dados do tema (título, matéria, tipo, lei, artigos…)
 *   === TEXTO-BASE ===      lei seca ou sumário numerado (vira a lista de itens a ensinar)
 *   === MÓDULO: Nome ===    agrupa as seções seguintes
 *   --- SEÇÃO: tipo | Título ---   corpo em Markdown (cards, tirinhas, quadros, pegadinhas…)
 *   === REFERÊNCIAS ===  /  === A CONFERIR ===
 *   === QUESTÕES: FÁCIL | MÉDIO | DIFÍCIL ===
 *   --- QUESTÃO ---          enunciado, alternativas, gabarito e justificativa
 * O resultado tem exatamente a forma das aulas já catalogadas (lesson + nodes + questões).
 */
import { customDisciplines, disciplineLabel, disciplineSlugs, LESSON_SECTION_KINDS, SECTION_LABELS, type DisciplineMode, type LessonSectionKind } from "@/ai/pedagogy";
import type { ExtractedNode } from "@/domain/content/extract";
import { LAWS, articleId } from "./match";
import { codeBelongs, parseCodedTitle } from "./topic-group";

export const LEVELS_UPLOAD = { facil: "Fácil", medio: "Médio", dificil: "Difícil" } as const;
export type UploadLevel = keyof typeof LEVELS_UPLOAD;

export interface UploadSection {
  kind: LessonSectionKind;
  title: string;
  module: string | null;
  bodyMarkdown: string;
  /** Itens declarados em "Itens:" (texto livre, antes do casamento com os nós). */
  items: string[];
  line: number;
}

export interface UploadOption {
  label: string;
  text: string;
  explanation: string | null;
}

export interface UploadQuestion {
  level: UploadLevel;
  type: "multipla_escolha" | "certo_errado";
  statement: string;
  options: UploadOption[];
  answer: string | null;
  justification: string;
  item: string | null;
  essential: boolean;
  difficulty: number | null;
  line: number;
}

export interface UploadReference {
  kind: "texto_informado" | "lei" | "doutrina" | "jurisprudencia" | "outro";
  citation: string;
}

export interface ParsedLesson {
  meta: {
    title: string;
    subject: string;
    /** Matéria fixa ou cadastrada pela equipe (slug). */
    disciplineMode: string | null;
    kind: "tema" | "dispositivo";
    lawCode: string | null;
    articles: string[];
    aliases: string[];
    estimatedMinutes: number;
    objective: string;
    summary: string | null;
    /** Tópico do edital que agrupa a aula ("4. Ilicitude"), quando informado. */
    topicGroup: string | null;
    topicGroupCode: string | null;
    /** Numeração do subtópico ("4.1"). */
    subtopicCode: string | null;
  };
  sourceText: string;
  sections: UploadSection[];
  references: UploadReference[];
  pending: string[];
  questions: UploadQuestion[];
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[º°ª]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Chave para comparar caminhos de dispositivos: "Art. 155, § 4º, I" ≈ "Art. 155 › § 4º › I". */
export function itemKey(s: string): string {
  return fold(s)
    .replace(/paragrafo unico|par\.? unico/g, " pu ")
    .replace(/§+/g, " par ")
    .replace(/[›>,;:.()–—-]/g, " ")
    .replace(/\bart(igo)?s?\b/g, "art")
    .replace(/\s+/g, " ")
    .trim();
}

const BLOCK = /^\s*={3,}\s*(.+?)\s*={0,}\s*$/;
const ITEM = /^\s*-{3,}\s*(.+?)\s*-{0,}\s*$/;

const KIND_ALIASES: Record<string, LessonSectionKind> = {
  objetivo: "objetivo",
  "conhecimentos previos": "conhecimentos_previos",
  introducao: "introducao",
  explicacao: "explicacao",
  "conceitos fundamentais": "conceitos_fundamentais",
  conceitos: "conceitos_fundamentais",
  glossario: "conceitos_fundamentais",
  aprofundamento: "aprofundamento",
  exemplos: "exemplos",
  "casos praticos": "exemplos",
  comparacao: "comparacao",
  aplicacao: "aplicacao",
  pegadinhas: "pegadinhas",
  excecoes: "excecoes",
  "quadro comparativo": "quadro_comparativo",
  quadro: "quadro_comparativo",
  esquema: "esquema",
  "mapa mental": "esquema",
  resumo: "resumo",
  "revisao final": "resumo",
  checklist: "checklist",
  referencias: "referencias",
  "proxima etapa": "proxima_etapa",
  "texto legal": "texto_legal",
  "lei seca": "texto_legal",
  doutrina: "doutrina",
  jurisprudencia: "jurisprudencia",
  "interpretacao da banca": "interpretacao_banca",
  "interpretacao banca": "interpretacao_banca",
  flashcards: "flashcards",
};

export function sectionKind(raw: string): LessonSectionKind | null {
  const k = fold(raw).replace(/_/g, " ");
  if ((LESSON_SECTION_KINDS as readonly string[]).includes(k.replace(/ /g, "_"))) return k.replace(/ /g, "_") as LessonSectionKind;
  return KIND_ALIASES[k] ?? null;
}

/** Tipo de seção tolerante: nome exato, apelido ou nome parecido ("Explicação do item 2" → explicação). */
function sectionKindLoose(raw: string): LessonSectionKind | null {
  const exact = sectionKind(raw);
  if (exact) return exact;
  const k = fold(raw).replace(/_/g, " ");
  const names = [...Object.keys(KIND_ALIASES), ...LESSON_SECTION_KINDS.map((x) => x.replace(/_/g, " "))].sort((a, b) => b.length - a.length);
  const hit = names.find((n) => n.length >= 5 && k.includes(n));
  return hit ? sectionKind(hit) : null;
}

/** Limite de uma seção ao gravar; acima disso o texto é dividido em partes (nunca vira erro). */
export const SECTION_SPLIT_AT = 10_000;

/** Divide um Markdown longo em partes de até `max` caracteres, em limites de bloco (sem cortar tabela, lista ou cerca de código). */
export function splitMarkdown(body: string, max = SECTION_SPLIT_AT): string[] {
  if (body.length <= max) return [body];
  const blocks: string[] = [];
  let cur: string[] = [];
  let fence = false;
  const push = () => {
    const t = cur.join("\n").replace(/^\n+|\s+$/g, "");
    if (t) blocks.push(t);
    cur = [];
  };
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) fence = !fence;
    if (!fence && !line.trim()) push();
    else cur.push(line);
  }
  push();
  // Bloco sozinho maior que o limite: quebra por linha (e, se for uma linha só, por frase).
  const pieces = blocks.flatMap((b) => {
    if (b.length <= max) return [b];
    const out: string[] = [];
    let acc = "";
    for (const unit of b.split("\n").flatMap((l) => (l.length > max ? l.split(/(?<=[.!?;])\s+/) : [l]))) {
      if (acc && acc.length + unit.length + 1 > max) {
        out.push(acc);
        acc = "";
      }
      acc += (acc ? "\n" : "") + unit.slice(0, max);
    }
    if (acc) out.push(acc);
    return out;
  });
  const parts: string[] = [];
  let acc = "";
  for (const b of pieces) {
    if (acc && acc.length + b.length + 2 > max) {
      parts.push(acc);
      acc = "";
    }
    acc += (acc ? "\n\n" : "") + b;
  }
  if (acc) parts.push(acc);
  return parts.length ? parts : [body.slice(0, max)];
}

/** Corta no fim de uma frase, sem passar de `max`. */
function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return (dot > max * 0.6 ? cut.slice(0, dot + 1) : cut).trim();
}

const LAW_DISCIPLINE: Record<string, DisciplineMode> = {
  CP: "direito_penal",
  CPP: "direito_processual_penal",
  CF: "direito_constitucional",
  LEP: "legislacao_especial",
  CTB: "legislacao_especial",
  ECA: "legislacao_especial",
};

function editDistance(a: string, b: string): number {
  if (!a || !b) return 99;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

/** Matéria pelo nome ("Direito Penal", "Português"…); sem matéria, pela lei. */
export function disciplineFrom(subject: string, lawCode: string | null): string | null {
  const s = fold(subject);
  if (s) {
    for (const m of disciplineSlugs()) if (fold(disciplineLabel(m) ?? "") === s || m === s.replace(/ /g, "_")) return m;
    // Matéria cadastrada: o nome dela contido no texto (ex.: "Criminologia aplicada").
    for (const d of customDisciplines()) if (s.includes(fold(d.label))) return d.slug;
    if (/portugues|interpretacao de texto|gramatica/.test(s)) return "lingua_portuguesa";
    if (/processo penal|processual penal/.test(s)) return "direito_processual_penal";
    if (/penal/.test(s)) return "direito_penal";
    if (/constitucional/.test(s)) return "direito_constitucional";
    if (/administrativ/.test(s)) return "direito_administrativo";
    if (/legislacao|lei especial|leis especiais/.test(s)) return "legislacao_especial";
    if (/raciocinio|logica/.test(s)) return "raciocinio_logico";
    if (/matematica/.test(s)) return "matematica";
    if (/informatica/.test(s)) return "informatica";
    // Erro de digitação ("Lingua Portugesa"): o nome mais parecido, a até 2 letras de distância.
    let best: { slug: string; d: number } | null = null;
    for (const m of disciplineSlugs()) {
      const d = editDistance(fold(disciplineLabel(m) ?? ""), s);
      if (d <= 2 && (!best || d < best.d)) best = { slug: m, d };
    }
    if (best) return best.slug;
  }
  if (lawCode) return LAW_DISCIPLINE[lawCode] ?? (lawCode.startsWith("L") ? "legislacao_especial" : null);
  return null;
}

export function lawCodeFrom(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const up = v.toUpperCase().replace(/\s+/g, "");
  if (LAWS.some((l) => l.code === up)) return up;
  const t = fold(v);
  for (const l of LAWS) if (l.patterns.some((p) => p.test(t))) return l.code;
  const n = t.match(/(\d{1,2}\.?\d{3})/);
  if (n) return `L${n[1]!.replace(".", "")}`;
  return /^[A-Z0-9]{2,12}$/.test(up) ? up : null;
}

export function articlesFrom(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(/[,;]+/)) {
    const p = part.trim();
    if (!p) continue;
    const range = p.match(/^(\d+)\s*(?:a|ao|até|-)\s*(\d+)$/i);
    if (range && Number(range[2]) > Number(range[1]) && Number(range[2]) - Number(range[1]) <= 80) {
      for (let n = Number(range[1]); n <= Number(range[2]); n++) out.push(String(n));
    } else {
      const m = p.match(/(\d+(?:\s*-\s*[a-z])?)/i);
      if (m) out.push(articleId(m[1]!.replace(/\s/g, "")));
    }
  }
  return [...new Set(out)];
}

const yes = (v: string) => /^(sim|s|yes|true|x)$/i.test(v.trim());

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/**
 * Texto colado do ChatGPT (ou outro assistente): tira cercas de código (```), marcação de
 * título/negrito em volta dos marcadores (### === AULA ===, **Título:**) e espaços especiais.
 * O conteúdo das seções (Markdown) fica como está.
 */
const TEMPLATE_LABELS =
  /^(titulo|materia|disciplina|tipo|lei|artigos?|sinonimos|tempo estimado|tempo|objetivo|resumo|itens?|essencial|dificuldade|enunciado|gabarito|resposta|justificativa|comentario( geral| [a-e])?|fundamento( legal)?|assunto|tema|banca|ano|concurso|prova|orgao|instituicao|cargo|numero|texto de apoio|texto base)$/;

export function cleanPasted(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u200b\ufeff]/g, "")
    .split("\n")
    .map((l) => {
      // Cerca de código vira linha vazia (não some): os números de linha dos erros batem com o texto colado.
      if (/^\s*```[\w-]*\s*$/.test(l)) return "";
      // Travessões no lugar de "---" (o ChatGPT às vezes troca "---" por "—" ou "–") e
      // cabeçalhos sem os traços: "— SEÇÃO: tipo | Título —", "### SEÇÃO: …", "**QUESTÃO 3**".
      const dash = l.match(/^\s*(?:#{1,6}\s*|>\s*)?(?:\*\*|__)?\s*(?:[-—–‒―]{1,}\s*)?(SE[ÇC][ÃA]O\s*[:\-–—]\s*[^|]{1,60}\|.+?|QUEST[ÃA]O(?:\s*\d{1,3})?)\s*(?:[-—–‒―]{1,})?\s*(?:\*\*|__)?\s*$/i);
      if (dash && !/^\s*-{3,}/.test(l)) return `--- ${dash[1]!.replace(/\s*[-—–‒―]+\s*$/, "").trim()} ---`;
      const eq = l.match(/^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*[=═]{2,}\s*(.+?)\s*[=═]{2,}\s*(?:\*\*|__)?\s*$/);
      if (eq && !/^\s*={3,}/.test(l)) return `=== ${eq[1]} ===`;
      // "### === AULA ===", "**=== MÓDULO: X ===**", "> --- QUESTÃO ---"
      const m = l.match(/^\s*(?:#{1,6}\s+|>\s*)?(?:\*\*|__)?\s*((?:={3,}|-{3,})\s*[^*_]+?\s*(?:={3,}|-{3,})?)\s*(?:\*\*|__)?\s*$/);
      if (m && /[A-Za-zÀ-ú]/.test(m[1]!)) return m[1]!;
      // "**Título:** Furto", "- **Gabarito:** B", "**A)** texto" — só nos rótulos do modelo
      const f = l.match(/^(\s*)(?:[-*]\s+)?(?:\*\*|__)([^*_\n]{1,40}?)(?:\*\*|__)\s*(:?)\s*(?:\*\*|__)?\s*(.*)$/);
      if (f) {
        const label = f[2]!.replace(/:\s*$/, "").trim();
        const colon = f[3] || /:\s*$/.test(f[2]!);
        if (colon && TEMPLATE_LABELS.test(fold(label))) return `${f[1]}${label}: ${f[4]}`;
        if (/^\(?[A-Ea-e][).]$/.test(label)) return `${f[1]}${label} ${f[4]}`;
      }
      return l;
    })
    .join("\n");
}

/** Lê o texto colado no modelo de aula. */
export function parseLessonUpload(raw: string): ParsedLesson {
  const text = cleanPasted(raw);
  const lines = text.split("\n");
  const errors: string[] = [];
  const warnings: string[] = [];
  const metaLines: Record<string, string> = {};
  const sourceLines: string[] = [];
  const sections: UploadSection[] = [];
  const references: UploadReference[] = [];
  const pending: string[] = [];
  const questions: UploadQuestion[] = [];

  type Mode = "none" | "aula" | "texto" | "modulo" | "refs" | "conferir" | "questoes";
  let mode: Mode = "none";
  let currentModule: string | null = null;
  let level: UploadLevel | null = null;
  let section: UploadSection | null = null;
  let qLines: Array<{ text: string; n: number }> | null = null;
  let qStart = 0;
  let lastMetaKey: string | null = null;
  let implicit = false;

  const flushSection = () => {
    if (!section) return;
    const body: string[] = [];
    for (const l of section.bodyMarkdown.split("\n")) {
      const it = l.match(/^\s*itens?\s*:\s*(.+)$/i);
      if (it && !body.some((b) => b.trim())) section.items.push(...it[1]!.split(/;|\n/).map((x) => x.trim()).filter(Boolean));
      else body.push(l);
    }
    section.bodyMarkdown = body.join("\n").replace(/^\n+|\s+$/g, "");
    if (!section.bodyMarkdown) warnings.push(`Linha ${section.line}: a seção “${section.title}” veio vazia e foi ignorada.`);
    else sections.push(section);
    section = null;
  };
  const flushQuestion = () => {
    if (!qLines || !level) {
      qLines = null;
      return;
    }
    if (!qLines.some((l) => l.text.trim())) {
      qLines = null;
      return; // bloco de questão vazio (modelo) é ignorado
    }
    const q = parseQuestion(qLines, level, qStart, warnings);
    if (q) questions.push(q);
    qLines = null;
  };

  lines.forEach((line, idx) => {
    const n = idx + 1;
    if (/^\s*\/\//.test(line)) return; // comentário do modelo
    const b = line.match(BLOCK);
    if (b && !ITEM.test(line)) {
      flushSection();
      flushQuestion();
      const name = fold(b[1]!);
      if (/^aula\b/.test(name)) mode = "aula";
      else if (/^texto[ -]?base|^lei seca|^sumario/.test(name)) mode = "texto";
      else if (/^modulo\b/.test(name)) {
        mode = "modulo";
        currentModule = b[1]!.replace(/^\s*m[óo]dulo\s*[:\-–—]?\s*/i, "").trim() || null;
      } else if (/^referencias?/.test(name)) mode = "refs";
      else if (/^a conferir|^pendencias|^conferir/.test(name)) mode = "conferir";
      else if (/^questoes?\b/.test(name)) {
        mode = "questoes";
        const lv = name.replace(/^questoes?\s*[:\-–—]?\s*/, "");
        level = /^facil/.test(lv) ? "facil" : /^medio/.test(lv) ? "medio" : /^dificil/.test(lv) ? "dificil" : null;
        if (!level) {
          level = "medio";
          warnings.push(`Linha ${n}: o bloco de questões não tinha nível (FÁCIL, MÉDIO ou DIFÍCIL); usei MÉDIO.`);
        }
      } else {
        warnings.push(`Linha ${n}: bloco “${b[1]}” não reconhecido; o conteúdo dele foi ignorado.`);
        mode = "none";
      }
      return;
    }
    const it = line.match(ITEM);
    if (it) {
      const head = it[1]!;
      if (mode !== "questoes" && /^se[çc][ãa]o\b/i.test(head)) {
        flushSection();
        mode = "modulo";
        implicit = false;
        const rest = head.replace(/^se[çc][ãa]o\s*[:\-–—]?\s*/i, "");
        const [kindRaw, ...titleParts] = rest.split("|");
        const kind = sectionKindLoose(kindRaw ?? "");
        let title = titleParts.join("|").trim();
        if (!kind) warnings.push(`Linha ${n}: tipo de seção “${(kindRaw ?? "").trim()}” não reconhecido; tratei como explicação.`);
        if (!title) title = kind ? (kindRaw ?? "").trim() || SECTION_LABELS[kind] || "Seção" : (kindRaw ?? "").trim() || "Seção";
        section = { kind: kind ?? "explicacao", title: title.replace(/\s*-{2,}\s*$/, "").trim() || "Seção", module: currentModule ?? "Aula", bodyMarkdown: "", items: [], line: n };
        return;
      }
      if (mode === "questoes" && /^quest[ãa]o\b/i.test(head)) {
        flushQuestion();
        qLines = [];
        qStart = n;
        return;
      }
    }
    switch (mode) {
      case "aula": {
        const m = line.match(/^\s*([^:]{2,40}?)\s*:\s*(.*)$/);
        if (m) {
          lastMetaKey = fold(m[1]!).replace(/\(.*?\)/g, "").trim();
          metaLines[lastMetaKey] = m[2]!.trim();
        } else if (line.trim() && lastMetaKey) metaLines[lastMetaKey] = `${metaLines[lastMetaKey]} ${line.trim()}`.trim();
        break;
      }
      case "texto":
        sourceLines.push(line);
        break;
      case "modulo": {
        // Título solto ("## Título" ou "**Título**" sozinho) abre uma seção; texto solto vira uma seção do módulo.
        const head = line.match(/^\s*(?:#{1,6}\s+(.+?)|\*\*([^*\n]{2,120})\*\*)\s*:?\s*$/);
        const headTitle = head ? (head[1] ?? head[2] ?? "").replace(/[*_#]+/g, "").trim() : "";
        if (headTitle && (!section || implicit)) {
          flushSection();
          section = { kind: "explicacao", title: headTitle.slice(0, 160), module: currentModule ?? "Aula", bodyMarkdown: "", items: [], line: n };
          implicit = true;
          warnings.push(`Linha ${n}: o título “${headTitle}” estava sem “--- SEÇÃO: tipo | Título ---”; virou uma seção de explicação.`);
        } else if (section) section.bodyMarkdown += `${line}\n`;
        else if (line.trim()) {
          section = { kind: "explicacao", title: (currentModule ?? "Conteúdo").slice(0, 160), module: currentModule ?? "Aula", bodyMarkdown: `${line}\n`, items: [], line: n };
          implicit = true;
          warnings.push(`Linha ${n}: havia texto fora de uma seção; ele virou uma seção de explicação.`);
        }
        break;
      }
      case "refs": {
        const t = line.replace(/^\s*[-•*]\s*/, "").trim();
        if (!t) break;
        const m = t.match(/^(lei|doutrina|jurisprud[eê]ncia|texto informado|outro)\s*:\s*(.+)$/i);
        const kind = m ? (fold(m[1]!).replace(" ", "_") as UploadReference["kind"]) : "outro";
        references.push({ kind: kind === ("texto_informado" as UploadReference["kind"]) ? "texto_informado" : (["lei", "doutrina", "jurisprudencia", "outro"].includes(kind) ? kind : "outro"), citation: (m ? m[2]! : t).slice(0, 400) });
        break;
      }
      case "conferir": {
        const t = line.replace(/^\s*[-•*]\s*/, "").trim();
        if (t) pending.push(t.slice(0, 400));
        break;
      }
      case "questoes":
        if (qLines) qLines.push({ text: line, n });
        else if (line.trim()) warnings.push(`Linha ${n}: texto fora de uma questão foi ignorado (comece com --- QUESTÃO ---).`);
        break;
      default:
        break;
    }
  });
  flushSection();
  flushQuestion();

  const get = (...keys: string[]) => {
    for (const k of keys) {
      const hit = Object.entries(metaLines).find(([mk]) => mk === k || mk.startsWith(k));
      if (hit && hit[1]) return hit[1];
    }
    return "";
  };
  const group = parseCodedTitle(get("topico"));
  const sub = parseCodedTitle(get("subtopico"));
  // Sem "Título:", a aula usa o nome do subtópico.
  const title = get("titulo") || (sub ? sub.title : "");
  const subject = get("materia", "disciplina");
  const tipo = fold(get("tipo"));
  const lawCode = lawCodeFrom(get("lei"));
  const articles = articlesFrom(get("artigos", "artigo"));
  const kind: "tema" | "dispositivo" = tipo.startsWith("disp") || (!tipo && lawCode && articles.length) ? "dispositivo" : "tema";
  const minutes = Number(get("tempo").match(/\d+/)?.[0] ?? 0);
  const meta: ParsedLesson["meta"] = {
    title,
    subject,
    disciplineMode: disciplineFrom(subject, lawCode),
    kind,
    lawCode: kind === "dispositivo" ? lawCode : null,
    articles: kind === "dispositivo" ? articles : [],
    aliases: get("sinonimos", "sinônimos").split(/[;\n]+/).map((a) => a.trim()).filter(Boolean).slice(0, 30),
    estimatedMinutes: minutes >= 5 && minutes <= 600 ? minutes : 60,
    objective: get("objetivo"),
    summary: get("resumo") || null,
    topicGroup: group ? group.title : null,
    topicGroupCode: group?.code ?? (sub?.code && sub.code.includes(".") ? sub.code.split(".")[0]! : null),
    subtopicCode: sub?.code ?? null,
  };

  // Tudo o que dá para corrigir sozinho é corrigido (com aviso); erro só quando não há o que aproveitar.
  if (!Object.keys(metaLines).length) warnings.push("Não encontrei o bloco === AULA ===; montei os dados da aula a partir do conteúdo.");
  if (meta.title.length < 2) {
    meta.title = (sections.find((s) => s.module && s.module !== "Aula")?.module ?? sections[0]?.title ?? "Aula").slice(0, 200);
    warnings.push(`Faltou o “Título:”; usei “${meta.title}”.`);
  }
  if (meta.objective.length < 5) {
    const first = (meta.summary ?? "").split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
    meta.objective = first.length >= 5 ? first : `Dominar ${meta.title.toLowerCase()}.`;
    warnings.push("Faltou o “Objetivo:”; gerei um a partir do resumo/título.");
  }
  if (!meta.disciplineMode) {
    meta.disciplineMode = disciplineSlugs().includes("outra") ? "outra" : (disciplineSlugs()[0] ?? null);
    warnings.push(`Não reconheci a matéria “${subject || "(vazia)"}”; a aula ficou em “Outra” (troque em Editar dados da aula).`);
  }
  if (sub && !group) warnings.push("Informe também o “Tópico:” (ex.: 4. Ilicitude): sem ele o subtópico fica como aula avulsa.");
  if (group && sub?.code && meta.topicGroupCode && !codeBelongs(sub.code, meta.topicGroupCode)) warnings.push(`O subtópico ${sub.code} não começa com o número do tópico (${meta.topicGroupCode}).`);
  if (kind === "dispositivo" && (!meta.lawCode || !meta.articles.length)) {
    meta.kind = "tema";
    meta.lawCode = null;
    meta.articles = [];
    warnings.push("Tipo dispositivo sem “Lei:” e “Artigos:”: a aula foi catalogada como tema.");
  }
  const sourceText = sourceLines.join("\n").trim();
  if (!sourceText) warnings.push("O bloco === TEXTO-BASE === veio vazio; gerei a lista de itens a partir das seções.");
  if (!sections.length) errors.push("Não encontrei nenhuma seção. Cada seção começa com --- SEÇÃO: tipo | Título ---.");
  else if (sections.length < 2) warnings.push("A aula tem só 1 seção.");
  if (!sections.some((s) => s.module && s.module !== "Aula")) warnings.push("Nenhuma seção está dentro de um === MÓDULO: … ===; os módulos organizam a aula para o aluno.");
  // Seção grande demais é dividida em partes, no mesmo módulo, em vez de virar erro.
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    if (s.bodyMarkdown.length <= SECTION_SPLIT_AT) continue;
    const parts = splitMarkdown(s.bodyMarkdown);
    sections.splice(i, 1, ...parts.map((body, k) => ({ ...s, title: k === 0 ? s.title : `${s.title} (parte ${k + 1})`, bodyMarkdown: body, items: k === 0 ? s.items : [] })));
    warnings.push(`Seção “${s.title}”: ${s.bodyMarkdown.length.toLocaleString("pt-BR")} caracteres; dividi em ${parts.length} partes.`);
    i += parts.length - 1;
  }
  for (const s of sections) s.title = s.title.slice(0, 160);
  if (references.length > 20) {
    warnings.push(`${references.length} referências: guardei as 20 primeiras.`);
    references.length = 20;
  }
  if (pending.length > 20) {
    warnings.push(`${pending.length} itens em A CONFERIR: guardei os 20 primeiros.`);
    pending.length = 20;
  }

  return { meta, sourceText, sections, references, pending, questions, errors, warnings };
}

function parseQuestion(lines: Array<{ text: string; n: number }>, level: UploadLevel, start: number, warnings: string[]): UploadQuestion | null {
  let type: UploadQuestion["type"] = "multipla_escolha";
  let item: string | null = null;
  let essential = false;
  let difficulty: number | null = null;
  let answer: string | null = null;
  const statement: string[] = [];
  const justification: string[] = [];
  const options: UploadOption[] = [];
  let field: "enunciado" | "justificativa" | "opcao" | "comentario" | null = null;

  for (const { text } of lines) {
    const t = text.trim();
    let m: RegExpMatchArray | null;
    if ((m = t.match(/^tipo\s*:\s*(.+)$/i))) {
      type = /certo|errado|c\/e/i.test(m[1]!) ? "certo_errado" : "multipla_escolha";
      field = null;
    } else if ((m = t.match(/^ite(m|ns)\s*:\s*(.+)$/i))) {
      item = m[2]!.trim();
      field = null;
    } else if ((m = t.match(/^essencial\s*:\s*(.+)$/i))) {
      essential = yes(m[1]!);
      field = null;
    } else if ((m = t.match(/^dificuldade\s*:\s*(\d)/i))) {
      difficulty = Math.min(5, Math.max(1, Number(m[1])));
      field = null;
    } else if ((m = t.match(/^gabarito\s*:\s*(.+)$/i))) {
      answer = m[1]!.trim();
      field = null;
    } else if ((m = t.match(/^enunciado\s*:\s*(.*)$/i))) {
      field = "enunciado";
      if (m[1]) statement.push(m[1]);
    } else if ((m = t.match(/^(justificativa|coment[aá]rio geral|explica[çc][ãa]o)\s*:\s*(.*)$/i))) {
      field = "justificativa";
      if (m[2]) justification.push(m[2]);
    } else if ((m = t.match(/^\(?([A-Ea-e])[).]\s+(.+)$/)) && field !== "justificativa") {
      options.push({ label: m[1]!.toUpperCase(), text: m[2]!.trim(), explanation: null });
      field = "opcao";
    } else if ((m = t.match(/^coment[aá]rio\s*(?:[A-E])?\s*:\s*(.+)$/i)) && options.length) {
      options[options.length - 1]!.explanation = m[1]!.trim();
      field = "comentario";
    } else if (t) {
      if (field === "enunciado") statement.push(text.trimEnd());
      else if (field === "justificativa") justification.push(text.trimEnd());
      else if (field === "opcao") options[options.length - 1]!.text += ` ${t}`;
      else if (field === "comentario") options[options.length - 1]!.explanation += ` ${t}`;
      else if (!statement.length) {
        statement.push(text.trimEnd());
        field = "enunciado";
      }
    } else if (field === "enunciado" || field === "justificativa") {
      (field === "enunciado" ? statement : justification).push("");
    }
  }
  const q: UploadQuestion = {
    level,
    type,
    statement: statement.join("\n").trim(),
    options: type === "certo_errado" ? [] : options,
    answer,
    justification: justification.join("\n").trim(),
    item,
    essential,
    difficulty,
    line: start,
  };
  // Corrige o que dá para corrigir; a questão só é descartada (com aviso) quando não há como aproveitá-la.
  const where = `Questão da linha ${start}`;
  const skip = (m: string) => {
    warnings.push(`${where}: ${m} Questão ignorada.`);
    return null;
  };
  if (q.statement.length < 10) return skip("enunciado vazio ou curto demais.");
  if (q.justification.length < 10) return skip("falta a “Justificativa:”.");
  if (q.statement.length > 4000) {
    q.statement = clip(q.statement, 4000);
    warnings.push(`${where}: enunciado passou de 4.000 caracteres e foi encurtado.`);
  }
  if (q.justification.length > 3000) {
    q.justification = clip(q.justification, 3000);
    warnings.push(`${where}: justificativa passou de 3.000 caracteres e foi encurtada.`);
  }
  if (type === "multipla_escolha") {
    const ans = (answer ?? "").toUpperCase().match(/^[A-E]/)?.[0] ?? null;
    // Letras repetidas ou fora de ordem: renumera A, B, C… e acompanha o gabarito.
    const labels = q.options.map((o) => o.label);
    if (new Set(labels).size !== labels.length) {
      const idx = ans ? labels.indexOf(ans) : -1;
      q.options = q.options.map((o, i) => ({ ...o, label: "ABCDE"[i] ?? o.label }));
      if (idx >= 0) q.answer = "ABCDE"[idx] ?? null;
      warnings.push(`${where}: havia alternativas com a mesma letra; renumerei de A a E.`);
    }
    if (q.options.length < 2) return skip("tem menos de 2 alternativas.");
    if (q.options.length > 5) {
      const keep = q.options.slice(0, 5);
      const a2 = (q.answer ?? ans ?? "").toUpperCase();
      if (!keep.some((o) => o.label === a2)) return skip("tem mais de 5 alternativas e o gabarito não está nas 5 primeiras.");
      q.options = keep;
      warnings.push(`${where}: tinha mais de 5 alternativas; mantive as 5 primeiras.`);
    }
    const final = (q.answer ?? ans ?? "").toUpperCase().match(/^[A-E]/)?.[0] ?? null;
    if (!final || !q.options.some((o) => o.label === final)) return skip("o “Gabarito:” não é a letra de uma das alternativas.");
    q.answer = final;
  } else {
    const a = fold(answer ?? "");
    if (!/^(c|certo|e|errado)$/.test(a)) return skip("o “Gabarito:” deve ser Certo ou Errado.");
    q.answer = a.startsWith("c") ? "certo" : "errado";
  }
  return q;
}

// ---------------------------------------------------------------------------
// Montagem no formato do catálogo
// ---------------------------------------------------------------------------

export interface BuiltLesson {
  lesson: {
    title: string;
    objective: string;
    sections: Array<{ kind: LessonSectionKind; title: string; bodyMarkdown: string; nodeKeys: string[]; module?: string }>;
    taughtNodeKeys: string[];
    references: UploadReference[];
    unverifiedClaims: string[];
    verificationPending: boolean;
  };
  questions: Array<{
    level: UploadLevel;
    type: "multipla_escolha" | "certo_errado";
    statement: string;
    options: Array<{ label: string; text: string; correct: boolean; explanation: string }>;
    correctAnswerTrue: boolean | null;
    justification: string;
    nodeKey: string;
    difficulty: number;
    essential: boolean;
  }>;
  warnings: string[];
  errors: string[];
}

/** Casa um texto ("Art. 155, § 4º, I", "1.2", "Coesão") com o nó correspondente. */
export function matchItem(raw: string, nodes: readonly ExtractedNode[], articles: readonly string[]): ExtractedNode | null {
  const k = itemKey(raw);
  if (!k) return null;
  const byPath = nodes.find((n) => itemKey(n.path) === k);
  if (byPath) return byPath;
  // "§ 4º, I" sem o artigo: completa com o único artigo do tema
  if (articles.length === 1 && !/^art\b/.test(k)) {
    const full = itemKey(`Art. ${articles[0]} ${raw}`);
    const hit = nodes.find((n) => itemKey(n.path) === full);
    if (hit) return hit;
  }
  const byMarker = nodes.filter((n) => n.marker && itemKey(n.marker) === k);
  if (byMarker.length === 1) return byMarker[0]!;
  const byTitle = nodes.find((n) => n.kind === "topico" && (itemKey(n.title) === k || itemKey(`${n.marker ?? ""} ${n.title}`) === k));
  return byTitle ?? null;
}

/**
 * Monta a aula: liga cada seção aos itens do texto-base ("Itens:" ou menções no texto),
 * garante que todos os itens sejam ensinados e converte as questões.
 */
export function buildLesson(p: ParsedLesson, nodes: readonly ExtractedNode[]): BuiltLesson {
  const errors: string[] = [];
  const warnings: string[] = [];
  const teach = nodes.filter((n) => n.requiresDirectCoverage);
  if (!teach.length) errors.push("O texto-base não gerou itens a ensinar. Use “Art. …” para lei ou um sumário numerado (1, 1.1, 1.2…).");

  const sectionKeys: string[][] = p.sections.map((s) => {
    const keys = new Set<string>();
    for (const it of s.items) {
      const hit = matchItem(it, nodes, p.meta.articles);
      if (hit) keys.add(hit.key);
      else warnings.push(`Seção “${s.title}”: item “${it}” não encontrado no texto-base.`);
    }
    if (!s.items.length) {
      // Sem "Itens:": usa as menções a dispositivos/tópicos no próprio texto da seção.
      const body = ` ${itemKey(s.bodyMarkdown)} `;
      for (const n of teach) {
        const names = n.kind === "topico" ? [itemKey(n.title)] : [itemKey(n.path)];
        if (names.some((x) => x.length >= 5 && body.includes(` ${x} `))) keys.add(n.key);
      }
    }
    return [...keys];
  });

  // Itens que nenhuma seção cobriu vão para a seção de texto legal (ou a primeira).
  const covered = new Set(sectionKeys.flat());
  const left = teach.filter((n) => !covered.has(n.key)).map((n) => n.key);
  if (left.length && p.sections.length) {
    const target = p.sections.findIndex((s) => s.kind === "texto_legal");
    const idx = target >= 0 ? target : 0;
    sectionKeys[idx] = [...new Set([...sectionKeys[idx]!, ...left])];
    warnings.push(`${left.length} item(ns) do texto-base não citados em nenhuma seção foram ligados à seção “${p.sections[idx]!.title}”.`);
  }
  // Nenhuma seção pode ficar com mais de 40 itens.
  sectionKeys.forEach((ks, i) => {
    if (ks.length > 40) {
      warnings.push(`Seção “${p.sections[i]!.title}” cobre ${ks.length} itens; foram ligados os 40 primeiros (os demais continuam no texto-base).`);
    }
  });

  const keysOf = new Set(nodes.map((n) => n.key));
  const firstKey = teach[0]?.key ?? nodes[0]?.key ?? "N0001";
  const questions: BuiltLesson["questions"] = p.questions.map((q) => {
    let nodeKey = firstKey;
    if (q.item) {
      const hit = matchItem(q.item, nodes, p.meta.articles);
      if (hit) nodeKey = hit.key;
      else warnings.push(`Questão da linha ${q.line}: item “${q.item}” não encontrado; ligada ao primeiro item.`);
    } else {
      const body = ` ${itemKey(q.statement)} `;
      const hit = teach.find((n) => {
        const x = n.kind === "topico" ? itemKey(n.title) : itemKey(n.path);
        return x.length >= 5 && body.includes(` ${x} `);
      });
      if (hit) nodeKey = hit.key;
    }
    if (!keysOf.has(nodeKey)) nodeKey = firstKey;
    const isCE = q.type === "certo_errado";
    return {
      level: q.level,
      type: q.type,
      statement: q.statement,
      options: isCE
        ? []
        : q.options.map((o) => ({
            label: o.label,
            text: o.text,
            correct: o.label === q.answer,
            explanation: o.explanation && o.explanation.length >= 5 ? o.explanation : o.label === q.answer ? "Alternativa correta (veja a justificativa)." : "Alternativa incorreta (veja a justificativa).",
          })),
      correctAnswerTrue: isCE ? q.answer === "certo" : null,
      justification: q.justification,
      nodeKey,
      difficulty: q.difficulty ?? (q.level === "facil" ? 1 : q.level === "medio" ? 2 : 3),
      essential: q.essential,
    };
  });
  const missingExpl = p.questions.filter((q) => q.type === "multipla_escolha" && q.options.some((o) => !o.explanation)).length;
  if (missingExpl) warnings.push(`${missingExpl} questão(ões) sem “Comentário:” em alguma alternativa; usei um comentário padrão que remete à justificativa.`);

  for (const lv of Object.keys(LEVELS_UPLOAD) as UploadLevel[]) {
    const n = questions.filter((q) => q.level === lv).length;
    if (n < 10) warnings.push(`Nível ${LEVELS_UPLOAD[lv].toLowerCase()}: ${n} questão(ões). Para publicar são necessárias pelo menos 10.`);
  }

  return {
    lesson: {
      title: p.meta.title,
      objective: p.meta.objective.slice(0, 500),
      sections: p.sections.map((s, i) => ({ kind: s.kind, title: s.title.slice(0, 160), bodyMarkdown: s.bodyMarkdown, nodeKeys: sectionKeys[i]!.slice(0, 40), ...(s.module ? { module: s.module } : {}) })),
      taughtNodeKeys: teach.map((n) => n.key).slice(0, 300),
      references: p.references.slice(0, 20),
      unverifiedClaims: p.pending.filter((x) => x.length >= 5).slice(0, 20),
      verificationPending: p.pending.length > 0,
    },
    questions,
    warnings,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Só questões (para completar o banco de uma aula já catalogada)
// ---------------------------------------------------------------------------

/**
 * Lê só os blocos "=== QUESTÕES: … ===" de um texto colado e liga cada questão aos itens do
 * texto-base da aula existente. Ignora o restante (dados da aula, seções), se vier junto.
 */
/** Erros de questão ("Questão da linha …") e de nível; os da aula (título, matéria…) não importam aqui. */
function questionErrorsOf(p: ParsedLesson): string[] {
  const errors: string[] = [];
  if (!p.questions.length) errors.push("Não encontrei questões. Use os blocos === QUESTÕES: FÁCIL === / MÉDIO / DIFÍCIL e cada questão começando com --- QUESTÃO ---.");
  return errors;
}

/** Só a conferência das questões coladas (roda no navegador, sem o texto-base da aula). */
export function checkQuestionsText(raw: string): { errors: string[]; warnings: string[] } {
  return { errors: questionErrorsOf(parseLessonUpload(raw)), warnings: [] };
}

export function parseQuestionsForTopic(raw: string, nodes: readonly ExtractedNode[], articles: readonly string[]): { questions: BuiltLesson["questions"]; errors: string[]; warnings: string[] } {
  const p = parseLessonUpload(raw);
  const errors = questionErrorsOf(p);
  const fake: ParsedLesson = { ...p, meta: { ...p.meta, articles: [...articles] }, sections: [], errors: [], warnings: [] };
  const b = buildLesson(fake, nodes);
  const warnings = b.warnings.filter((w) => /^Questão da linha|Comentário:/.test(w));
  return { questions: b.questions, errors, warnings };
}
