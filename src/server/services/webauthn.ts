import "server-only";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransport,
} from "@simplewebauthn/server";
import { createAdminClient } from "../supabase";

const TTL_MS = 5 * 60 * 1000;
const RP_NAME = "APROVUM";

export interface RpInfo {
  rpID: string;
  origin: string;
}

/** RP ID e origem vêm do endereço que o aluno está usando (funciona em produção, preview e local). */
export function rpFromRequest(req: { headers: Headers }): RpInfo {
  const host = (req.headers.get("host") ?? "").split(":")[0] ?? "";
  const origin = req.headers.get("origin") ?? `https://${req.headers.get("host") ?? ""}`;
  return { rpID: host, origin };
}

const b64u = {
  enc: (b: Uint8Array) => Buffer.from(b).toString("base64url"),
  dec: (s: string) => new Uint8Array(Buffer.from(s, "base64url")),
};

async function saveChallenge(kind: "register" | "login", challenge: string, userId: string | null): Promise<string> {
  const db = createAdminClient();
  void db.from("webauthn_challenges").delete().lt("created_at", new Date(Date.now() - TTL_MS).toISOString());
  const { data, error } = await db.from("webauthn_challenges").insert({ kind, challenge, user_id: userId }).select("id").single();
  if (error || !data) throw new Error("Não foi possível iniciar a biometria.");
  return data.id as string;
}

/** Usa o desafio uma única vez (apaga ao ler). */
async function takeChallenge(id: string, kind: "register" | "login"): Promise<{ challenge: string; userId: string | null } | null> {
  const { data } = await createAdminClient().from("webauthn_challenges").delete().eq("id", id).eq("kind", kind).select("challenge,user_id,created_at").maybeSingle();
  if (!data || Date.now() - new Date(data.created_at as string).getTime() > TTL_MS) return null;
  return { challenge: data.challenge as string, userId: (data.user_id as string | null) ?? null };
}

export async function listCredentials(userId: string) {
  const { data } = await createAdminClient()
    .from("webauthn_credentials")
    .select("id,device_label,created_at,last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as { id: string; device_label: string; created_at: string; last_used_at: string | null }[];
}

export async function removeCredential(userId: string, id: string) {
  await createAdminClient().from("webauthn_credentials").delete().eq("user_id", userId).eq("id", id);
}

export async function registrationOptions(rp: RpInfo, user: { id: string; email: string | null }) {
  const existing = await createAdminClient().from("webauthn_credentials").select("id,transports").eq("user_id", user.id);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rp.rpID,
    userName: user.email ?? user.id,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: (existing.data ?? []).map((c) => ({ id: c.id as string, transports: c.transports as AuthenticatorTransport[] })),
    authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" },
  });
  const challengeId = await saveChallenge("register", options.challenge, user.id);
  return { options, challengeId };
}

export async function verifyRegistration(rp: RpInfo, user: { id: string }, challengeId: string, response: unknown, label: string) {
  const ch = await takeChallenge(challengeId, "register");
  if (!ch || ch.userId !== user.id) throw new Error("Tempo esgotado. Tente de novo.");
  const v = await verifyRegistrationResponse({
    response: response as Parameters<typeof verifyRegistrationResponse>[0]["response"],
    expectedChallenge: ch.challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
  });
  if (!v.verified || !v.registrationInfo) throw new Error("Não foi possível confirmar a biometria.");
  const c = v.registrationInfo.credential;
  const { error } = await createAdminClient().from("webauthn_credentials").insert({
    id: c.id,
    user_id: user.id,
    public_key: b64u.enc(c.publicKey),
    counter: c.counter,
    transports: c.transports ?? [],
    device_label: label.slice(0, 60) || "Este aparelho",
  });
  if (error) throw new Error("Não foi possível salvar a biometria.");
}

export async function loginOptions(rp: RpInfo) {
  const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: "required" });
  const challengeId = await saveChallenge("login", options.challenge, null);
  return { options, challengeId };
}

/** Confere a assinatura e devolve o dono da credencial. */
export async function verifyLogin(rp: RpInfo, challengeId: string, response: { id: string }): Promise<{ userId: string } | null> {
  const ch = await takeChallenge(challengeId, "login");
  if (!ch) return null;
  const db = createAdminClient();
  const { data: cred } = await db.from("webauthn_credentials").select("id,user_id,public_key,counter,transports").eq("id", response.id).maybeSingle();
  if (!cred) return null;
  try {
    const v = await verifyAuthenticationResponse({
      response: response as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
      expectedChallenge: ch.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: {
        id: cred.id as string,
        publicKey: b64u.dec(cred.public_key as string) as Uint8Array<ArrayBuffer>,
        counter: Number(cred.counter),
        transports: cred.transports as AuthenticatorTransport[],
      },
    });
    if (!v.verified) return null;
    await db.from("webauthn_credentials").update({ counter: v.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq("id", cred.id as string);
    return { userId: cred.user_id as string };
  } catch {
    return null;
  }
}
