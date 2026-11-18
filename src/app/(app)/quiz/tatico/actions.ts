"use server";

import { taticoBuscar, taticoCancelarDesafio, taticoDesafiar, taticoDesafios, taticoResponderDesafio, taticoEntrar, taticoEntrarSolo, taticoEstado, taticoResponder, taticoRevisao, taticoSairFila, taticoStats, type AlunoBusca, type DesafiosEstado, type TaticoEstado, type TaticoRevisao, type TaticoStats } from "@/server/services/tatico";
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

export async function taticoBuscarAction(q: string): Promise<AlunoBusca[]> {
  try { return await taticoBuscar(typeof q === "string" ? q : ""); } catch { return []; }
}
export async function taticoDesafiarAction(alvo: string): Promise<{ ok: boolean; id?: string; para?: string; erro?: string }> {
  if (!UUID.test(alvo)) return { ok: false, erro: "Aluno inválido." };
  try { return await taticoDesafiar(alvo); } catch (e) { return { ok: false, erro: falha(e) }; }
}
export async function taticoDesafiosAction(): Promise<DesafiosEstado | null> {
  try { return await taticoDesafios(); } catch { return null; }
}
export async function taticoResponderDesafioAction(id: string, aceitar: boolean): Promise<{ ok: boolean; estado?: string; match?: string; erro?: string }> {
  if (!UUID.test(id)) return { ok: false, erro: "Desafio inválido." };
  try { return await taticoResponderDesafio(id, !!aceitar); } catch (e) { return { ok: false, erro: falha(e) }; }
}
export async function taticoCancelarDesafioAction(id: string): Promise<void> {
  if (!UUID.test(id)) return;
  try { await taticoCancelarDesafio(id); } catch { /* sem efeito */ }
}
