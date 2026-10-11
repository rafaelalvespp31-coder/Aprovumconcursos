"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "./actions";

const initial: AuthState = {};

function err(state: AuthState, k: string) {
  return state.fieldErrors?.[k] ?? null;
}

function PasswordInput({ id, name, autoComplete, invalid }: { id: string; name: string; autoComplete: string; invalid: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        className={`${inputClass} pr-20`}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-erro` : undefined}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-1 my-1 rounded px-3 t-small font-semibold text-destaque hover:bg-nevoa"
        aria-pressed={show}
      >
        {show ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}

export function SignInForm({ next, notice }: { next?: string; notice?: string | null }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {notice && <Notice tone="info">{notice}</Notice>}
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="email" label="E-mail" error={err(state, "email")}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className={inputClass} aria-invalid={!!err(state, "email")} />
      </Field>
      <Field id="password" label="Senha" error={err(state, "password")}>
        <PasswordInput id="password" name="password" autoComplete="current-password" invalid={!!err(state, "password")} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</Button>
      <div className="flex flex-wrap justify-between gap-2 t-small">
        <Link href="/recuperar-senha" className="text-destaque underline underline-offset-2">Esqueci a senha</Link>
        <Link href="/cadastro" className="text-destaque underline underline-offset-2">Criar conta</Link>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  if (state.message) return <Notice tone="sucesso" title="Confirme seu e-mail">{state.message}</Notice>;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      <Field id="name" label="Nome" error={err(state, "name")}>
        <input id="name" name="name" autoComplete="name" required maxLength={80} className={inputClass} aria-invalid={!!err(state, "name")} />
      </Field>
      <Field id="email" label="E-mail" error={err(state, "email")}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className={inputClass} aria-invalid={!!err(state, "email")} />
      </Field>
      <Field id="password" label="Senha" hint="Pelo menos 8 caracteres, com letras e números." error={err(state, "password")}>
        <PasswordInput id="password" name="password" autoComplete="new-password" invalid={!!err(state, "password")} />
      </Field>
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2 t-small">
          <input type="checkbox" name="consent" className="mt-1 size-4 accent-azul" />
          <span>
            Li e aceito os termos de uso e a política de privacidade. Meus dados são usados para fornecer o serviço e posso pedir a exclusão a qualquer momento.
          </span>
        </label>
        {err(state, "consent") && <p className="t-tiny text-erro" role="alert">{err(state, "consent")}</p>}
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Criando conta…" : "Criar conta"}</Button>
      <p className="t-small">
        Já tem conta? <Link href="/entrar" className="text-destaque underline underline-offset-2">Entrar</Link>
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  if (state.message) return <Notice tone="sucesso">{state.message}</Notice>;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      <Field id="email" label="E-mail da conta" error={err(state, "email")}>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} aria-invalid={!!err(state, "email")} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar link de redefinição"}</Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      <Field id="password" label="Nova senha" hint="Pelo menos 8 caracteres, com letras e números." error={err(state, "password")}>
        <PasswordInput id="password" name="password" autoComplete="new-password" invalid={!!err(state, "password")} />
      </Field>
      <Field id="confirm" label="Repita a nova senha" error={err(state, "confirm")}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" invalid={!!err(state, "confirm")} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar nova senha"}</Button>
    </form>
  );
}
