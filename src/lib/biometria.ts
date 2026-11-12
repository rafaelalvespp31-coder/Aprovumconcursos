"use client";

import { startAuthentication, startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";

/** True quando o aparelho tem digital/rosto (ou PIN do aparelho) disponível para o navegador. */
export async function biometriaDisponivel(): Promise<boolean> {
  try {
    return browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
  } catch {
    return false;
  }
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Não foi possível concluir.");
  return data;
}

function mensagem(e: unknown): string {
  const n = (e as { name?: string })?.name;
  if (n === "NotAllowedError" || n === "AbortError") return "Biometria cancelada ou não reconhecida.";
  if (n === "InvalidStateError") return "Este aparelho já está cadastrado.";
  return (e as Error)?.message || "Não foi possível usar a biometria.";
}

/** Entra com digital/rosto. Devolve o caminho para onde ir. */
export async function entrarComBiometria(next?: string): Promise<string> {
  try {
    const { options, challengeId } = await post<{ options: Parameters<typeof startAuthentication>[0]["optionsJSON"]; challengeId: string }>("/api/webauthn/login/options");
    const response = await startAuthentication({ optionsJSON: options });
    const { redirect } = await post<{ redirect: string }>("/api/webauthn/login/verify", { challengeId, response, next });
    return redirect;
  } catch (e) {
    throw new Error(mensagem(e));
  }
}

/** Cadastra a biometria deste aparelho (precisa estar logado). */
export async function ativarBiometria(label: string): Promise<void> {
  try {
    const { options, challengeId } = await post<{ options: Parameters<typeof startRegistration>[0]["optionsJSON"]; challengeId: string }>("/api/webauthn/register/options");
    const response = await startRegistration({ optionsJSON: options });
    await post("/api/webauthn/register/verify", { challengeId, response, label });
  } catch (e) {
    throw new Error(mensagem(e));
  }
}
