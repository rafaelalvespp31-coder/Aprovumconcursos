"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, ChevronsRight, CircleAlert, Crosshair, Eye, EyeOff, Gift, Info, LoaderCircle, Lock, Mail, Mars, Rocket, User, Venus, X } from "lucide-react";
import { signUp, type AuthState } from "@/app/(auth)/actions";
import { normalizeWhatsapp } from "@/domain/contact/whatsapp";

type St = AuthState & { n?: number };
const initial: St = {};
/** Cada resposta do servidor ganha um número: o botão volta a tremer mesmo com o mesmo erro. */
const submit = async (s: St, form: FormData): Promise<St> => ({ ...(await signUp(s, form)), n: (s.n ?? 0) + 1 });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** (31) 99999-9999 enquanto digita (só dígitos; até 11). */
export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Mesmas regras do servidor: 8 a 72 caracteres, com letras e números. */
export function passwordChecks(p: string) {
  return { tamanho: p.length >= 8 && p.length <= 72, letras: /[A-Za-z]/.test(p), numeros: /\d/.test(p) };
}

const STEPS = ["Dados Pessoais", "Confirmar", "Pronto!"] as const;

function WhatsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  );
}

function FieldError({ id, msg }: { id: string; msg: string | null }) {
  if (!msg) return null;
  return (
    <p id={`${id}-erro`} className="cd-erro" role="alert">
      <CircleAlert aria-hidden /> {msg}
    </p>
  );
}

