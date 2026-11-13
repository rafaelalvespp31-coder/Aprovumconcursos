"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CircleAlert, Eye, EyeOff, Info, LoaderCircle, Lock, LogIn, Mail, UserPlus, Check } from "lucide-react";
import { signIn, type AuthState } from "@/app/(auth)/actions";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Formulário de acesso (tela de login tática). Conectado ao login real (Supabase, ação
 * `signIn`): validação no navegador antes de enviar, erros do servidor exibidos como
 * vieram, estado de carregamento e redirecionamento só quando o servidor confirma.
 */
export function LoginForm({ next, notice }: { next?: string; notice?: string | null }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [local, setLocal] = useState<{ email?: string; password?: string }>({});

  const emailError = local.email ?? state.fieldErrors?.email;
  const passwordError = local.password ?? state.fieldErrors?.password;

  return (
    <form
      action={action}
      noValidate
      className="flex flex-col"
      onSubmit={(e) => {
        const f = new FormData(e.currentTarget);
        const email = String(f.get("email") ?? "").trim();
        const password = String(f.get("password") ?? "");
        const errs = {
          email: !email ? "Informe seu e-mail." : !EMAIL.test(email) ? "Informe um e-mail válido." : undefined,
          password: !password ? "Informe a senha." : undefined,
        };
        setLocal(errs);
        if (errs.email || errs.password) {
          e.preventDefault();
          (e.currentTarget.querySelector(errs.email ? "#login-email" : "#login-senha") as HTMLInputElement | null)?.focus();
        }
      }}
    >
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="rememberField" value="1" />

      {notice && (
        <p className="login-aviso order-0 mb-4" role="status">
          <Info className="size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}
      {state.error && (
        <p className="login-aviso login-aviso-erro order-0 mb-4" role="alert">
          <CircleAlert className="size-4 shrink-0" aria-hidden /> {state.error}
        </p>
      )}

      <div className="order-1 flex flex-col gap-1.5">
        <label htmlFor="login-email" className="sr-only">E-mail</label>
        <div className={`login-campo ${emailError ? "login-campo-erro" : ""}`}>
          <Mail className="login-campo-icone" aria-hidden />
          <input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="E-mail"
            required
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "login-email-erro" : undefined}
            onInput={() => local.email && setLocal((l) => ({ ...l, email: undefined }))}
          />
        </div>
        {emailError && <p id="login-email-erro" className="login-erro" role="alert">{emailError}</p>}
      </div>

      <div className="order-1 mt-3.5 flex flex-col gap-1.5">
        <label htmlFor="login-senha" className="sr-only">Senha</label>
        <div className={`login-campo ${passwordError ? "login-campo-erro" : ""}`}>
          <Lock className="login-campo-icone" aria-hidden />
          <input
            id="login-senha"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Senha"
            required
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? "login-senha-erro" : undefined}
            onInput={() => local.password && setLocal((l) => ({ ...l, password: undefined }))}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="login-olho"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        </div>
        {passwordError && <p id="login-senha-erro" className="login-erro" role="alert">{passwordError}</p>}
      </div>

      {/* Ordem como na referência: no celular "Manter conectado" vem antes do botão; no desktop, no fim do painel. */}
      <div className="order-2 mt-2.5 flex justify-end">
        <Link href="/recuperar-senha" className="login-link">
          Esqueci minha senha
        </Link>
      </div>

      <label className="login-check order-3 mt-1 lg:order-7 lg:mt-6">
        <input type="checkbox" name="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span className="login-check-caixa" aria-hidden>
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        Manter conectado
      </label>

      <button type="submit" disabled={pending} className="login-botao order-4 mt-5 lg:mt-7" aria-live="polite">
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <LogIn className="size-5" aria-hidden />}
        {pending ? "Entrando…" : "Entrar na operação"}
      </button>

      <div className="login-ou order-5 my-5" aria-hidden>
        <span>ou</span>
      </div>

      <Link href="/cadastro" className="login-botao-sec order-6">
        <UserPlus className="size-5" aria-hidden /> Criar conta
      </Link>
    </form>
  );
}
