import { z } from "zod";
import { titleKey } from "@/domain/edital/text";
import { modeOfDiscipline } from "@/domain/edital/disciplines";

// Tolerante: textos longos são cortados, datas inválidas viram vazio, números negativos/fracionados são ajustados.
const short = (n: number) => z.string().trim().min(1).transform((v) => v.slice(0, n));
const opt = (n: number) => z.string().trim().optional().nullable().transform((v) => (v ? v.slice(0, n) : null));
const date = z.string().trim().optional().nullable().transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null));
const int = z.number().transform((v) => Math.max(0, Math.round(v)));
const pos = z.number().optional().nullable().transform((v) => (v == null || !Number.isFinite(v) || v < 1 ? null : Math.round(v)));

const source = z.object({
  key: short(40), kind: z.enum(["oficial", "extraido", "propria"]).default("oficial"), name: short(300), url: opt(500), page: pos,
  organ: opt(200), publishedAt: date, consultedAt: date, reviewer: opt(200), notes: opt(1000),
});
const cutoff = z.object({
  position: opt(200), modality: z.enum(["ampla", "pcd", "negros", "indigenas", "quilombolas", "outra"]).default("ampla"), stage: opt(120),
  kind: z.enum(["minima_aprovacao", "corte_primeira_fase", "ultimo_classificado", "ultimo_convocado", "ultimo_dentro_vagas"]),
  score: z.number().transform((v) => Math.max(0, v)), maxScore: z.number().optional().nullable().transform((v) => (v == null || v <= 0 ? null : v)), candidates: int.optional().nullable(), criterion: opt(400),
  sourceKey: opt(40), sourcePage: pos, verifiedAt: date,
});
const topic = z.object({ title: short(300), questions: int, annulled: int.default(0) });
const subject = z.object({ name: short(160), questions: int, annulled: int.default(0), topics: z.array(topic).default([]) });
const edition = z.object({
  year: z.number().int().min(1990).max(2100), board: opt(80), totalQuestions: pos, countingRule: opt(400), notes: opt(1000),
  cutoffs: z.array(cutoff).default([]), subjects: z.array(subject).default([]),
});
const reco = z.object({ priority: z.enum(["maxima", "alta", "complementar"]), subject: opt(160), topic: short(300), justification: short(1200) });

export const importSchema = z.object({
  exam: z.object({ name: short(200), organ: opt(200) }),
  positions: z.array(short(200)).default([]),
  limitations: opt(2000),
  sources: z.array(source).default([]),
  editions: z.array(edition).min(1, "informe ao menos uma edição"),
  recommendations: z.array(reco).default([]),
});
export type StrategicImport = z.infer<typeof importSchema>;

export interface ImportIssue { level: "erro" | "aviso"; path: string; message: string }

/**
 * Conserta a análise antes de gravar (cada conserto vira aviso, nunca erro):
 * fontes repetidas, edições/disciplinas/assuntos duplicados (somados), nota sem fonte válida,
 * nota acima do máximo, anuladas acima do total, assuntos acima da disciplina e disciplinas acima da prova.
 */
export function repairImport(d: StrategicImport): ImportIssue[] {
  const out: ImportIssue[] = [];
  const fix = (path: string, message: string) => out.push({ level: "aviso", path, message });
  const k = (v: string | null | undefined) => titleKey(v ?? "");

  const pk = new Set<string>();
  d.positions = d.positions.filter((x) => (pk.has(k(x)) ? false : (pk.add(k(x)), true)));

  const seenSrc = new Set<string>();
  d.sources = d.sources.filter((s) => { if (seenSrc.has(s.key)) { fix("sources", `Fonte "${s.key}" repetida: mantive só a primeira.`); return false; } seenSrc.add(s.key); return true; });

  const eds = new Map<string, StrategicImport["editions"][number]>();
  for (const e of d.editions) {
    const key = `${e.year}|${k(e.board)}`;
    const prev = eds.get(key);
    if (!prev) { eds.set(key, e); continue; }
    fix(`edição ${e.year}`, "Edição repetida (mesmo ano e banca): juntei os dados numa só.");
    prev.cutoffs.push(...e.cutoffs);
    prev.subjects.push(...e.subjects);
    prev.totalQuestions = prev.totalQuestions ?? e.totalQuestions;
    prev.countingRule = prev.countingRule ?? e.countingRule;
  }
  d.editions = [...eds.values()];

  for (const e of d.editions) {
    const p = `edição ${e.year}`;
    const subs = new Map<string, (typeof e.subjects)[number]>();
    for (const s of e.subjects) {
      const prev = subs.get(k(s.name));
      if (!prev) { subs.set(k(s.name), s); continue; }
      fix(`${p} · ${s.name}`, "Disciplina repetida: somei as questões e juntei os assuntos.");
      prev.questions += s.questions; prev.annulled += s.annulled; prev.topics.push(...s.topics);
    }
    e.subjects = [...subs.values()];
    for (const s of e.subjects) {
      const tps = new Map<string, (typeof s.topics)[number]>();
      for (const t of s.topics) {
        const prev = tps.get(k(t.title));
        if (prev) { prev.questions += t.questions; prev.annulled += t.annulled; fix(`${p} · ${s.name}`, `Assunto "${t.title}" repetido: somei as questões.`); }
        else tps.set(k(t.title), t);
      }
      s.topics = [...tps.values()];
      for (const t of s.topics) if (t.annulled > t.questions) t.annulled = t.questions;
      const ts = s.topics.reduce((n, t) => n + t.questions, 0);
      if (ts > s.questions) { fix(`${p} · ${s.name}`, `Os assuntos somam ${ts} questões e a disciplina dizia ${s.questions}: ajustei a disciplina para ${ts}.`); s.questions = ts; }
      if (s.annulled > s.questions) { fix(`${p} · ${s.name}`, "Anuladas acima do total: limitei ao total da disciplina."); s.annulled = s.questions; }
    }
    const sum = e.subjects.reduce((n, s) => n + s.questions, 0);
    if (e.totalQuestions && sum > e.totalQuestions) { fix(p, `As disciplinas somam ${sum} questões e a prova dizia ${e.totalQuestions}: ajustei o total da prova para ${sum}.`); e.totalQuestions = sum; }
    for (const c of e.cutoffs) {
      if (c.sourceKey && !seenSrc.has(c.sourceKey)) { fix(`${p} · nota`, `Fonte "${c.sourceKey}" não existe: a nota ficou sem fonte.`); c.sourceKey = null; }
      if (c.maxScore && c.score > c.maxScore) { fix(`${p} · nota`, `Nota ${c.score} acima do máximo ${c.maxScore}: removi o máximo.`); c.maxScore = null; }
    }
  }
  return out;
}

