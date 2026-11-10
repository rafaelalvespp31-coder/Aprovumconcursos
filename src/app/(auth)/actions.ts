"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createUserClient, createAdminClient, SESSION_ONLY_COOKIE } from "@/server/supabase";
import { publicEnv } from "@/lib/env";
import { normalizeWhatsapp } from "@/domain/contact/whatsapp";
import { CANONICAL_URL, nameMatches } from "@/domain/auth/identity";
import { getPartnerStatus } from "@/server/services/partner";
import { initAvatarForNewUser } from "@/server/services/avatar";
import { ensureReferralCode, referralCodeExists, registerReferral } from "@/server/services/referral";
import { normalizeReferralCode } from "@/domain/referral/code";

export interface AuthState {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

/** Aceita apenas caminhos internos (evita redirecionamento aberto). */
function safeNext(v: FormDataEntryValue | null, fallback = "/painel"): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

async function rateLimitedKey(key: string, max: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("check_rate_limit", { p_key: key, p_window_seconds: 600, p_max: max });
    if (error) throw new Error(error.message);
    return data === false;
  } catch {
    // Em produção a checagem falha fechada: se o banco de limites não responde, o login/cadastro
    // também não funcionaria (mesmo projeto). Fora de produção segue liberado para não travar o desenvolvimento.
    return process.env.VERCEL_ENV === "production";
  }
}

async function rateLimited(action: string, max: number): Promise<boolean> {
  return rateLimitedKey(`${action}:${await clientIp()}`, max);
}

const email = z.email("Informe um e-mail válido.").max(254);
const password = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Use letras e números na senha.");

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}

const GENERIC = "Não foi possível concluir agora. Tente novamente em instantes.";

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email, password: z.string().min(1, "Informe a senha.") }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (await rateLimited("signin", 20)) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  // Limite por conta (qualquer origem): barra tentativa de senha distribuída em vários IPs contra um mesmo e-mail.
  if (await rateLimitedKey(`signin-conta:${parsed.data.email.toLowerCase()}`, 30)) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };

  // "Manter conectado": marcado (padrão) mantém a sessão; desmarcado, ela vale só até fechar o navegador.
  const store = await cookies();
  // O formulário envia "rememberField" junto do checkbox; sem ele (formulários antigos), mantém conectado.
  const remember = !form.has("rememberField") || form.get("remember") === "on";
  if (remember) store.delete(SESSION_ONLY_COOKIE);
  else store.set(SESSION_ONLY_COOKIE, "navegador", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });

  const supabase = await createUserClient();
  const { data: signed, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "Confirme seu e-mail pelo link que enviamos antes de entrar." };
    // Mensagem única para não revelar se o e-mail existe.
    return { error: "E-mail ou senha incorretos." };
  }
  // Sessão única por conta: entrar aqui encerra a sessão dos outros aparelhos.
  await endOtherSessions(supabase);
  // Sócio administrativo cai no APROVUM BUSINESS (conferido no servidor), mas continua aluno:
  // se pediu uma página específica, vai para ela; dos dois lados há atalho para o outro.
  const fallback = signed.user && (await getPartnerStatus(signed.user.id)).isPartner ? "/business" : "/painel";
  redirect(safeNext(form.get("next"), fallback));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Informe seu nome.").max(80),
      gender: z.enum(["m", "f"], { error: "Escolha o gênero do seu avatar." }),
      whatsapp: z.string().trim().refine((v) => normalizeWhatsapp(v) !== null, "Informe um WhatsApp válido com DDD."),
      email,
      password,
      consent: z.literal("on", { error: "É preciso aceitar os termos e a política de privacidade." }),
      referral: z.string().trim().max(20).optional(),
    })
    .safeParse({
      name: form.get("name"),
      gender: form.get("gender"),
      whatsapp: form.get("whatsapp"),
      email: form.get("email"),
      password: form.get("password"),
      consent: form.get("consent"),
      referral: form.get("referral") ?? undefined,
    });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  // ID de indicação é opcional, mas se foi preenchido precisa existir (o aluno corrige antes de criar a conta).
  if (parsed.data.referral) {
    if (!normalizeReferralCode(parsed.data.referral) || !(await referralCodeExists(parsed.data.referral)))
      return { fieldErrors: { referral: "Não encontramos esse ID de indicação. Confira com seu amigo ou deixe em branco." } };
  }
  if (await rateLimited("signup", 5)) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name, avatar_gender: parsed.data.gender, whatsapp: normalizeWhatsapp(parsed.data.whatsapp) },
      emailRedirectTo: `${authBaseUrl()}/auth/callback?next=/painel`,
    },
  });
  if (error) {
    if (/password/i.test(error.message)) return { fieldErrors: { password: "Essa senha não é aceita. Escolha uma senha mais forte." } };
    return { error: GENERIC };
  }
  // Avatar do gênero escolhido (falha aqui não impede o cadastro: o painel usa o gênero do cadastro).
  if (data.user?.id) await initAvatarForNewUser(data.user.id, parsed.data.gender).catch((e) => console.error("avatar.init", (e as Error).message));
  // Indicação: liga ao amigo que indicou e gera o código do novo aluno (falha aqui não impede o cadastro).
  if (data.user?.id) {
    if (parsed.data.referral) await registerReferral(data.user.id, parsed.data.referral).catch((e) => console.error("referral.register", (e as Error).message));
    await ensureReferralCode(data.user.id, { force: true }).catch((e) => console.error("referral.code", (e as Error).message));
  }
  // Sem confirmação de e-mail habilitada, a sessão já vem criada.
  if (data.session) redirect("/painel");
  return { message: "Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar a conta." };
}

/** Endereço dos links de e-mail: em produção, sempre o domínio oficial. */
function authBaseUrl(): string {
  return process.env.VERCEL_ENV === "production" ? CANONICAL_URL : publicEnv().siteUrl;
}

/**
 * Recuperar senha: o aluno informa o nome (como cadastrou) e o e-mail da conta. Se conferirem,
 * enviamos o link de redefinição para ESSE e-mail (é ele que prova que a conta é do aluno). A
 * resposta é a mesma conferindo ou não, para ninguém descobrir quem tem conta.
 */
export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ name: z.string().trim().min(2, "Informe seu nome completo, como no cadastro.").max(80), email })
    .safeParse({ name: form.get("name"), email: form.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (await rateLimited("reset", 5)) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  const done = { message: "Se o nome e o e-mail conferirem com uma conta, você receberá agora um e-mail com o link para criar a nova senha. O link abre em aprovumconcursos.com.br. Confira também a caixa de spam." };
  const { data, error } = await createAdminClient().rpc("auth_user_by_email", { p_email: parsed.data.email });
  if (error) {
    console.error("auth.reset_lookup", error.message);
    return { error: GENERIC };
  }
  const account = (data as Array<{ id: string; display_name: string | null }> | null)?.[0];
  if (!account || !nameMatches(parsed.data.name, account.display_name)) return done;
  const supabase = await createUserClient();
  const r = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${authBaseUrl()}/auth/callback?next=/redefinir-senha` });
  if (r.error) console.error("auth.reset_send", r.error.message);
  return done;
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." })
    .safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createUserClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "O link expirou. Solicite uma nova redefinição de senha." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: GENERIC };
  redirect("/painel?senha=alterada");
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  redirect("/entrar?saiu=1");
}

/** Encerra as outras sessões da conta (o aparelho atual continua conectado). */
async function endOtherSessions(supabase: Awaited<ReturnType<typeof createUserClient>>) {
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) console.error("auth.end_other_sessions", error.message);
}
