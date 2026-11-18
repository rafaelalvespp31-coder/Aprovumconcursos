import "server-only";
import { createAdminClient } from "../supabase";
import { TUTORIAL_IDS, tutorialPorId } from "@/domain/tutorial/roteiros";

export interface ProgressoTutorial { passo: number; concluido: boolean; pulado: boolean; ocultar: boolean }
export interface EstadoTutoriais {
  progresso: Record<string, ProgressoTutorial>;
  ativos: Record<string, boolean>;
}

const faltaTabela = (e: { code?: string; message?: string }) => e.code === "42P01" || e.code === "PGRST205" || /does not exist|could not find the table/i.test(e.message ?? "");

/** Uma ida só ao banco por carregamento do app: o progresso do aluno e quais tutoriais estão ativos. Nunca derruba o app. */
export async function getEstadoTutoriais(userId: string): Promise<EstadoTutoriais | null> {
  const db = createAdminClient();
  const [p, s] = await Promise.all([
    db.from("student_tutorial_progress").select("tutorial_id, current_step, completed, skipped, hide_welcome").eq("user_id", userId),
    db.from("tutorial_settings").select("tutorial_id, enabled"),
  ]);
  if ((p.error && faltaTabela(p.error)) || (s.error && faltaTabela(s.error))) return null; // migração pendente
  if (p.error || s.error) return null;
  const progresso: Record<string, ProgressoTutorial> = {};
  for (const r of p.data ?? []) progresso[r.tutorial_id as string] = { passo: r.current_step as number, concluido: !!r.completed, pulado: !!r.skipped, ocultar: !!r.hide_welcome };
  const ativos: Record<string, boolean> = Object.fromEntries(TUTORIAL_IDS.map((id) => [id, true]));
  for (const r of s.data ?? []) ativos[r.tutorial_id as string] = !!r.enabled;
  return { progresso, ativos };
}

/** Grava o progresso (cria ou atualiza a única linha do aluno naquele tutorial). Só tutoriais conhecidos e ligados. */
export async function salvarProgresso(userId: string, tutorialId: string, patch: { passo?: number; concluido?: boolean; pulado?: boolean; reiniciar?: boolean; ocultar?: boolean }): Promise<void> {
  const t = tutorialPorId(tutorialId);
  if (!t) return;
  const db = createAdminClient();
  const passo = Math.max(0, Math.min(t.passos.length - 1, Math.floor(patch.passo ?? 0)));
  const agora = new Date().toISOString();
  const { data: atual } = await db.from("student_tutorial_progress").select("id, completed").eq("user_id", userId).eq("tutorial_id", tutorialId).maybeSingle();
  if (!atual) {
    const { error } = await db.from("student_tutorial_progress").insert({
      user_id: userId, tutorial_id: tutorialId, current_step: passo,
      completed: !!patch.concluido, skipped: !!patch.pulado, hide_welcome: !!patch.ocultar, completed_at: patch.concluido ? agora : null,
    });
    if (error && error.code !== "23505") throw new Error(error.message); // 23505: outra aba criou junto; o próximo salvamento atualiza
    return;
  }
  const upd: Record<string, unknown> = { current_step: passo };
  if (patch.reiniciar) { upd.completed = false; upd.skipped = false; upd.completed_at = null; upd.started_at = agora; }
  if (patch.concluido) { upd.completed = true; upd.skipped = false; upd.completed_at = agora; }
  if (patch.pulado && !atual.completed) upd.skipped = true;
  if (patch.ocultar !== undefined) upd.hide_welcome = patch.ocultar;
  const { error } = await db.from("student_tutorial_progress").update(upd).eq("id", atual.id as string);
  if (error) throw new Error(error.message);
}

// ───────────── admin ─────────────
export interface EstatisticaTutorial {
  id: string;
  titulo: string;
  ativo: boolean;
  iniciaram: number;
  concluiram: number;
  pularam: number;
  taxa: number;
  /** Passo (1-based) onde mais alunos pararam sem concluir, e quantos. */
  abandonoMaior: { passo: number; alunos: number } | null;
  abandonos: Record<string, number>;
}

export async function getEstatisticasTutoriais(): Promise<EstatisticaTutorial[]> {
  const db = createAdminClient();
  const [st, se] = await Promise.all([db.rpc("tutorial_stats"), db.from("tutorial_settings").select("tutorial_id, enabled")]);
  const linhas = (st.data ?? []) as Array<{ tutorial_id: string; iniciaram: number | string; concluiram: number | string; pularam: number | string; abandonos: Record<string, number> }>;
  const ativos = new Map((se.data ?? []).map((r) => [r.tutorial_id as string, !!r.enabled]));
  return TUTORIAL_IDS.map((id) => {
    const l = linhas.find((x) => x.tutorial_id === id);
    const iniciaram = Number(l?.iniciaram ?? 0), concluiram = Number(l?.concluiram ?? 0);
    const abandonos = (l?.abandonos ?? {}) as Record<string, number>;
    const maior = Object.entries(abandonos).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    return {
      id, titulo: tutorialPorId(id)!.titulo, ativo: ativos.get(id) ?? true,
      iniciaram, concluiram, pularam: Number(l?.pularam ?? 0),
      taxa: iniciaram ? Math.round((concluiram / iniciaram) * 100) : 0,
      abandonoMaior: maior ? { passo: Number(maior[0]) + 1, alunos: Number(maior[1]) } : null,
      abandonos,
    };
  });
}

export async function definirTutorialAtivo(tutorialId: string, ativo: boolean): Promise<void> {
  if (!tutorialPorId(tutorialId)) return;
  const { error } = await createAdminClient().from("tutorial_settings").upsert({ tutorial_id: tutorialId, enabled: ativo, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
