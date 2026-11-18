"use server";

import { taticoEntrar, taticoEntrarSolo, taticoEstado, taticoResponder, taticoRevisao, taticoSairFila, taticoStats, type TaticoEstado, type TaticoRevisao, type TaticoStats } from "@/server/services/tatico";
import { UserFacingError } from "@/server/services/trails";

const UUID = /^[0-9a-f-]{36}$/i;
const falha = (e: unknown) => (e instanceof UserFacingError ? e.message : "Não foi possível agora. Tente de novo.");

export async function taticoEntrarAction(): Promise<{ ok: true; s: TaticoEstado } | { ok: false; error: string }> {
  try { return { ok: true, s: await taticoEntrar() }; } catch (e) { return { ok: false, error: falha(e) }; }
}
export async function taticoEstadoAction(match?: string): Promise<{ ok: true; s: TaticoEstado } | { ok: false; error: string }> {
  if (match && !UUID.test(match)) return { ok: false, error: "Partida inválida." };
  try { return { ok: true, s: await taticoEstado(match) }; } catch (e) { return { ok: false, error: falha(e) }; }
}
export async function taticoSairFilaAction(): Promise<void> { try { await taticoSairFila(); } catch { /* sem efeito */ } }
export async function taticoResponderAction(match: string, choice: string): Promise<{ ok: boolean; erro?: string; acertou?: boolean }> {
  if (!UUID.test(match) || !/^[ABCD]$/.test(choice)) return { ok: false, erro: "alternativa_invalida" };
  try { return await taticoResponder(match, choice); } catch { return { ok: false, erro: "falha" }; }
}
export async function taticoStatsAction(): Promise<TaticoStats> { try { return await taticoStats(); } catch { return null; } }
export async function taticoRevisaoAction(match: string): Promise<TaticoRevisao> {
  if (!UUID.test(match)) return null;
  try { return await taticoRevisao(match); } catch { return null; }
}
export async function taticoEntrarSoloAction(): Promise<{ ok: true; s: TaticoEstado } | { ok: false; error: string }> {
  try { return { ok: true, s: await taticoEntrarSolo() }; } catch (e) { return { ok: false, error: falha(e) }; }
}
