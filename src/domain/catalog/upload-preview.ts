/**
 * Prévia da catalogação por upload — pura (roda no servidor e na galeria de desenvolvimento).
 * O servidor acrescenta as conferências que dependem do banco (aula já existente, duplicatas).
 */
import { lessonSchema } from "@/ai/schemas";
import { disciplineLabel, SECTION_LABELS } from "@/ai/pedagogy";
import { extractStructure } from "@/domain/content/extract";
import { normalizeContent } from "@/domain/content/normalize";
import { normalizeText } from "./match";
import { buildLesson, parseLessonUpload, type UploadLevel } from "./upload";

const slugFull = (s: string) => normalizeText(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Igual ao formato de sempre (endereços antigos continuam batendo).
const slugify = (s: string) => slugFull(s).slice(0, 100) || "tema";

/** Hash curto e estável (FNV-1a), para diferenciar endereços que precisaram ser encurtados. */
function shortHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36).padStart(7, "0").slice(-7);
}

/**
 * Endereço (slug) da aula. Com tópico do edital: tópico + número + título — e, se o nome do
 * tópico for longo demais, o endereço é encurtado SEM perder o número e o título (mais um hash do
 * nome inteiro), para dois subtópicos do mesmo tópico nunca caírem no mesmo endereço.
 */
export function lessonSlug(m: { kind: string; lawCode: string | null; articles: string[]; title: string; topicGroup: string | null; subtopicCode: string | null }): string {
  if (m.kind === "dispositivo") return slugify(`${m.lawCode}-art-${m.articles.slice(0, 6).join("-")}-${m.title}`);
  if (!m.topicGroup) return slugify(m.title);
  const full = slugFull(`${m.topicGroup}-${m.subtopicCode ?? ""}-${m.title}`);
  if (full.length <= 100) return full || "tema";
  const cut = (x: string, n: number) => slugFull(x).slice(0, n).replace(/-+$/, "");
  return [cut(m.topicGroup, 28), slugFull(m.subtopicCode ?? ""), cut(m.title, 50), shortHash(full)].filter(Boolean).join("-");
}

export interface LessonUploadPreview {
  ok: boolean;
  errors: string[];
  warnings: string[];
  title: string;
  subject: string | null;
  /** Código da matéria (para o banner). */
  disciplineMode: string | null;
  /** Banner atual da matéria (URL), quando já existe. */
  banner?: string | null;
  kind: "tema" | "dispositivo";
  law: string | null;
  /** Tópico do edital › subtópico, quando a aula faz parte de um. */
  group: string | null;
  slug: string;
  existing: { id: string; status: string; title: string } | null;
  items: number;
  modules: Array<{ name: string; sections: Array<{ kind: string; title: string; items: number }> }>;
  questions: Record<UploadLevel, number>;
}

export function prepareLessonUpload(text: string) {
  const parsed = parseLessonUpload(text);
  const source = parsed.sourceText ? normalizeContent(parsed.sourceText).normalized : "";
  const nodes = source ? extractStructure(source).nodes : [];
  const built = buildLesson(parsed, nodes);
  const errors = [...parsed.errors, ...(parsed.errors.length ? [] : built.errors)];
  if (!errors.length) {
    const v = lessonSchema.safeParse(built.lesson);
    if (!v.success) errors.push(`A aula não passou na validação: ${v.error.issues[0]?.path.join(".")} — ${v.error.issues[0]?.message}`);
  }
  if (source.length > 60000) errors.push("O TEXTO-BASE passa de 60.000 caracteres. Divida a matéria em partes.");
  const m = parsed.meta;
  // Subtópico: o nome do tópico entra no endereço (dois tópicos podem ter um subtópico "Conceito").
  const slug = lessonSlug(m);
  return { parsed, source, nodes, built, errors, warnings: [...parsed.warnings, ...built.warnings], slug };
}

export type PreparedLesson = ReturnType<typeof prepareLessonUpload>;

export function summarizeLessonUpload(
  p: PreparedLesson,
  extra: { errors?: string[]; warnings?: string[]; existing?: LessonUploadPreview["existing"] } = {},
): LessonUploadPreview {
  const errors = [...p.errors, ...(extra.errors ?? [])];
  const modules: LessonUploadPreview["modules"] = [];
  p.built.lesson.sections.forEach((s) => {
    const name = s.module ?? "Sem módulo";
    let g = modules.find((x) => x.name === name);
    if (!g) modules.push((g = { name, sections: [] }));
    g.sections.push({ kind: SECTION_LABELS[s.kind] ?? s.kind, title: s.title, items: s.nodeKeys.length });
  });
  const count = (lv: UploadLevel) => p.built.questions.filter((q) => q.level === lv).length;
  const m = p.parsed.meta;
  return {
    ok: errors.length === 0,
    errors,
    warnings: [...(extra.warnings ?? []), ...p.warnings],
    title: m.title,
    subject: m.disciplineMode ? (disciplineLabel(m.disciplineMode) ?? null) : null,
    disciplineMode: m.disciplineMode,
    kind: m.kind,
    law: m.lawCode ? `${m.lawCode}, art. ${m.articles.join(", ")}` : null,
    group: m.topicGroup ? `${m.topicGroupCode ? `${m.topicGroupCode}. ` : ""}${m.topicGroup}${m.subtopicCode ? ` › ${m.subtopicCode}` : ""}` : null,
    slug: p.slug,
    existing: extra.existing ?? null,
    items: p.built.lesson.taughtNodeKeys.length,
    modules,
    questions: { facil: count("facil"), medio: count("medio"), dificil: count("dificil") },
  };
}
