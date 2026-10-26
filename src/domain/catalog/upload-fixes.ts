/**
 * Conferência do texto colado, linha a linha: liga cada erro/aviso à linha do texto e oferece
 * correções de um clique (remover a questão, escolher o gabarito, trocar o tipo de seção…).
 * Puro: roda no navegador enquanto o administrador cola e edita.
 */
import { DISCIPLINE_LABELS, DISCIPLINE_MODES, LESSON_SECTION_KINDS } from "@/ai/pedagogy";
import { cleanPasted, fold } from "./upload";

/** Troca `deleteCount` linhas a partir da linha `start` (1 = primeira) por `insert`. */
export interface LineEdit {
  start: number;
  deleteCount: number;
  insert: string[];
}
export interface FixAction {
  label: string;
  edit: LineEdit;
  /** Outras trocas aplicadas junto (correção em lote). */
  more?: LineEdit[];
  /** Sugerida pelo próprio texto (ex.: gabarito citado na justificativa). */
  recommended?: boolean;
}
export interface TextIssue {
  message: string;
  severity: "erro" | "aviso";
  /** Linha principal (1 = primeira), quando dá para apontar. */
  line: number | null;
  /** Fim do trecho (exclusivo), para destacar a questão/seção inteira. */
  endLine: number | null;
  fixes: FixAction[];
}

const BLOCK = /^\s*={3,}\s*(.+?)\s*={0,}\s*$/;
const ITEM = /^\s*-{3,}\s*(.+?)\s*-{0,}\s*$/;
const isMarker = (l: string) => (BLOCK.test(l) || ITEM.test(l)) && /[A-Za-zÀ-ú]/.test(l);

/** Todas as trocas de uma correção, de baixo para cima (as linhas de cima não se deslocam). */
export function fixEdits(f: FixAction): LineEdit[] {
  return [f.edit, ...(f.more ?? [])].sort((a, b) => b.start - a.start);
}

export function applyFix(text: string, f: FixAction): string {
  return fixEdits(f).reduce((t, e) => applyLineEdit(t, e), text);
}

export function applyLineEdit(text: string, e: LineEdit): string {
  const lines = text.split("\n");
  const at = Math.max(0, Math.min(lines.length, e.start - 1));
  lines.splice(at, Math.max(0, e.deleteCount), ...e.insert);
  return lines.join("\n");
}

const LEVELS = [
  ["FÁCIL", "Fácil"],
  ["MÉDIO", "Médio"],
  ["DIFÍCIL", "Difícil"],
] as const;

function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const g = new Set<string>();
    const t = ` ${s} `;
    for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2));
    return g;
  };
  const A = grams(a);
  const B = grams(b);
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return (2 * n) / (A.size + B.size || 1);
}

