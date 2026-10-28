import "server-only";
import { z } from "zod";
import { DISCIPLINE_LABELS, DISCIPLINE_MODES, customDisciplines, setCustomDisciplines, type CustomDiscipline, type DisciplineMode } from "@/ai/pedagogy";
import { createAdminClient } from "../supabase";
import type { SessionUser } from "../auth";
import { auditLog, logEvent } from "../observability";
import { UserFacingError } from "./trails";
import { disciplineSlug, foldName as fold } from "@/domain/catalog/discipline-slug";

export { disciplineSlug };

const TTL_MS = 30_000;
let cache: { at: number; list: CustomDiscipline[] } | null = null;
let inflight: Promise<CustomDiscipline[]> | null = null;

/**
 * Carrega as matérias cadastradas (com cache curto) e registra para rótulos e validações.
 * Se a leitura falhar, o app segue só com as matérias fixas (nunca quebra a página).
 */
export async function ensureDisciplines(): Promise<CustomDiscipline[]> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    setCustomDisciplines(cache.list);
    return cache.list;
  }
  inflight ??= (async () => {
    const { data, error } = await createAdminClient().from("catalog_disciplines").select("slug, label, base_mode").order("label");
    if (error) {
      await logEvent("disciplines.load_failed", { error: error.message });
      return cache?.list ?? [];
    }
    const list = (data ?? []).map((r) => ({ slug: r.slug as string, label: r.label as string, base: r.base_mode as DisciplineMode }));
    cache = { at: Date.now(), list };
    return list;
  })().finally(() => {
    inflight = null;
  });
  const list = await inflight;
  setCustomDisciplines(list);
  return list;
}

const invalidate = () => {
  cache = null;
};

export interface DisciplineRow {
  slug: string;
  label: string;
  base: DisciplineMode;
  custom: boolean;
  lessons: number;
  outlines: number;
}

/** Todas as matérias (fixas e cadastradas) com quantas aulas e sumários usam cada uma. */
export async function listDisciplinesWithUsage(): Promise<DisciplineRow[]> {
  await ensureDisciplines();
  const db = createAdminClient();
  const [topics, outlines] = await Promise.all([db.from("catalog_topics").select("discipline_mode").limit(20000), db.from("catalog_outlines").select("discipline_mode").limit(5000)]);
  const count = (rows: Array<{ discipline_mode: string }> | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.discipline_mode, (m.get(r.discipline_mode) ?? 0) + 1);
    return m;
  };
  const lessons = count(topics.data as Array<{ discipline_mode: string }> | null);
  const outs = count(outlines.data as Array<{ discipline_mode: string }> | null);
  const fixed = DISCIPLINE_MODES.filter((m) => m !== "outra").map((m) => ({ slug: m, label: DISCIPLINE_LABELS[m], base: m, custom: false }));
  return [...fixed, ...customDisciplines().map((d) => ({ ...d, custom: true }))].map((d) => ({ ...d, lessons: lessons.get(d.slug) ?? 0, outlines: outs.get(d.slug) ?? 0 }));
}

const inputSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Informe o nome da matéria.")
    .max(60, "Nome grande demais (até 60 caracteres).")
    .regex(/^[\p{L}\p{N} ,.()/'ºª–-]+$/u, "Use só letras, números e pontuação simples no nome."),
  base: z.enum(DISCIPLINE_MODES, { error: "Escolha o estilo das aulas." }),
});

async function assertNameFree(label: string, exceptSlug?: string) {
  const f = fold(label);
  if (DISCIPLINE_MODES.some((m) => fold(DISCIPLINE_LABELS[m]) === f)) throw new UserFacingError(`“${label}” já existe entre as matérias.`, "conflict");
  if (customDisciplines().some((d) => d.slug !== exceptSlug && fold(d.label) === f)) throw new UserFacingError(`“${label}” já existe entre as matérias.`, "conflict");
}