/** Rola o campo para o centro quando o teclado do celular abre (para não cobrir o campo). */
function keepVisible(e: React.FocusEvent<HTMLElement>) {
  if (typeof window === "undefined" || window.innerWidth >= 900) return;
  const el = e.currentTarget;
  window.setTimeout(() => {
    // Só rola se o teclado (área visível menor) estiver cobrindo o campo.
    const vv = window.visualViewport;
    const r = el.getBoundingClientRect();
    const bottom = vv ? vv.height + vv.offsetTop : window.innerHeight;
    if (r.bottom > bottom - 12 || r.top < 0) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 320);
}

export function CadastroForm({ refInicial = "" }: { refInicial?: string }) {
  const [state, action, pending] = useActionState(submit, initial);
  const [f, setF] = useState({ name: "", gender: "" as "" | "m" | "f", whatsapp: "", email: "", password: "", consent: false, referral: refInicial });
  const [show, setShow] = useState(false);
  // Avisos locais só depois da 1ª tentativa de envio (erro surgindo no blur desloca o botão sob o dedo).
  const [tried, setTried] = useState(false);
  const termos = useRef<HTMLDialogElement>(null);

  // Erro vindo do servidor: o botão treme e o primeiro campo com erro recebe o foco.
  useEffect(() => {
    if (!state.error && !state.fieldErrors) return;
    const first = Object.keys(state.fieldErrors ?? {})[0];
    const el = first ? document.querySelector<HTMLElement>(`[data-campo="${first}"]`) : null;
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state]);

  const pw = passwordChecks(f.password);
  const pwScore = Number(pw.tamanho) + Number(pw.letras) + Number(pw.numeros);
  const valid = {
    name: f.name.trim().length >= 2,
    gender: f.gender !== "",
    whatsapp: normalizeWhatsapp(f.whatsapp) !== null,
    email: EMAIL.test(f.email.trim()),
    password: pwScore === 3,
    consent: f.consent,
  };
  const allValid = Object.values(valid).every(Boolean);
  const done = !!state.message;
  const step = done ? 3 : allValid || pending ? 2 : 1;

  // Erro do servidor tem prioridade; depois, aviso local só para campo já tocado e inválido.
  // Campo corrigido some com o aviso (a senha mantém o do servidor, que pode recusar senha fraca).
  const err = (k: keyof typeof valid, local: string) => (k !== "password" && valid[k] ? null : state.fieldErrors?.[k] ?? (tried && !valid[k] ? local : null));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const eName = err("name", "Informe seu nome.");
  const eWhats = err("whatsapp", "Informe um WhatsApp válido com DDD.");
  const eEmail = err("email", "Informe um e-mail válido.");
  const eRef = state.fieldErrors?.referral ?? null;
  const ePass = err("password", "Use pelo menos 8 caracteres, com letras e números.");
  const eGender = valid.gender ? null : state.fieldErrors?.gender ?? null;
  const eConsent = valid.consent ? null : state.fieldErrors?.consent ?? null;

  return (
    <section className="cd-card cd-in" style={{ ["--d" as string]: "0.1s" }} aria-labelledby="cd-titulo" data-step={step}>
      <div className="cd-cabeca-wrap">
        <header className="cd-cabeca">
          <div className="cd-titulo-linha">
            <Crosshair className="cd-mira" aria-hidden strokeWidth={1.8} />
            <div>
              <h1 id="cd-titulo" className="cd-titulo">CRIAR <span>CONTA</span></h1>
              <p className="cd-subtitulo">Comece agora sua jornada rumo à aprovação!</p>
            </div>
          </div>
          <ol className="cd-passos" aria-label="Etapas do cadastro" style={{ ["--p" as string]: step }}>
            <span className="cd-trilho" aria-hidden><span /></span>
            {STEPS.map((s, i) => (
              <li key={s} data-on={i + 1 <= step ? 1 : undefined} data-atual={i + 1 === step ? 1 : undefined} aria-current={i + 1 === step ? "step" : undefined}>
                <b>{i + 1 < step ? <Check aria-hidden strokeWidth={3.2} /> : i + 1}</b>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </header>
      </div>

      <div className="cd-corpo">
        {done ? (
          <div className="cd-pronto" role="status">
            <span className="cd-pronto-icone" aria-hidden><Check strokeWidth={3} /></span>
            <h2>Conta criada. <span>Falta só confirmar!</span></h2>
            <p>{state.message}</p>
            <p className="cd-pronto-dica">Não chegou? Confira também a caixa de spam e as promoções.</p>
            <Link href="/entrar" className="cd-botao cd-botao-link">
              <span className="cd-botao-placa"><span>Ir para o login</span><ChevronsRight aria-hidden /></span>
            </Link>
          </div>
        ) : (
          <form action={action} onSubmit={() => setTried(true)} className="cd-form" noValidate>
            {state.error && (
              <p className="cd-alerta" role="alert"><CircleAlert aria-hidden /> {state.error}</p>
            )}

            <div className="cd-campo cd-in" style={{ ["--d" as string]: "0.25s" }} data-erro={eName ? 1 : undefined} data-ok={valid.name ? 1 : undefined}>
              <span className="cd-icone" aria-hidden><User /></span>
              <div className="cd-caixa">
                <label htmlFor="name">Nome</label>
                <input id="name" name="name" data-campo="name" autoComplete="name" required maxLength={80} placeholder="Digite seu nome completo..." value={f.name} onChange={(e) => set("name", e.target.value)} onFocus={keepVisible} aria-invalid={!!eName} aria-describedby={eName ? "name-erro" : undefined} />
                {valid.name && <Check className="cd-ok" aria-hidden />}
              </div>
              <FieldError id="name" msg={eName} />
            </div>

            <fieldset className="cd-genero cd-in" style={{ ["--d" as string]: "0.32s" }} aria-describedby={eGender ? "gender-erro" : undefined}>
              <legend><span className="cd-barras" aria-hidden>{"//"}</span> <b>Gênero</b> (defina o seu avatar)</legend>
              <div className="cd-genero-grade" data-testid="cadastro-genero">
                {([["m", "Masculino", Mars], ["f", "Feminino", Venus]] as const).map(([v, l, Icon]) => (
                  <label key={v} className="cd-genero-card" data-sel={f.gender === v ? 1 : undefined} data-g={v}>
                    <input type="radio" name="gender" value={v} required data-campo={v === "m" ? "gender" : undefined} checked={f.gender === v} onChange={() => set("gender", v)} />
                    {/* eslint-disable-next-line @next/next/no-img-element -- recorte fixo da arte oficial do avatar */}
                    <img src={`/cadastro/avatar-${v === "m" ? "masculino" : "feminino"}.webp`} alt="" width={v === "m" ? 518 : 366} height={560} loading="eager" decoding="async" />
                    <span className="cd-genero-txt">
                      <Icon className="cd-genero-simbolo" aria-hidden strokeWidth={2.4} />
                      <b>{l}</b>
                      <small>FOCO • DISCIPLINA • APROVAÇÃO</small>
                    </span>
                    <span className="cd-genero-marca" aria-hidden>{f.gender === v && <Check strokeWidth={3.4} />}</span>
                  </label>
                ))}
              </div>
              {eGender && <p id="gender-erro" className="cd-erro" role="alert"><CircleAlert aria-hidden /> {eGender}</p>}
            </fieldset>

            <div className="cd-dupla">
              <div className="cd-campo cd-in" style={{ ["--d" as string]: "0.4s" }} data-erro={eWhats ? 1 : undefined} data-ok={valid.whatsapp ? 1 : undefined}>
                <span className="cd-icone" aria-hidden><WhatsIcon /></span>
                <div className="cd-caixa">
                  <label htmlFor="whatsapp">WhatsApp</label>
                  <input id="whatsapp" name="whatsapp" data-campo="whatsapp" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="(31) 99999-9999" required maxLength={16} value={f.whatsapp} onChange={(e) => set("whatsapp", maskPhone(e.target.value))} onFocus={keepVisible} aria-invalid={!!eWhats} aria-describedby={`whatsapp-dica${eWhats ? " whatsapp-erro" : ""}`} data-testid="cadastro-whatsapp" />
                  {valid.whatsapp && <Check className="cd-ok" aria-hidden />}
                </div>
                <p id="whatsapp-dica" className="cd-dica"><Info aria-hidden /> Com DDD. Usaremos para te adicionar ao grupo VIP dos alunos.</p>
                <FieldError id="whatsapp" msg={eWhats} />
              </div>

              <div className="cd-campo cd-in" style={{ ["--d" as string]: "0.47s" }} data-erro={eEmail ? 1 : undefined} data-ok={valid.email ? 1 : undefined}>
                <span className="cd-icone" aria-hidden><Mail /></span>
                <div className="cd-caixa">
                  <label htmlFor="email">E-mail</label>
                  <input id="email" name="email" data-campo="email" type="email" autoComplete="email" inputMode="email" placeholder="seuemail@exemplo.com" required maxLength={254} value={f.email} onChange={(e) => set("email", e.target.value)} onFocus={keepVisible} aria-invalid={!!eEmail} aria-describedby={eEmail ? "email-erro" : undefined} />
                  {valid.email && <Check className="cd-ok" aria-hidden />}
                </div>
                <FieldError id="email" msg={eEmail} />
              </div>
            </div>

            <div className="cd-campo cd-in" style={{ ["--d" as string]: "0.5s" }} data-erro={eRef ? 1 : undefined}>
              <span className="cd-icone" aria-hidden><Gift /></span>
              <div className="cd-caixa">
                <label htmlFor="referral">ID de indicação <small>(opcional)</small></label>
                <input id="referral" name="referral" data-campo="referral" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="APV-XXXXXX" maxLength={12} value={f.referral} onChange={(e) => set("referral", e.target.value.toUpperCase())} onFocus={keepVisible} aria-invalid={!!eRef} aria-describedby={`referral-dica${eRef ? " referral-erro" : ""}`} data-testid="cadastro-indicacao" />
              </div>
              <p id="referral-dica" className="cd-regras"><span>Veio por indicação de um amigo? Se ele já assinar o plano anual ou vitalício, vocês dois ganham copo e camisa.</span></p>
              <FieldError id="referral" msg={eRef} />
            </div>

            <div className="cd-campo cd-in" style={{ ["--d" as string]: "0.54s" }} data-erro={ePass ? 1 : undefined} data-ok={valid.password ? 1 : undefined}>
              <span className="cd-icone" aria-hidden><Lock /></span>
              <div className="cd-caixa">
                <label htmlFor="password">Senha</label>
                <input id="password" name="password" data-campo="password" type={show ? "text" : "password"} autoComplete="new-password" placeholder="Crie uma senha forte..." required maxLength={72} value={f.password} onChange={(e) => set("password", e.target.value)} onFocus={keepVisible} aria-invalid={!!ePass} aria-describedby={`password-regras${ePass ? " password-erro" : ""}`} />
                <button type="button" className="cd-olho" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
                  {show ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                </button>
              </div>
              {f.password !== "" && (
                <div className="cd-forca" data-n={pwScore} aria-hidden>
                  <span /><span /><span />
                </div>
              )}
              <p id="password-regras" className="cd-regras">
                <span data-ok={pw.tamanho ? 1 : undefined}><Check aria-hidden /> 8+ caracteres</span>
                <span data-ok={pw.letras ? 1 : undefined}><Check aria-hidden /> letras</span>
                <span data-ok={pw.numeros ? 1 : undefined}><Check aria-hidden /> números</span>
              </p>
              <FieldError id="password" msg={ePass} />
            </div>

            <div className="cd-termos cd-in" style={{ ["--d" as string]: "0.6s" }} data-erro={eConsent ? 1 : undefined}>
              <label className="cd-termos-aceite">
                <input type="checkbox" name="consent" data-campo="consent" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} aria-describedby={eConsent ? "consent-erro" : undefined} />
                <span className="cd-check" aria-hidden><Check strokeWidth={3.4} /></span>
                <span className="cd-termos-txt">
                  <b>Li e aceito os termos de uso e a política de privacidade.</b>
                  <small>Meus dados são usados para fornecer o serviço e posso pedir a exclusão a qualquer momento.</small>
                </span>
              </label>
              <button type="button" className="cd-ver-termos" onClick={() => termos.current?.showModal()}>
                Ver termos <ChevronRight aria-hidden />
              </button>
            </div>
            {eConsent && <p id="consent-erro" className="cd-erro cd-erro-termos" role="alert"><CircleAlert aria-hidden /> {eConsent}</p>}

            <div className="cd-acao cd-in" style={{ ["--d" as string]: "0.7s" }}>
              <button type="submit" className="cd-botao" disabled={pending} data-estado={pending ? "enviando" : state.error || state.fieldErrors ? "erro" : undefined} key={state.n ?? 0} aria-busy={pending}>
                <span className="cd-botao-placa">
                  {pending ? <LoaderCircle className="cd-gira" aria-hidden /> : <Rocket className="cd-foguete" aria-hidden />}
                  <span>{pending ? "Criando conta…" : "Criar conta"}</span>
                  <ChevronsRight className="cd-avanca" aria-hidden />
                </span>
              </button>
            </div>
          </form>
        )}
      </div>

      <dialog ref={termos} className="cd-dialogo" aria-labelledby="cd-termos-titulo" onClick={(e) => e.target === e.currentTarget && termos.current?.close()}>
        <div className="cd-dialogo-miolo">
          <button type="button" className="cd-dialogo-fechar" onClick={() => termos.current?.close()} aria-label="Fechar"><X aria-hidden /></button>
          <h2 id="cd-termos-titulo">Termos de uso e <span>privacidade</span></h2>
          <p>Ao criar sua conta no APROVUM, você concorda com o uso dos dados informados neste cadastro apenas para fornecer o serviço:</p>
          <ul>
            <li><b>Nome e e-mail:</b> identificar sua conta, entrar na plataforma e recuperar a senha.</li>
            <li><b>Gênero:</b> definir o seu avatar.</li>
            <li><b>WhatsApp:</b> te adicionar ao grupo VIP dos alunos.</li>
            <li><b>Seu estudo</b> (aulas, questões e progresso): acompanhar a sua preparação.</li>
          </ul>
          <p>Cada conta é pessoal e fica conectada em um aparelho por vez. Você pode pedir a exclusão dos seus dados a qualquer momento.</p>
          <button type="button" className="cd-dialogo-ok" onClick={() => { set("consent", true); termos.current?.close(); }}>Li e aceito</button>
        </div>
      </dialog>
    </section>
  );
}
