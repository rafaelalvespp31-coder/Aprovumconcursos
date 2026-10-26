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

  for (const e of errors) handle(e, "erro");
  for (const w of warnings) handle(w, "aviso");
  return out;
}