/** Cadastra uma matéria nova (só administrador, verificado por quem chama). */
export async function createDiscipline(user: SessionUser, input: { label: string; base: string }): Promise<CustomDiscipline> {
  invalidate();
  await ensureDisciplines();
  const v = inputSchema.parse(input);
  await assertNameFree(v.label);
  const slug = disciplineSlug(v.label);
  if (slug.length < 2) throw new UserFacingError("Use um nome com pelo menos duas letras.", "invalid_input");
  if ((DISCIPLINE_MODES as readonly string[]).includes(slug) || customDisciplines().some((d) => d.slug === slug)) throw new UserFacingError(`Já existe uma matéria parecida com “${v.label}”. Use outro nome.`, "conflict");
  const db = createAdminClient();
  const { error } = await db.from("catalog_disciplines").insert({ slug, label: v.label, base_mode: v.base, created_by: user.id });
  if (error) {
    if (error.code === "23505") throw new UserFacingError(`“${v.label}” já existe entre as matérias.`, "conflict");
    throw new Error(error.message);
  }
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.discipline_created", entity: "catalog_disciplines", entityId: slug, meta: { label: v.label, base: v.base } });
  invalidate();
  await ensureDisciplines();
  return { slug, label: v.label, base: v.base };
}

/** Renomeia / troca o estilo de uma matéria cadastrada (o identificador não muda: as aulas seguem nela). */
export async function updateDiscipline(user: SessionUser, slugInput: string, input: { label: string; base: string }) {
  invalidate();
  await ensureDisciplines();
  const slug = z.string().regex(/^[a-z][a-z_]{1,39}$/).parse(slugInput);
  if (!customDisciplines().some((d) => d.slug === slug)) throw new UserFacingError("Só dá para editar matérias cadastradas aqui.", "not_found");
  const v = inputSchema.parse(input);
  await assertNameFree(v.label, slug);
  const db = createAdminClient();
  const { error } = await db.from("catalog_disciplines").update({ label: v.label, base_mode: v.base, updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) {
    if (error.code === "23505") throw new UserFacingError(`“${v.label}” já existe entre as matérias.`, "conflict");
    throw new Error(error.message);
  }
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.discipline_updated", entity: "catalog_disciplines", entityId: slug, meta: { label: v.label, base: v.base } });
  invalidate();
  await ensureDisciplines();
}

/** Exclui uma matéria cadastrada — só quando nenhuma aula, sumário ou estudo usa. */
export async function deleteDiscipline(user: SessionUser, slugInput: string) {
  invalidate();
  await ensureDisciplines();
  const slug = z.string().regex(/^[a-z][a-z_]{1,39}$/).parse(slugInput);
  if (!customDisciplines().some((d) => d.slug === slug)) throw new UserFacingError("Só dá para excluir matérias cadastradas aqui.", "not_found");
  const db = createAdminClient();
  const used = await Promise.all([
    db.from("catalog_topics").select("id", { count: "exact", head: true }).eq("discipline_mode", slug),
    db.from("catalog_outlines").select("id", { count: "exact", head: true }).eq("discipline_mode", slug),
    db.from("study_trails").select("id", { count: "exact", head: true }).eq("discipline_mode", slug),
  ]);
  const [lessons, outlines, trails] = used.map((r) => r.count ?? 0);
  if (lessons || outlines || trails)
    throw new UserFacingError(`Esta matéria está em uso (${[lessons ? `${lessons} aula(s)` : "", outlines ? `${outlines} sumário(s)` : "", trails ? `${trails} estudo(s) de alunos` : ""].filter(Boolean).join(", ")}). Mova as aulas para outra matéria antes de excluir.`, "conflict");
  const { error } = await db.from("catalog_disciplines").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
  await db.from("discipline_banners").delete().eq("discipline_mode", slug);
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.discipline_deleted", entity: "catalog_disciplines", entityId: slug });
  invalidate();
  await ensureDisciplines();
}