/** Validação semântica (além do formato): totais coerentes, notas com fonte, duplicidades internas. */
export function checkImport(d: StrategicImport): ImportIssue[] {
  const out: ImportIssue[] = [];
  const keys = new Set(d.sources.map((s) => s.key));
  if (keys.size !== d.sources.length) out.push({ level: "erro", path: "sources", message: "Há fontes com a mesma chave." });
  const seen = new Set<string>();
  d.editions.forEach((e, i) => {
    const p = `editions[${i}] (${e.year})`;
    const k = `${e.year}|${(e.board ?? "").toLowerCase()}`;
    if (seen.has(k)) out.push({ level: "erro", path: p, message: "Edição duplicada (mesmo ano e banca)." });
    seen.add(k);
    const sum = e.subjects.reduce((n, s) => n + s.questions, 0);
    if (e.totalQuestions && sum > e.totalQuestions) out.push({ level: "erro", path: p, message: `As disciplinas somam ${sum} questões, acima do total da prova (${e.totalQuestions}).` });
    if (!e.totalQuestions && e.subjects.length) out.push({ level: "aviso", path: p, message: "Sem total de questões da prova: o denominador será a soma das disciplinas." });
    e.subjects.forEach((s, j) => {
      const ts = s.topics.reduce((n, t) => n + t.questions, 0);
      if (ts > s.questions) out.push({ level: "erro", path: `${p}.subjects[${j}] (${s.name})`, message: `Os assuntos somam ${ts} questões, acima das ${s.questions} da disciplina.` });
      if (s.annulled > s.questions) out.push({ level: "erro", path: `${p}.subjects[${j}] (${s.name})`, message: "Anuladas acima do total da disciplina." });
      if (s.topics.length && !modeOfDiscipline(s.name)) out.push({ level: "aviso", path: `${p}.subjects[${j}] (${s.name})`, message: "Disciplina não reconhecida pelo catálogo: as aulas serão buscadas em todo o catálogo, com menos precisão." });
    });
    e.cutoffs.forEach((c, j) => {
      const q = `${p}.cutoffs[${j}]`;
      if (!c.sourceKey) out.push({ level: "aviso", path: q, message: "Nota de corte sem fonte: confira antes de publicar." });
      else if (!keys.has(c.sourceKey)) out.push({ level: "aviso", path: q, message: `Fonte "${c.sourceKey}" não existe em sources.` });
      if (c.maxScore && c.score > c.maxScore) out.push({ level: "erro", path: q, message: "Nota acima da pontuação máxima." });
      if (!c.criterion) out.push({ level: "aviso", path: q, message: "Sem critério descrito." });
    });
  });
  d.sources.forEach((s, i) => { if (!s.url && !s.page) out.push({ level: "aviso", path: `sources[${i}]`, message: "Fonte sem URL nem página: rastreabilidade fraca." }); });
  if (!d.limitations) out.push({ level: "aviso", path: "limitations", message: "Sem limitações da análise declaradas." });
  return out;
}

export const examKey = (name: string) => titleKey(name);

export const IMPORT_EXAMPLE = {
  exam: { name: "Polícia Penal do Estado do Espírito Santo", organ: "SEJUS-ES" },
  positions: ["Policial Penal"],
  limitations: "Análise baseada apenas nas provas listadas.",
  sources: [{ key: "edital-2025", kind: "oficial", name: "Resultado da prova objetiva", url: "https://exemplo.gov.br/resultado.pdf", page: 3, organ: "Banca", publishedAt: "2025-05-10", consultedAt: "2026-11-06", reviewer: "Nome do revisor" }],
  editions: [{
    year: 2025, board: "Banca X", totalQuestions: 60, countingRule: "Questões anuladas pontuam para todos.",
    cutoffs: [{ position: "Policial Penal", modality: "ampla", stage: "Prova objetiva", kind: "corte_primeira_fase", score: 38, maxScore: 60, candidates: 5000, criterion: "Mínimo de 50% e classificação até 5x vagas", sourceKey: "edital-2025", sourcePage: 3, verifiedAt: "2026-11-06" }],
    subjects: [{ name: "Direito Penal", questions: 10, annulled: 0, topics: [{ title: "Crimes contra a Administração Pública", questions: 3 }] }],
  }],
  recommendations: [{ priority: "maxima", subject: "Direito Penal", topic: "Crimes contra a Administração Pública", justification: "Cobrado em todas as provas catalogadas." }],
};
