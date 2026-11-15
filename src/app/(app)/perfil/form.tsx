"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, Minus, Plus } from "lucide-react";
import { Notice } from "@/components/ui";
import { formatWhatsapp } from "@/domain/contact/whatsapp";
import { updateProfileAction, type ProfileState } from "./actions";

const campo =
  "peer w-full rounded-[16px] border border-[#E2E2E2] bg-white px-4 pb-2 pt-6 min-h-[58px] text-[16px] text-[#0A0A0A] placeholder:text-[#767676] outline-none transition-[border-color,box-shadow] duration-150 ease-out hover:border-[#C9C9C9] focus:border-[#E10600] focus:shadow-[0_0_0_4px_rgba(225,6,0,0.12)] focus-visible:border-[#E10600]";
const rotulo =
  "pointer-events-none absolute left-4 top-[9px] text-[11px] font-bold uppercase tracking-wide text-[#5C5C5C] transition-[transform,color] duration-150 ease-out peer-focus:text-[#B30000]";

/** Campo com rótulo que fica fixo no alto (sempre legível) e anel vermelho no foco. */
function Campo({ id, label, hint, children, extra }: { id: string; label: string; hint?: ReactNode; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {children}
        <label htmlFor={id} className={rotulo}>{label}</label>
        {extra && <span className="pointer-events-none absolute right-4 top-[9px] text-[11px] font-semibold tabular-nums text-[#5C5C5C]">{extra}</span>}
      </div>
      {hint && <p id={`${id}-hint`} className="px-1 text-[12px] leading-snug text-[#4D4D4D]">{hint}</p>}
    </div>
  );
}

