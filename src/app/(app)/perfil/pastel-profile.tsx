"use client";

import { Check, Crown, Flame, Lock, RotateCw, Target, Zap } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { PastelCard } from "@/components/pastel/card";
import { THEMES_PER_LEVEL, type Gamification } from "@/domain/progress/gamification";

export interface ProfileData {
  name: string | null;
  email: string | null;
  /** ISO da criação da conta. */
  since: string | null;
  now?: string;
  gamification: Gamification;
  themesPassed: number;
  goals: { dailyQuestions: number | null; weeklyLessons: number | null };
  today: { answered: number };
  weekLessonsCompleted: number;
}

function studyingFor(since: string | null, nowIso?: string): string | null {
  if (!since) return null;
  const days = Math.floor(((nowIso ? Date.parse(nowIso) : Date.now()) - Date.parse(since)) / 86_400_000);
  if (days < 1) return "Começou hoje";
  if (days < 31) return `Estudando há ${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  return `Estudando há ${months} ${months > 1 ? "meses" : "mês"}`;
}

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Número que sobe até o valor (700 ms, ease-out). Sem movimento para quem pediu menos. */
function useCountUp(target: number, ms = 700): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** `true` um instante depois de montar: dispara as transições de entrada (anéis, barras). */
function useReady(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setR(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return r;
}

function Ring({ pct, size, stroke, ready, track = "rgba(255,255,255,0.14)", from = "#FF4D4D", to = "#E10600", children, label }: {
  pct: number; size: number; stroke: number; ready: boolean; track?: string; from?: string; to?: string; children?: ReactNode; label: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = `g${size}${from.slice(1)}${to.slice(1)}`;
  const shown = ready ? Math.max(0, Math.min(100, pct)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
          className="transition-[stroke-dashoffset] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** Carteirinha 3D: inclina com o ponteiro (só mouse), brilho holográfico e vira ao clicar. */
function Carteirinha({ p, since, ready }: { p: ProfileData; since: string | null; ready: boolean }) {
  const g = p.gamification;
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const pct = Math.round(g.level.progress * 100);
  const shown = useCountUp(pct);
  const lvl = useCountUp(g.level.level, 600);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${((x - 0.5) * 14).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    for (const k of ["--rx", "--ry"]) el.style.setProperty(k, "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  };

  const face = "absolute inset-0 overflow-hidden rounded-[28px] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";
  const stats: Array<[string, string]> = [
    ["Temas vencidos", String(p.themesPassed)],
    ["Melhor sequência", `${g.streak.best} ${g.streak.best === 1 ? "dia" : "dias"}`],
    ["Taxa de acerto", g.accuracy === null ? "sem dados ainda" : `${Math.round(g.accuracy * 100)}%`],
    ["Conquistas", `${g.unlockedCount} de ${g.achievements.length}`],
  ];

  return (
    <div className="[perspective:1100px]">
      <div
        ref={ref}
        onPointerMove={move}
        onPointerLeave={leave}
        data-testid="perfil-carteirinha"
        className="relative h-[300px] w-full transition-transform duration-[220ms] ease-out [transform-style:preserve-3d] motion-reduce:transition-none sm:h-[280px]"
        style={{ transform: `rotateX(var(--rx,0deg)) rotateY(calc(var(--ry,0deg) + ${flipped ? 180 : 0}deg))`, transition: "transform 520ms cubic-bezier(0.22,1,0.36,1)" } as CSSProperties}
      >
        {/* frente */}
        <div className={`${face} bg-gradient-to-br from-[#161616] via-[#240505] to-[#5A0606] text-white shadow-[0_24px_60px_-18px_rgba(225,6,0,0.55)]`} aria-hidden={flipped}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "18px 18px" }} aria-hidden />
          <div className="pf-orb pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#FF1E1E]/40 blur-[40px]" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 mix-blend-soft-light"
            style={{ background: "radial-gradient(420px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.55), transparent 55%)" }}
            aria-hidden
          />
          <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">APROVUM · Carteirinha do aprovado</div>
                <h1 className="mt-2 truncate font-[Space_Grotesk] text-[24px] font-[800] leading-none sm:text-[28px]">{p.name ?? "Seu perfil"}</h1>
                <div className="mt-1.5 truncate text-[12px] text-white/80">{[p.email, since].filter(Boolean).join(" • ")}</div>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-white/25 bg-white/10 text-[28px] backdrop-blur-sm" aria-hidden>🧑‍🎓</div>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70"><Crown className="h-3.5 w-3.5 text-[#FF6B6B]" aria-hidden />Nível</div>
                <div className="font-[Space_Grotesk] text-[64px] font-[800] leading-[0.9] tabular-nums sm:text-[72px]" data-testid="nivel" aria-label={`Nível ${g.level.level}`}>
                  <span aria-hidden>{lvl}</span>
                </div>
                <div className="mt-1 text-[11px] text-white/80">{p.themesPassed} {p.themesPassed === 1 ? "tema vencido" : "temas vencidos"}</div>
              </div>
              <Ring
                pct={pct} size={104} stroke={9} ready={ready} track="rgba(255,255,255,0.16)"
                label={`Progresso para o nível ${g.level.level + 1}: ${pct}%`}
              >
                <div className="text-center leading-none">
                  <div className="font-[Space_Grotesk] text-[24px] font-[800] tabular-nums">{shown}%</div>
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-white/70">p/ nível {g.level.level + 1}</div>
                </div>
              </Ring>
            </div>
          </div>
        </div>

        {/* verso */}
        <div className={`${face} bg-gradient-to-br from-[#FFF5F4] to-[#FFFFFF] text-[#0A0A0A] [transform:rotateY(180deg)]`} style={{ border: "1px solid #F1D6D4" }} aria-hidden={!flipped}>
          <div className="flex h-full flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B30000]">Seu desempenho</div>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                {stats.map(([k, v]) => (
                  <div key={k} className="rounded-[14px] border border-[#F1D6D4] bg-white p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#5C5C5C]">{k}</dt>
                    <dd className="mt-1 font-[Space_Grotesk] text-[18px] font-[800] leading-tight">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="text-[11px] leading-snug text-[#4D4D4D]">Você sobe um nível a cada {THEMES_PER_LEVEL} temas vencidos: todas as questões do tema, 75% de acerto e as essenciais corretas.</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        className="mx-auto mt-3 flex min-h-11 items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 text-[12px] font-bold text-[#0A0A0A] transition-[transform,box-shadow] duration-150 ease-out hover:shadow-md active:scale-[0.97]"
      >
        <RotateCw className={`h-4 w-4 transition-transform duration-500 ${flipped ? "rotate-180" : ""}`} aria-hidden />
        {flipped ? "Ver a frente" : "Virar a carteirinha"}
      </button>
    </div>
  );
}

/** Sequência: chama + os últimos 7 dias, que entram em cascata. */
function Sequencia({ g, ready }: { g: Gamification; ready: boolean }) {
  const n = useCountUp(g.streak.current, 600);
  const dow = ["D", "S", "T", "Q", "Q", "S", "S"];
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(new Date().getDay()), []);
  return (
    <PastelCard noTilt className="p-5 sm:p-6" testId="perfil-sequencia">
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#FDECEC]" aria-hidden>
          <Flame className={`h-8 w-8 text-[#E10600] ${g.streak.current > 0 ? "pf-flame" : "opacity-40"}`} />
        </div>
        <div className="min-w-0">
          <div className="font-[Space_Grotesk] text-[28px] font-[800] leading-none tabular-nums">
            {n} <span className="text-[14px] font-bold text-[#5C5C5C]">{g.streak.current === 1 ? "dia" : "dias"}</span>
          </div>
          <div className="mt-1 text-[11px] text-[#5C5C5C]">Sequência atual{g.streak.studiedToday ? " · hoje já conta" : g.streak.current > 0 ? " · estude hoje para manter" : ""}</div>
        </div>
      </div>
      <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Últimos 7 dias de estudo">
        {g.streak.last7.map((on, i) => {
          const label = today === null ? "" : dow[(today - (6 - i) + 14) % 7]!;
          return (
            <li key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={`pf-dia flex h-9 w-full items-center justify-center rounded-[12px] border text-[12px] font-bold transition-[transform,background-color] duration-200 ease-out ${on ? "border-transparent bg-gradient-to-br from-[#FF3B3B] to-[#B30000] text-white" : "border-[#E5E5E5] bg-[#F7F7F7] text-[#8A8A8A]"} ${ready ? "pf-dia-in" : "opacity-0"}`}
                style={{ animationDelay: `${i * 55}ms` }}
              >
                {on ? <Check className="h-4 w-4" aria-hidden /> : null}
                <span className="sr-only">{on ? "estudou" : "não estudou"}</span>
              </span>
              <span className="text-[10px] font-semibold text-[#5C5C5C]" aria-hidden>{label}</span>
            </li>
          );
        })}
      </ol>
    </PastelCard>
  );
}

/** Trilha de níveis: o anterior, o atual e os três próximos. Passe o mouse ou toque para ver a meta de cada um. */
function TrilhaNiveis({ g, themesPassed }: { g: Gamification; themesPassed: number }) {
  const cur = g.level.level;
  const first = Math.max(1, cur - 1);
  const levels = Array.from({ length: 5 }, (_, i) => first + i);
  const [open, setOpen] = useState<number | null>(null);
  const need = (n: number) => (n - 1) * THEMES_PER_LEVEL;
  return (
    <PastelCard noTilt className="p-5 sm:p-6" testId="perfil-trilha">
      <h2 className="text-[13px] font-bold">Sua trilha de níveis</h2>
      <ol className="relative mt-5 flex items-start justify-between">
        <span className="absolute left-5 right-5 top-[19px] h-1 rounded-full bg-[#EBEBEB]" aria-hidden />
        <span
          className="absolute left-5 top-[19px] h-1 rounded-full bg-gradient-to-r from-[#FF1E1E] to-[#B30000] transition-[width] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ width: `calc((100% - 40px) * ${Math.min(1, (cur - first + g.level.progress) / 4)})` }}
          aria-hidden
        />
        {levels.map((n) => {
          const done = n < cur;
          const now = n === cur;
          return (
            <li key={n} className="relative z-10 flex w-10 flex-col items-center">
              <button
                type="button"
                onClick={() => setOpen(open === n ? null : n)}
                onMouseEnter={() => setOpen(n)}
                onMouseLeave={() => setOpen(null)}
                onFocus={() => setOpen(n)}
                onBlur={() => setOpen(null)}
                aria-label={`Nível ${n}: ${done ? "concluído" : now ? "atual" : "bloqueado"}. Exige ${need(n)} temas vencidos.`}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-[13px] font-[800] transition-transform duration-150 ease-out hover:scale-110 active:scale-95 ${
                  done ? "border-[#B30000] bg-[#B30000] text-white" : now ? "pf-pulso border-[#E10600] bg-white text-[#E10600]" : "border-[#E0E0E0] bg-white text-[#9A9A9A]"
                }`}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : now ? n : <Lock className="h-3.5 w-3.5" aria-hidden />}
              </button>
              <span className="mt-1.5 text-[10px] font-semibold text-[#5C5C5C]" aria-hidden>Nv {n}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 min-h-[34px] text-[12px] text-[#4D4D4D]" aria-live="polite">
        {open === null
          ? `Faltam ${g.level.remaining} ${g.level.remaining > 1 ? "temas" : "tema"} para o Nível ${cur + 1}.`
          : open <= cur
            ? `Nível ${open}: ${need(open)} ${need(open) === 1 ? "tema vencido" : "temas vencidos"}${open < cur ? ", conquistado." : ", você está aqui."}`
            : `Nível ${open}: faltam ${need(open) - themesPassed} ${need(open) - themesPassed === 1 ? "tema" : "temas"} (total de ${need(open)} vencidos).`}
      </p>
    </PastelCard>
  );
}

/** Conquistas: cada medalha mostra o quanto falta; toque para ver a regra. */
function Conquistas({ g, ready }: { g: Gamification; ready: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const chosen = g.achievements.find((a) => a.id === sel) ?? null;
  return (
    <PastelCard noTilt className="p-5 sm:p-6" testId="perfil-conquistas">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-bold">Conquistas</h2>
        <span className="rounded-full bg-[#F4F4F4] px-2.5 py-1 text-[11px] font-bold">{g.unlockedCount} de {g.achievements.length}</span>
      </div>
      <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {g.achievements.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setSel(sel === a.id ? null : a.id)}
              aria-pressed={sel === a.id}
              aria-label={`${a.title}: ${a.unlocked ? "conquistada" : a.status}`}
              className={`pf-medalha flex w-full flex-col items-center gap-1.5 rounded-[16px] border p-2 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${sel === a.id ? "border-[#E10600] bg-[#FFF5F4]" : "border-[#EBEBEB] bg-white"} ${ready ? "pf-dia-in" : "opacity-0"}`}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <Ring pct={a.unlocked ? 100 : a.progress * 100} size={46} stroke={4} ready={ready} track="#EDEDED" from={a.unlocked ? "#FF3B3B" : "#C9C9C9"} to={a.unlocked ? "#B30000" : "#A5A5A5"} label="">
                <span className={`text-[20px] ${a.unlocked ? "" : "opacity-45 grayscale"}`} aria-hidden>{a.icon}</span>
              </Ring>
              <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight">{a.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 min-h-[40px] rounded-[12px] bg-[#F7F7F7] p-3 text-[12px] text-[#4D4D4D]" aria-live="polite">
        {chosen ? (
          <>
            <strong className="text-[#0A0A0A]">{chosen.title}.</strong> {chosen.rule} <span className="font-semibold text-[#B30000]">{chosen.unlocked ? "Conquistada." : chosen.status}</span>
          </>
        ) : (
          "Toque em uma medalha para ver como conquistar."
        )}
      </div>
    </PastelCard>
  );
}

function MetaRing({ label, value, goal, ready, from, to }: { label: string; value: number; goal: number | null; ready: boolean; from: string; to: string }) {
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  const v = useCountUp(value, 700);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Ring pct={pct} size={92} stroke={8} ready={ready} from={from} to={to} label={goal ? `${label}: ${value} de ${goal}, ${pct}%` : `${label}: ${value}, sem meta`}>
        <div className="leading-none">
          <div className="font-[Space_Grotesk] text-[22px] font-[800] tabular-nums">{v}</div>
          <div className="mt-0.5 text-[10px] text-white/70">{goal ? `de ${goal}` : "sem meta"}</div>
        </div>
      </Ring>
      <div className="text-[12px] font-semibold text-white/85">{label}</div>
      <div className="text-[11px] font-bold text-white">{goal ? `${pct}%` : "—"}</div>
    </div>
  );
}

/** Perfil "Carteirinha do aprovado": 3D, anéis animados, trilha de níveis e conquistas, tudo com dados reais. Sem XP. */
export function PastelProfile({ p, children }: { p: ProfileData; children?: ReactNode }) {
  const g = p.gamification;
  const ready = useReady();
  const since = studyingFor(p.since, p.now);
  const qGoal = p.goals.dailyQuestions;
  const lGoal = p.goals.weeklyLessons;
  const missingQ = qGoal ? Math.max(0, qGoal - p.today.answered) : 0;
  const missingL = lGoal ? Math.max(0, lGoal - p.weekLessonsCompleted) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div data-testid="perfil-nivel">
          <Carteirinha p={p} since={since} ready={ready} />
        </div>
        <Sequencia g={g} ready={ready} />
        <TrilhaNiveis g={g} themesPassed={p.themesPassed} />
        <Conquistas g={g} ready={ready} />
      </div>

      <div className="space-y-6">
        <PastelCard noTilt className="!border-[#3A0A0A] bg-gradient-to-br from-[#141414] to-[#2A0303] p-6 text-white" testId="metas">
          <h2 className="flex items-center gap-2 font-bold">
            {qGoal || lGoal ? <Zap className="h-4 w-4 text-[#FF2A2A]" aria-hidden /> : <Target className="h-4 w-4 text-[#FF2A2A]" aria-hidden />}
            {qGoal || lGoal ? `Metas: ${qGoal ? `${qGoal} questões/dia` : ""}${qGoal && lGoal ? " e " : ""}${lGoal ? `${lGoal} aulas/semana` : ""}` : "Defina suas metas"}
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <MetaRing label="Questões hoje" value={p.today.answered} goal={qGoal} ready={ready} from="#FF4D4D" to="#E10600" />
            <MetaRing label="Aulas na semana" value={p.weekLessonsCompleted} goal={lGoal} ready={ready} from="#FF8A5C" to="#E10600" />
          </div>
          <div className="mt-5 rounded-[12px] border border-white/10 bg-white/10 p-3 text-[11px] text-white/80">
            {!qGoal && !lGoal
              ? "Defina as metas abaixo para acompanhar seu ritmo no painel."
              : missingQ === 0 && missingL === 0
                ? "Metas batidas. Excelente constância! ✨"
                : `Faltam ${[qGoal && missingQ ? `${missingQ} questões hoje` : "", lGoal && missingL ? `${missingL} aulas nesta semana` : ""].filter(Boolean).join(" e ")}. Você consegue! ✨`}
          </div>
        </PastelCard>
        {children}
      </div>
    </div>
  );
}
