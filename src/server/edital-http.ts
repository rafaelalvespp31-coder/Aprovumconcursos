import "server-only";
import { NextResponse } from "next/server";
import { UserFacingError } from "./services/trails";
import { logEvent } from "./observability";

/** Resposta de erro padrão das rotas do APROVUM AI (mensagem ao aluno; detalhe técnico só no log). */
export function fail(e: unknown, tag: string) {
  const headers = { "Cache-Control": "no-store" };
  if (e instanceof UserFacingError) {
    const status = e.code === "rate_limited" ? 429 : e.code === "not_found" ? 404 : 400;
    return NextResponse.json({ error: e.message, code: e.code }, { status, headers });
  }
  void logEvent(tag, { error: (e as Error).message.slice(0, 300) });
  return NextResponse.json({ error: "Não foi possível concluir agora. Tente novamente." }, { status: 500, headers });
}
