import { z } from "zod";
import { titleKey } from "@/domain/edital/text";
import { modeOfDiscipline } from "@/domain/edital/disciplines";

const short = (n: number) => z.string().trim().min(1).max(n);
const opt = (n: number) => z.string().trim().max(n).optional().nullable().transform((v) => v || null);
const date = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD").optional().nullable().transform((v) => v || null);
const int = z.number().int().min(0);

const source = z.object({
  key: short(40), kind: z.enum(["oficial", "extraido", "propria"]).default("oficial"), name: short(300), url: opt(500), page: z.number().int().min(1).optional().nullable(),
  organ: opt(200), publishedAt: date, consultedAt: date, reviewer: opt(200), notes: opt(1000),
});
const cutoff = z.object({
  position: opt(200), modality: z.enum(["ampla", "pcd", "negros", "indigenas", "quilombolas", "outra"]).default("ampla"), stage: opt(120),
  kind: z.enum(["minima_aprovacao", "corte_primeira_fase", "ultimo_classificado", "ultimo_convocado", "ultimo_dentro_vagas"]),
  score: z.number().min(0), maxScore: z.number().min(0).optional().nullable(), candidates: int.optional().nullable(), criterion: opt(400),
  sourceKey: opt(40), sourcePage: z.number().int().min(1).optional().nullable(), verifiedAt: date,
});
const topic = z.object({ title: short(300), questions: int, annulled: int.default(0) });
const subject = z.object({ name: short(160), questions: int, annulled: int.default(0), topics: z.array(topic).default([]) });
const edition = z.object({
  year: z.number().int().min(1990).max(2100), board: opt(80), totalQuestions: z.number().int().min(1).optional().nullable(), countingRule: opt(400), notes: opt(1000),
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
      if (!c.sourceKey) out.push({ level: "erro", path: q, message: "Nota de corte sem fonte. Informe sourceKey." });
      else if (!keys.has(c.sourceKey)) out.push({ level: "erro", path: q, message: `Fonte "${c.sourceKey}" não existe em sources.` });
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
