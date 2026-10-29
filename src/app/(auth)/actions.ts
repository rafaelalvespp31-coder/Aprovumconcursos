"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createUserClient, createAdminClient, SESSION_ONLY_COOKIE } from "@/server/supabase";
import { publicEnv } from "@/lib/env";
import { CANONICAL_URL, nameMatches } from "@/domain/auth/identity";

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

async function rateLimited(action: string, max: number): Promise<boolean> {
  try {
    const { data } = await createAdminClient().rpc("check_rate_limit", {
      p_key: `${action}:${await clientIp()}`,
      p_window_seconds: 600,
      p_max: max,
    });
    return data === false;
  } catch {
    return false; // sem banco configurado o Supabase Auth ainda aplica seus próprios limites
  }
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

  // "Manter conectado": marcado (padrão) mantém a sessão; desmarcado, ela vale só até fechar o navegador.
  const store = await cookies();
  // O formulário envia "rememberField" junto do checkbox; sem ele (formulários antigos), mantém conectado.
  const remember = !form.has("rememberField") || form.get("remember") === "on";
  if (remember) store.delete(SESSION_ONLY_COOKIE);
  else store.set(SESSION_ONLY_COOKIE, "navegador", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "Confirme seu e-mail pelo link que enviamos antes de entrar." };
    // Mensagem única para não revelar se o e-mail existe.
    return { error: "E-mail ou senha incorretos." };
  }
  // Sessão única por conta: entrar aqui encerra a sessão dos outros aparelhos.
  await endOtherSessions(supabase);
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Informe seu nome.").max(80),
      email,
      password,
      consent: z.literal("on", { error: "É preciso aceitar os termos e a política de privacidade." }),
    })
    .safeParse({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      consent: form.get("consent"),
    });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (await rateLimited("signup", 5)) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name },
      emailRedirectTo: `${authBaseUrl()}/auth/callback?next=/nova-trilha`,
    },
  });
  if (error) {
    if (/password/i.test(error.message)) return { fieldErrors: { password: "Essa senha não é aceita. Escolha uma senha mais forte." } };
    return { error: GENERIC };
  }
  // Sem confirmação de e-mail habilitada, a sessão já vem criada.
  if (data.session) redirect("/nova-trilha");
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