export function describeIssues(raw: string, errors: readonly string[], warnings: readonly string[] = []): TextIssue[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const clean = cleanPasted(raw).split("\n");
  const L = (n: number) => clean[n - 1] ?? "";
  /** Fim (exclusivo) do bloco que começa na linha n: até o próximo marcador. */
  const blockEnd = (n: number) => {
    let i = n + 1;
    while (i <= clean.length && !isMarker(L(i))) i++;
    return i;
  };
  const find = (pred: (l: string, n: number) => boolean, from = 1, to = clean.length + 1) => {
    for (let n = from; n < to; n++) if (pred(L(n), n)) return n;
    return null;
  };
  const aulaLine = find((l) => BLOCK.test(l) && /^aula\b/.test(fold(l.match(BLOCK)![1]!)));
  const aulaEnd = aulaLine ? blockEnd(aulaLine) : null;
  const metaLine = (re: RegExp) => (aulaLine ? find((l) => re.test(fold(l).replace(/^[-*\s]+/, "")), aulaLine + 1, aulaEnd!) : null);
  const metaValue = (n: number | null) => (n ? L(n).replace(/^[^:]*:\s*/, "").trim() : "");
  const sectionHeader = (title: string) => find((l) => ITEM.test(l) && /se[çc][ãa]o/i.test(l) && l.includes(title));
  const upsertMeta = (re: RegExp, value: string): LineEdit | null => {
    const at = metaLine(re);
    if (at) return { start: at, deleteCount: 1, insert: [value] };
    if (!aulaLine) return null;
    const after = metaLine(/^titulo\s*:/) ?? aulaLine;
    return { start: after + 1, deleteCount: 0, insert: [value] };
  };

  const out: TextIssue[] = [];
  const add = (severity: TextIssue["severity"], message: string, line: number | null, endLine: number | null, fixes: FixAction[] = []) => out.push({ message, severity, line, endLine, fixes });

  const handle = (msg: string, severity: TextIssue["severity"]) => {
    let m: RegExpMatchArray | null;
    // --- Seção vazia
    if ((m = msg.match(/^Linha (\d+): a seção “.*” está vazia/))) {
      const n = Number(m[1]);
      return add(severity, msg, n, blockEnd(n), [{ label: "Remover a seção", edit: { start: n, deleteCount: blockEnd(n) - n, insert: [] } }]);
    }
    // --- Nível do bloco de questões
    if ((m = msg.match(/^Linha (\d+): informe o nível do bloco de questões/))) {
      const n = Number(m[1]);
      return add(severity, msg, n, n + 1, LEVELS.map(([up, label]) => ({ label: `Nível ${label}`, edit: { start: n, deleteCount: 1, insert: [`=== QUESTÕES: ${up} ===`] } })));
    }
    // --- Tipo de seção inexistente
    if ((m = msg.match(/^Linha (\d+): tipo de seção “(.*?)” não existe/))) {
      const n = Number(m[1]);
      const head = L(n).match(ITEM)?.[1] ?? "";
      const rest = head.replace(/^se[çc][ãa]o\s*[:\-–—]?\s*/i, "");
      const title = rest.split("|").slice(1).join("|").trim() || "Sem título";
      const wanted = fold(m[2]!);
      const ranked = [...LESSON_SECTION_KINDS]
        .map((k) => ({ k, s: similarity(wanted, k.replace(/_/g, " ")) }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.k);
      const picks = [...new Set([...ranked.slice(0, 2), "explicacao", "aprofundamento"])].slice(0, 4);
      return add(
        severity,
        msg.replace(/ Use um destes: .*$/, ""),
        n,
        n + 1,
        picks.map((k, i) => ({ label: `Usar “${k.replace(/_/g, " ")}”`, recommended: i === 0 && ranked[0] === k, edit: { start: n, deleteCount: 1, insert: [`--- SEÇÃO: ${k.replace(/_/g, " ")} | ${title} ---`] } })),
      );
    }
    // --- Seção sem título
    if ((m = msg.match(/^Linha (\d+): a seção precisa de título/))) {
      const n = Number(m[1]);
      const end = blockEnd(n);
      const head = L(n).match(ITEM)?.[1] ?? "";
      const kind = head.replace(/^se[çc][ãa]o\s*[:\-–—]?\s*/i, "").split("|")[0]!.trim() || "explicação";
      const first = find((l) => !!l.trim() && !/^\s*itens?\s*:/i.test(l), n + 1, end);
      const fixes: FixAction[] = [];
      if (first) {
        const t = L(first).replace(/^[#>*\s-]+/, "").replace(/\*\*/g, "").replace(/[.:]\s*$/, "").trim().slice(0, 90);
        if (t.length >= 2) fixes.push({ label: `Usar “${t.slice(0, 40)}${t.length > 40 ? "…" : ""}” como título`, edit: { start: n, deleteCount: 1, insert: [`--- SEÇÃO: ${kind} | ${t} ---`] } });
      }
      fixes.push({ label: "Remover a seção", edit: { start: n, deleteCount: end - n, insert: [] } });
      return add(severity, msg, n, end, fixes);
    }
    // --- Questão com problema
    if ((m = msg.match(/^Questão da linha (\d+): (.*)$/))) {
      const n = Number(m[1]);
      const end = blockEnd(n);
      const what = m[2]!;
      const fixes: FixAction[] = [];
      const body = (from: number) => {
        const r: number[] = [];
        for (let i = from; i < end; i++) r.push(i);
        return r;
      };
      const qLines = body(n + 1);
      const gabLine = qLines.find((i) => /^\s*gabarito\s*:/i.test(L(i))) ?? null;
      const justLine = qLines.find((i) => /^\s*(justificativa|coment[aá]rio geral|explica[çc][ãa]o)\s*:/i.test(L(i))) ?? null;
      const justText = justLine ? qLines.filter((i) => i >= justLine).map((i) => L(i)).join(" ").replace(/^\s*[^:]*:\s*/, "") : "";
      const setGab = (v: string): LineEdit => (gabLine ? { start: gabLine, deleteCount: 1, insert: [`Gabarito: ${v}`] } : { start: justLine ?? end, deleteCount: 0, insert: [`Gabarito: ${v}`] });
      if (/Gabarito:” precisa ser a letra/.test(what)) {
        const letters = [...new Set(qLines.map((i) => L(i).match(/^\s*\(?([A-Ea-e])[).]\s+/)?.[1]?.toUpperCase()).filter(Boolean) as string[])];
        const hinted = justText.match(/\b(?:alternativa|letra|op[çc][ãa]o)\s*\(?([A-E])\b/i)?.[1]?.toUpperCase() ?? null;
        for (const l of letters) fixes.push({ label: `Gabarito ${l}`, recommended: l === hinted, edit: setGab(l) });
      } else if (/deve ser Certo ou Errado/.test(what)) {
        const hinted = /^\s*certo\b/i.test(justText) ? "Certo" : /^\s*errado\b/i.test(justText) ? "Errado" : null;
        for (const v of ["Certo", "Errado"]) fixes.push({ label: `Gabarito ${v}`, recommended: v === hinted, edit: setGab(v) });
      } else if (/falta a “Justificativa:”/.test(what)) {
        // Usa o comentário que o próprio texto já dá para a alternativa correta.
        const gab = gabLine ? L(gabLine).replace(/^[^:]*:\s*/, "").trim().toUpperCase().match(/^[A-E]/)?.[0] : null;
        if (gab) {
          const optAt = qLines.find((i) => new RegExp(`^\\s*\\(?${gab}[).]\\s+`, "i").test(L(i)));
          const comAt = optAt ? qLines.find((i) => i > optAt && /^\s*coment[aá]rio\s*(?:[A-E])?\s*:/i.test(L(i)) && !qLines.some((j) => j > optAt && j < i && /^\s*\(?[A-E][).]\s+/i.test(L(j)))) : undefined;
          const com = comAt ? L(comAt).replace(/^[^:]*:\s*/, "").trim() : "";
          if (com.length >= 10) fixes.push({ label: "Usar o comentário da alternativa correta", recommended: true, edit: justLine ? { start: justLine, deleteCount: 1, insert: [`Justificativa: ${com}`] } : { start: end, deleteCount: 0, insert: [`Justificativa: ${com}`] } });
        }
      }
      fixes.push({ label: "Remover a questão", edit: { start: n, deleteCount: end - n, insert: [] } });
      return add(severity, msg, n, end, fixes);
    }
    // --- Texto fora de seção/questão, bloco desconhecido (avisos)
    if ((m = msg.match(/^Linha (\d+): texto fora de uma (seção|questão)/))) {
      const n = Number(m[1]);
      return add(severity, msg, n, n + 1, [{ label: "Remover a linha", edit: { start: n, deleteCount: 1, insert: [] } }]);
    }
    if ((m = msg.match(/^Linha (\d+): bloco “.*” não reconhecido/))) {
      const n = Number(m[1]);
      return add(severity, msg, n, blockEnd(n), [{ label: "Remover o bloco", edit: { start: n, deleteCount: blockEnd(n) - n, insert: [] } }]);
    }
    if ((m = msg.match(/^Linha (\d+):/))) {
      const n = Number(m[1]);
      return add(severity, msg, n, n + 1);
    }
    // --- Bloco AULA
    if (/^Não encontrei o bloco === AULA ===/.test(msg)) {
      return add(severity, msg, 1, 1, [{ label: "Inserir o bloco === AULA === no começo", edit: { start: 1, deleteCount: 0, insert: ["=== AULA ===", "Título: ", "Matéria: ", "Tipo: tema", "Objetivo: ", ""] } }]);
    }
    if (/^Informe o “Título:”/.test(msg)) {
      const e = upsertMeta(/^titulo\s*:/, "Título: ");
      return add(severity, msg, metaLine(/^titulo\s*:/) ?? aulaLine, null, e && !metaLine(/^titulo\s*:/) ? [{ label: "Inserir a linha “Título:”", edit: e }] : []);
    }
    if (/^Informe o “Objetivo:”/.test(msg)) {
      const title = metaValue(metaLine(/^titulo\s*:/));
      const e = upsertMeta(/^objetivo\s*:/, `Objetivo: Dominar ${title || "o tema"}: conceitos, regras, exceções e como as bancas cobram.`);
      return add(severity, msg, metaLine(/^objetivo\s*:/) ?? aulaLine, null, e ? [{ label: "Escrever um objetivo padrão", edit: e }] : []);
    }
    if (/^Não reconheci a matéria/.test(msg)) {
      const at = metaLine(/^(materia|disciplina)\s*:/);
      const typed = fold(metaValue(at));
      const modes = DISCIPLINE_MODES.filter((x) => x !== "outra");
      const best = typed ? [...modes].sort((a, b) => similarity(typed, fold(DISCIPLINE_LABELS[b])) - similarity(typed, fold(DISCIPLINE_LABELS[a])))[0] : null;
      const fixes = modes
        .map((x) => ({ x, e: upsertMeta(/^(materia|disciplina)\s*:/, `Matéria: ${DISCIPLINE_LABELS[x]}`) }))
        .filter((f) => f.e)
        .map((f) => ({ label: DISCIPLINE_LABELS[f.x], recommended: f.x === best, edit: f.e! }));
      return add(severity, msg.replace(/ Use uma destas: .*$/, " Escolha a matéria:"), at ?? aulaLine, null, fixes);
    }
    if (/^Tipo dispositivo: informe/.test(msg)) {
      const e = upsertMeta(/^tipo\s*:/, "Tipo: tema");
      return add(severity, msg, metaLine(/^tipo\s*:/) ?? aulaLine, null, e ? [{ label: "Mudar para “tema” (sem lei)", edit: e }] : []);
    }
    // --- Seção grande demais / outros com título de seção
    if ((m = msg.match(/^Seção “(.+?)”:/))) {
      const n = sectionHeader(m[1]!);
      return add(severity, msg, n, n ? blockEnd(n) : null);
    }
    if (/TEXTO-BASE/.test(msg)) {
      const n = find((l) => BLOCK.test(l) && /^(texto[ -]?base|lei seca|sumario)/.test(fold(l.match(BLOCK)![1]!)));
      return add(severity, msg, n, n ? blockEnd(n) : null);
    }
    return add(severity, msg, null, null);
  };

  // Texto solto (fora de seção/questão): uma linha por aviso vira um trecho só, com correção em lote.
  const loose = { secao: [] as number[], questao: [] as number[] };
  const rest: string[] = [];
  for (const w of warnings) {
    const m = w.match(/^Linha (\d+): texto fora de uma (seção|questão)/);
    if (m) (m[2] === "seção" ? loose.secao : loose.questao).push(Number(m[1]));
    else rest.push(w);
  }
  const groups = (ns: number[]) => {
    const g: Array<[number, number]> = [];
    for (const n of [...ns].sort((a, b) => a - b)) {
      const last = g[g.length - 1];
      if (last && clean.slice(last[1], n - 1).every((l) => !l.trim())) last[1] = n;
      else g.push([n, n]);
    }
    return g;
  };
  const headingTitle = (l: string) => {
    const t = l.trim();
    const m = t.match(/^#{1,6}\s+(.+)$/) ?? t.match(/^(?:\*\*|__)(.+?)(?:\*\*|__):?$/) ?? t.match(/^\d{1,2}(?:\.\d{1,2})*[.)]?\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ].{2,90})$/);
    return m ? m[1]!.replace(/\*\*/g, "").replace(/[.:]\s*$/, "").trim().slice(0, 120) : null;
  };
  const toSection = ([a]: [number, number]): LineEdit => {
    const h = headingTitle(L(a));
    if (h) return { start: a, deleteCount: 1, insert: [`--- SEÇÃO: explicação | ${h} ---`] };
    const t = L(a).replace(/^[#>*\s-]+/, "").replace(/\*\*/g, "").replace(/[.:]\s*$/, "").trim().slice(0, 80) || "Seção";
    return { start: a, deleteCount: 0, insert: [`--- SEÇÃO: explicação | ${t} ---`] };
  };
  const secGroups = groups(loose.secao);
  const qGroups = groups(loose.questao);

  for (const e of errors) {
    if (/^A aula precisa de pelo menos 2 seções/.test(e)) {
      const heads = loose.secao.filter((n) => headingTitle(L(n)));
      const fixes: FixAction[] = [];
      if (heads.length >= 2) {
        const edits = heads.map((n): LineEdit => ({ start: n, deleteCount: 1, insert: [`--- SEÇÃO: explicação | ${headingTitle(L(n))} ---`] }));
        fixes.push({ label: `Transformar os ${heads.length} títulos soltos em seções`, recommended: true, edit: edits[0]!, more: edits.slice(1) });
      } else if (secGroups.length) {
        const edits = secGroups.map(toSection);
        fixes.push({ label: `Criar ${edits.length} seção(ões) com o texto solto`, recommended: true, edit: edits[0]!, more: edits.slice(1) });
      }
      const explain = loose.secao.length
        ? ` Há ${loose.secao.length} linha(s) de texto fora de seção: cada seção precisa começar com "--- SEÇÃO: tipo | Título ---".`
        : ' Cada seção precisa começar com "--- SEÇÃO: tipo | Título ---" dentro de um "=== MÓDULO: … ===".';
      add("erro", e + explain, secGroups[0]?.[0] ?? null, secGroups[0] ? secGroups[0][1] + 1 : null, fixes);
      continue;
    }
    handle(e, "erro");
  }
  for (const [a, b] of secGroups) {
    add("aviso", `${a === b ? `Linha ${a}` : `Linhas ${a}–${b}`}: texto fora de uma seção (vai ser ignorado). Cada seção começa com "--- SEÇÃO: tipo | Título ---".`, a, b + 1, [
      { label: "Transformar em seção", edit: toSection([a, b]) },
      { label: a === b ? "Remover a linha" : `Remover as ${b - a + 1} linhas`, edit: { start: a, deleteCount: b - a + 1, insert: [] } },
    ]);
  }
  for (const [a, b] of qGroups) {
    add("aviso", `${a === b ? `Linha ${a}` : `Linhas ${a}–${b}`}: texto fora de uma questão (vai ser ignorado). Cada questão começa com "--- QUESTÃO ---".`, a, b + 1, [
      { label: "Transformar em questão", edit: { start: a, deleteCount: 0, insert: ["--- QUESTÃO ---"] } },
      { label: a === b ? "Remover a linha" : `Remover as ${b - a + 1} linhas`, edit: { start: a, deleteCount: b - a + 1, insert: [] } },
    ]);
  }
  for (const w of rest) handle(w, "aviso");
  return out;
}

/** Correção escolhida automaticamente para um erro (null = precisa de decisão humana). */
function autoChoice(i: TextIssue): FixAction | null {
  if (!i.fixes.length) return null;
  const rec = i.fixes.find((f) => f.recommended);
  if (rec) return rec;
  const safe = i.fixes.find((f) => !/^Remover/.test(f.label));
  // Gabarito sem pista no texto e matéria sem palpite: não chuta.
  if (safe && !/^Gabarito /.test(safe.label) && i.fixes.length <= 4) return safe;
  // Questão quebrada ou seção vazia sem outra saída: remove (fica registrado no que foi feito).
  return i.fixes.find((f) => /^Remover/.test(f.label)) ?? null;
}

export interface AutoFixResult {
  text: string;
  applied: string[];
  remaining: TextIssue[];
}

/**
 * Corrige tudo o que dá com um clique: aplica a correção sugerida de cada erro, confere de novo e
 * repete. O que precisa de decisão (sem sugestão no texto) fica na lista para corrigir à mão.
 */
export function autoFixText(raw: string, check: (t: string) => { errors: string[]; warnings: string[] }): AutoFixResult {
  let text = raw.replace(/\r\n?/g, "\n");
  const applied: string[] = [];
  const skip = new Set<string>();
  for (let round = 0; round < 80; round++) {
    const r = check(text);
    const issues = describeIssues(text, r.errors, r.warnings).filter((i) => i.severity === "erro");
    const target = issues.find((i) => !skip.has(i.message) && autoChoice(i));
    if (!target) return { text, applied, remaining: issues };
    const f = autoChoice(target)!;
    const next = applyFix(text, f);
    const after = check(next).errors.length;
    if (next === text || after > r.errors.length) {
      skip.add(target.message);
      continue;
    }
    applied.push(`${target.line ? `Linha ${target.line}: ` : ""}${f.label}`);
    text = next;
  }
  const r = check(text);
  return { text, applied, remaining: describeIssues(text, r.errors, r.warnings).filter((i) => i.severity === "erro") };
}
