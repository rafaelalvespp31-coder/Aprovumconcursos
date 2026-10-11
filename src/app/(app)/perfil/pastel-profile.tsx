"use client";

import { Award, Crown, Flame, Lock, Trophy, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { PastelCard } from "@/components/pastel/card";
import type { Gamification } from "@/domain/progress/gamification";

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

/** Perfil "Leveza Pastel": nível por temas vencidos, sequência e conquistas reais. Sem XP. */
export function PastelProfile({ p, children }: { p: ProfileData; children?: ReactNode }) {
  const g = p.gamification;
  const since = studyingFor(p.since, p.now);
  const unlocked = g.achievements.filter((a) => a.unlocked);
  const locked = g.achievements.filter((a) => !a.unlocked).sort((a, b) => b.progress - a.progress);
  const qGoal = p.goals.dailyQuestions;
  const lGoal = p.goals.weeklyLessons;
  const qPct = qGoal ? Math.min(100, Math.round((p.today.answered / qGoal) * 100)) : 0;
  const lPct = lGoal ? Math.min(100, Math.round((p.weekLessonsCompleted / lGoal) * 100)) : 0;
  const missingQ = qGoal ? Math.max(0, qGoal - p.today.answered) : 0;
  const missingL = lGoal ? Math.max(0, lGoal - p.weekLessonsCompleted) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <PastelCard className="overflow-hidden p-0" testId="perfil-nivel">
          <div className="relative h-[120px] overflow-hidden bg-gradient-to-br from-[#FF1E1E] via-[#E10600] to-[#B30000]">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} aria-hidden />
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/20 blur-[20px]" aria-hidden />
            <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] border-4 border-[#262626] bg-[#161616] text-[32px] shadow-[0_8px_24px_rgba(0,0,0,0.15)] sm:h-[84px] sm:w-[84px] sm:text-[36px]" aria-hidden>
                🧑‍🎓
              </div>
              <div className="min-w-0 pb-2 text-white">
                <div className="truncate font-[Space_Grotesk] text-[20px] font-[800] leading-none">{p.name ?? "Seu perfil"}</div>
                <div className="mt-1 truncate text-[12px] text-white/85">
                  {[p.email, since].filter(Boolean).join(" • ")}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-6 sm:gap-4">
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#1A1A1A]" aria-hidden>
                <Crown className="h-6 w-6 text-[#FF1E1E]" />
              </div>
              <div className="text-[18px] font-[800] sm:text-[20px]" data-testid="nivel">Nível {g.level.level}</div>
              <div className="text-[11px] text-[#A3A3A3]">{p.themesPassed} {p.themesPassed === 1 ? "tema vencido" : "temas vencidos"}</div>
            </div>
            <div className="border-x border-[#222222] text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#2A0B0B]" aria-hidden>
                <Flame className="h-6 w-6 text-[#E10600]" />
              </div>
              <div className="text-[18px] font-[800] sm:text-[20px]">{g.streak.current} {g.streak.current === 1 ? "dia" : "dias"}</div>
              <div className="text-[11px] text-[#A3A3A3]">Sequência atual</div>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#1C1C1C]" aria-hidden>
                <Trophy className="h-6 w-6 text-[#FFFFFF]" />
              </div>
              <div className="text-[18px] font-[800] sm:text-[20px]" data-testid="conquistas-total">
                {g.unlockedCount}
                <span className="text-[13px] font-semibold text-[#A3A3A3]">/{g.achievements.length}</span>
              </div>
              <div className="text-[11px] text-[#A3A3A3]">Conquistas</div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="h-2.5 overflow-hidden rounded-full bg-[#1A1A1A]" role="progressbar" aria-label={`Progresso para o nível ${g.level.level + 1}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(g.level.progress * 100)}>
              <div className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#FF1E1E] to-[#B30000]" style={{ width: `${Math.max(g.level.progress * 100, 3)}%` }}>
                <div className="absolute inset-0 animate-[shimmer_2s_linear_infinite] bg-white/30" />
              </div>
            </div>
            <div className="mt-2 flex justify-between gap-3 text-[11px]">
              <span className="text-[#B3B3B3]">Progresso para Nível {g.level.level + 1}</span>
              <span className="text-right font-bold">
                {Math.round(g.level.progress * 100)}% • falta{g.level.remaining > 1 ? "m" : ""} {g.level.remaining} {g.level.remaining > 1 ? "temas" : "tema"}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-[#A3A3A3]">Você sobe um nível a cada 3 temas vencidos: todas as questões do tema, 75% de acerto e as essenciais corretas.</p>
          </div>
        </PastelCard>

        <PastelCard noTilt className="p-6" testId="conquistas">
          <h2 className="mb-4 flex items-center gap-2 font-[Space_Grotesk] font-bold">
            <Award className="h-4 w-4" aria-hidden /> Conquistas
          </h2>
          {unlocked.length === 0 && <p className="mb-3 text-[12px] text-[#A3A3A3]">Nenhuma conquista ainda. Elas se desbloqueiam sozinhas, conforme as regras abaixo.</p>}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...unlocked, ...locked].map((s) => (
              <li
                key={s.id}
                data-unlocked={s.unlocked}
                className={`flex gap-3 rounded-[16px] border p-4 transition-all ${s.unlocked ? "border-[#2A2A2A] bg-[#161616] hover:bg-[#1C1C1C] hover:shadow-[0_8px_24px_rgba(225,6,0,0.08)]" : "border-dashed border-[#333333] bg-white/[0.02]"}`}
              >
                <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#2A2A2A] bg-[#161616] text-[18px] shadow-sm ${s.unlocked ? "" : "grayscale opacity-60"}`} aria-hidden>
                  {s.icon}
                  {!s.unlocked && <Lock className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#161616] p-0.5 text-[#A3A3A3]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">
                    {s.title}
                    <span className="sr-only">{s.unlocked ? " (conquistada)" : " (bloqueada)"}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#B3B3B3]">{s.rule}</div>
                  {!s.unlocked && (
                    <>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1A1A1A]">
                        <div className="h-full rounded-full" style={{ width: `${Math.round(s.progress * 100)}%`, background: s.color }} />
                      </div>
                      <div className="mt-1 text-[10.5px] text-[#A3A3A3]">{s.status}</div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </PastelCard>
      </div>

      <div className="space-y-6">
        <PastelCard className="!border-[#3A0A0A] bg-gradient-to-br from-[#141414] to-[#2A0303] p-6 text-white" testId="metas">
          <h2 className="flex items-center gap-2 font-bold">
            <Zap className="h-4 w-4 text-[#FF2A2A]" aria-hidden />
            {qGoal || lGoal ? `Metas: ${qGoal ? `${qGoal} questões/dia` : ""}${qGoal && lGoal ? " e " : ""}${lGoal ? `${lGoal} aulas/semana` : ""}` : "Defina suas metas"}
          </h2>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-[12px]">
                <span className="text-white/75">Questões hoje</span>
                <span className="font-bold">{qGoal ? `${p.today.answered}/${qGoal} • ${qPct}%` : `${p.today.answered} • sem meta`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF1E1E] to-[#B30000]" style={{ width: `${qPct}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-[12px]">
                <span className="text-white/75">Aulas na semana</span>
                <span className="font-bold">{lGoal ? `${p.weekLessonsCompleted}/${lGoal} • ${lPct}%` : `${p.weekLessonsCompleted} • sem meta`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#E10600] to-[#FF4D4D]" style={{ width: `${lPct}%` }} />
              </div>
            </div>
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
