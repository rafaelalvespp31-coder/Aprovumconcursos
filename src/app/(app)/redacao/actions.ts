"use server";

import { after } from "next/server";
import { ZodError } from "zod";
import { getSessionUser, isAdmin } from "@/server/auth";
import { logEvent } from "@/server/observability";
import { UserFacingError } from "@/server/services/trails";
import { executarCorrecao } from "@/server/services/redacao-ia";
import * as R from "@/server/services/redacao";

type Res<T = Record<string, never>> = ({ ok: true } & T) | { ok: false; error: string; expired?: boolean };

/** Toda ação vem da sessão (nunca de parâmetro do navegador) e devolve mensagens seguras. */
async function run<T>(nome: string, fn: (userId: string) => Promise<T>): Promise<Res<T extends void ? Record<string, never> : T extends object ? T : Record<string, never>>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente.", expired: true };
  try {
    const r = await fn(user.id);
    return { ok: true, ...((r as object | undefined) ?? {}) } as never;
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    if (e instanceof ZodError) return { ok: false, error: "Dados inválidos. Confira os campos e tente de novo." };
    await logEvent(`redacao.${nome}_failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir agora. Tente de novo." };
  }
}

export async function salvarRascunhoAction(input: R.DraftInput) {
  return run("rascunho", async (uid) => R.saveDraft(uid, input));
}

/** Salva e envia para correção; a correção roda em segundo plano e o aluno acompanha o processamento. */
export async function enviarAction(input: R.DraftInput) {
  return run("enviar", async (uid) => {
    const { id } = await R.saveDraft(uid, input);
    const { evaluationId, created } = await R.submitForCorrection(uid, id);
    if (created) after(() => executarCorrecao(evaluationId));
    return { id };
  });
}

/** Reenvia uma redação cuja correção falhou. */
export async function reenviarAction(id: string) {
  return run("reenviar", async (uid) => {
    const { evaluationId, created } = await R.submitForCorrection(uid, id);
    if (created) after(() => executarCorrecao(evaluationId));
    return { id };
  });
}

export async function descartarAction(id: string) {
  return run("descartar", async (uid) => R.discardDraft(uid, id));
}

export async function reescreverAction(fromId: string) {
  return run("reescrever", async (uid) => R.createRevision(uid, fromId));
}

export async function compararAction(toId: string) {
  return run("comparar", async (uid) => R.explainComparison(uid, toId));
}

export async function gerarTemaAction(input: Parameters<typeof R.generateTheme>[1]) {
  return run("tema", async (uid) => R.generateTheme(uid, input));
}

export async function gerarExercicioAction(category: string) {
  return run("exercicio", async (uid) => R.generateExercise(uid, category));
}

export async function enviarExercicioAction(id: string, answers: Record<string, string>) {
  return run("exercicio_enviar", async (uid) => R.submitExercise(uid, id, answers));
}

export async function perguntarAction(input: Parameters<typeof R.askTeacher>[1]) {
  return run("chat", async (uid) => ({ resposta: await R.askTeacher(uid, input) }));
}

/** Extrai o texto de um PDF enviado (até 5 MB) para o aluno conferir antes de enviar. DOCX ainda não é suportado. */
export async function extrairArquivoAction(form: FormData) {
  return run("extrair", async () => {
    const f = form.get("arquivo");
    if (!(f instanceof File)) throw new UserFacingError("Escolha um arquivo.", "invalid");
    if (f.size > 5 * 1024 * 1024) throw new UserFacingError("O arquivo passou de 5 MB.", "invalid");
    const buf = new Uint8Array(await f.arrayBuffer());
    const isPdf = buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
    if (!isPdf) throw new UserFacingError("Por enquanto só aceitamos PDF com texto selecionável. Para DOCX, copie e cole o texto no editor.", "invalid");
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    const t = (Array.isArray(text) ? text.join("\n") : text).replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (t.length < 40) throw new UserFacingError("Não encontramos texto neste PDF (pode ser imagem escaneada). Digite ou cole o texto.", "invalid");
    return { texto: t.slice(0, 12000), truncado: t.length > 12000 };
  });
}

// ---- Administração (somente admin) ----
async function adminRun(nome: string, fn: (adminId: string) => Promise<void>) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin())) return { ok: false as const, error: "Acesso restrito à equipe." };
  try {
    await fn(user.id);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false as const, error: e.message };
    if (e instanceof ZodError) return { ok: false as const, error: "Dados inválidos." };
    await logEvent(`redacao.admin_${nome}_failed`, { error: (e as Error).message });
    return { ok: false as const, error: "Não foi possível salvar agora." };
  }
}
export async function adminCategoriaAction(name: string) {
  return adminRun("categoria", () => R.adminSaveCategory(name));
}
export async function adminAlternarCategoriaAction(id: string, active: boolean) {
  return adminRun("categoria_toggle", () => R.adminToggleCategory(id, active));
}
export async function adminTemaAction(input: Parameters<typeof R.adminSaveTheme>[1]) {
  return adminRun("tema", (uid) => R.adminSaveTheme(uid, input));
}