/** Meta numérica com − e +, número grande e atalhos. O <input> real continua no formulário. */
function Meta({ id, label, hint, value, setValue, min, max, presets, unit }: {
  id: string; label: string; hint: string; value: string; setValue: (v: string) => void; min: number; max: number; presets: number[]; unit: string;
}) {
  const n = value === "" ? null : Number(value);
  const set = (v: number | null) => setValue(v === null ? "" : String(Math.max(min, Math.min(max, v))));
  const btn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E2E2E2] bg-white text-[#0A0A0A] transition-[transform,border-color,background-color] duration-150 ease-out hover:border-[#E10600] hover:bg-[#FFF5F4] active:scale-[0.92] disabled:opacity-40 disabled:hover:border-[#E2E2E2] disabled:hover:bg-white";
  return (
    <div className="rounded-[22px] border border-[#EBEBEB] bg-[#FAFAFA] p-4">
      <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wide text-[#5C5C5C]">{label}</label>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" className={btn} onClick={() => set((n ?? min) - 1)} disabled={n === null || n <= min} aria-label={`Diminuir ${label}`}><Minus className="h-4 w-4" aria-hidden /></button>
        <div className="min-w-0 text-center">
          <input
            id={id} name={id} type="number" inputMode="numeric" min={min} max={max} value={value} placeholder="—" aria-describedby={`${id}-hint`}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 rounded-[12px] bg-transparent text-center font-[Space_Grotesk] text-[40px] font-[800] leading-none tabular-nums text-[#0A0A0A] outline-none placeholder:text-[#C2C2C2] focus-visible:shadow-[0_0_0_4px_rgba(225,6,0,0.12)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <div className="text-[11px] text-[#5C5C5C]">{n === null ? "sem meta" : unit}</div>
        </div>
        <button type="button" className={btn} onClick={() => set((n ?? min - 1) + 1)} disabled={n !== null && n >= max} aria-label={`Aumentar ${label}`}><Plus className="h-4 w-4" aria-hidden /></button>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5" role="group" aria-label={`Atalhos de ${label}`}>
        {presets.map((p) => (
          <button key={p} type="button" onClick={() => set(p)} aria-pressed={n === p}
            className={`min-h-9 rounded-full border px-3 text-[12px] font-bold tabular-nums transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.95] ${n === p ? "border-[#E10600] bg-[#E10600] text-white" : "border-[#E2E2E2] bg-white text-[#0A0A0A] hover:border-[#E10600]"}`}>
            {p}
          </button>
        ))}
      </div>
      <p id={`${id}-hint`} className="mt-3 text-center text-[12px] leading-snug text-[#4D4D4D]">{hint}</p>
    </div>
  );
}

export function ProfileForm({ displayName, dailyQuestions, weeklyLessons, avatarGender, whatsapp, motto, birthDate }: { birthDate?: string | null; whatsapp?: string | null; motto?: string | null; displayName: string; dailyQuestions: number | null; weeklyLessons: number | null; avatarGender?: "m" | "f" | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  const initial = useRef({ name: displayName, wa: formatWhatsapp(whatsapp), birth: birthDate ?? "", motto: motto ?? "", g: avatarGender ?? "m", dq: dailyQuestions === null ? "" : String(dailyQuestions), wl: weeklyLessons === null ? "" : String(weeklyLessons) });
  const [name, setName] = useState(initial.current.name);
  const [wa, setWa] = useState(initial.current.wa);
  const [birth, setBirth] = useState(initial.current.birth);
  const [frase, setFrase] = useState(initial.current.motto);
  const [g, setG] = useState<"m" | "f">(initial.current.g);
  const [dq, setDq] = useState(initial.current.dq);
  const [wl, setWl] = useState(initial.current.wl);
  const [saved, setSaved] = useState(false);

  const i = initial.current;
  const dirty = name !== i.name || wa !== i.wa || birth !== i.birth || frase !== i.motto || g !== i.g || dq !== i.dq || wl !== i.wl;

  // Depois de salvar, a versão atual vira a base: o aviso de "não salvo" some.
  useEffect(() => {
    if (!state.ok) return;
    initial.current = { name, wa, birth, motto: frase, g, dq, wl };
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const week = dq === "" ? null : Number(dq) * 7;
  const sexo = (v: "m" | "f", rotuloTxt: string, glyph: string) => (
    <label className={`pf-sexo relative flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[20px] border-2 bg-white p-3 text-center transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out has-[:focus-visible]:shadow-[0_0_0_4px_rgba(225,6,0,0.18)] active:scale-[0.97] ${g === v ? "border-[#E10600] bg-[#FFF5F4] shadow-[0_14px_30px_-18px_rgba(225,6,0,0.7)] [transform:translateY(-2px)]" : "border-[#E2E2E2] hover:border-[#C9C9C9]"}`}>
      <input type="radio" name="avatar_gender" value={v} checked={g === v} onChange={() => setG(v)} className="sr-only" data-testid={`perfil-genero-${v}`} />
      <span className="text-[30px]" aria-hidden>{glyph}</span>
      <span className="text-[12px] font-bold">{rotuloTxt}</span>
      {g === v && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#E10600] text-white" aria-hidden><Check className="h-3 w-3" /></span>}
    </label>
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.ok && <Notice tone="sucesso">Alterações salvas.</Notice>}
      {state.error && <Notice tone="erro">{state.error}</Notice>}

      {/* Prévia ao vivo: como você aparece no ranking */}
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#141414] to-[#3A0707] p-4 text-white" data-testid="perfil-previa" aria-live="polite">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">Assim você aparece no ranking</div>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/10 text-[26px]" aria-hidden>{g === "f" ? "👩‍🎓" : "👨‍🎓"}</span>
          <div className="min-w-0">
            <div className="truncate font-[Space_Grotesk] text-[18px] font-[800] leading-tight">{name.trim() || "Seu nome"}</div>
            <div className="truncate text-[12px] text-white/80">{frase.trim() || "Sua frase aparece aqui"}</div>
          </div>
        </div>
      </div>

      <Campo id="display_name" label="Nome">
        <input id="display_name" name="display_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nome" autoComplete="name" className={campo} />
      </Campo>
      <Campo id="whatsapp" label="WhatsApp" hint="Para te adicionar ao grupo VIP. Só você e a equipe veem.">
        <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999" value={wa} onChange={(e) => setWa(e.target.value)} maxLength={25} aria-describedby="whatsapp-hint" className={campo} data-testid="perfil-whatsapp" />
      </Campo>
      <Campo id="birth_date" label="Data de nascimento" hint="Opcional. O Mentor usa para te conhecer melhor e ajustar o plano de estudo. Só você e a equipe veem.">
        <input id="birth_date" name="birth_date" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} min="1930-01-01" max={new Date().toISOString().slice(0, 10)} aria-describedby="birth_date-hint" className={`${campo} appearance-none`} data-testid="perfil-nascimento" />
      </Campo>
      <Campo id="motto" label="Frase no ranking" extra={`${frase.length}/60`} hint="Curta e livre. Aparece ao lado do seu nome no Ranking APROVUM.">
        <input id="motto" name="motto" value={frase} onChange={(e) => setFrase(e.target.value)} maxLength={60} placeholder="Ex.: Disciplina vence talento." aria-describedby="motto-hint" className={`${campo} pr-16`} data-testid="perfil-frase" />
      </Campo>

      <fieldset>
        <legend className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-[#5C5C5C]">Personagem do avatar</legend>
        <div className="grid grid-cols-2 gap-3" data-testid="perfil-genero">
          {sexo("m", "Masculino", "👨‍🎓")}
          {sexo("f", "Feminino", "👩‍🎓")}
        </div>
        <p className="mt-1.5 px-1 text-[12px] text-[#4D4D4D]">Define o personagem que aparece no painel.</p>
      </fieldset>

      <div id="metas" className="grid scroll-mt-24 gap-4 sm:grid-cols-2">
        <Meta id="daily_questions_goal" label="Meta diária de questões" hint="Opcional. Aparece no painel." value={dq} setValue={setDq} min={1} max={500} presets={[10, 20, 30, 50]} unit={dq === "1" ? "questão por dia" : "questões por dia"} />
        <Meta id="weekly_lessons_goal" label="Meta semanal de aulas" hint="Opcional. Conta aulas com leitura concluída." value={wl} setValue={setWl} min={1} max={100} presets={[2, 3, 5, 7]} unit={wl === "1" ? "aula por semana" : "aulas por semana"} />
      </div>
      {week !== null && <p className="-mt-2 px-1 text-center text-[12px] text-[#4D4D4D]" aria-live="polite">No ritmo de {dq} por dia, são <strong className="tabular-nums text-[#0A0A0A]">{week}</strong> questões por semana.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit" disabled={pending}
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-bold text-white transition-[transform,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] disabled:opacity-70 ${saved ? "bg-[#0F7B3F]" : "bg-[#E10600] hover:bg-[#B30000]"} ${dirty && !pending ? "pf-pulso" : ""}`}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : saved ? <Check className="h-4 w-4" aria-hidden /> : null}
          {pending ? "Salvando…" : saved ? "Salvo" : "Salvar alterações"}
        </button>
        <span className={`text-[12px] font-semibold transition-opacity duration-200 ${dirty ? "text-[#B30000] opacity-100" : "opacity-0"}`} aria-live="polite">{dirty ? "Você tem alterações não salvas." : ""}</span>
      </div>
    </form>
  );
}
