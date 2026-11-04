"use client";

import { HomeOperacao } from "@/components/home/home-operacao";
import { defaultAvatar } from "@/domain/avatar/catalog";
import type { HomeData } from "@/server/services/gamification";
import { demoAvatarItems } from "../avatar-fixtures";

/** Galeria: Home com dados de EXEMPLO (só aqui; nada é gravado). `vazio` = aluno novo, sem histórico. */
export function DemoHome({ mannequin, gender, level, empty, levelUp, canCustomize = true }: { canCustomize?: boolean; mannequin: boolean; gender: "m" | "f"; level: number; empty: boolean; levelUp: boolean }) {
  const achievements = [
    ["primeiro_combate", "Primeiro Combate", "caveira", "Responder 1 questão válida"],
    ["atirador_elite", "Atirador de Elite", "estrela", "≥ 90% em um simulado"],
    ["incansavel", "Incansável", "louro30", "30 dias consecutivos"],
    ["especialista", "Especialista", "estrela_prata", "Concluir uma matéria"],
    ["caveira_elite", "Caveira de Elite", "caveira_coroa", "Chegar ao nível 10"],
    ["disciplina_7", "Disciplina 7 dias", "chama", "7 dias consecutivos"],
    ["disciplina_15", "Disciplina 15 dias", "chama", "15 dias consecutivos"],
    ["disciplina_30", "Disciplina 30 dias", "chama", "30 dias consecutivos"],
    ["disciplina_60", "Disciplina 60 dias", "chama", "60 dias consecutivos"],
  ].map(([id, name, icon, criterion], i) => ({ id: id!, name: name!, icon: icon!, criterion: criterion!, description: criterion!, unlockedAt: !empty && [0, 1, 2, 3, 5].includes(i) ? "2026-10-20T12:00:00Z" : null }));
  const data: HomeData = {
    game: {
      today: "2026-11-03",
      xp: empty ? 0 : 1000,
      level: empty ? 1 : level,
      levelFloor: 0,
      levelNext: 1100,
      missions: {
        day: "2026-11-03",
        completed: empty ? 0 : 2,
        estudar: { progress: empty ? 0 : 1, target: 1, done: !empty },
        combater: { progress: empty ? 0 : 20, target: 20, done: !empty },
        revisar: { progress: empty ? 0 : 6, target: 15, done: false },
      },
      missionXp: { estudar: 100, combater: 100, revisar: 100, bonus: 300 },
      xpToday: empty ? 0 : 200,
      streak: { current: empty ? 0 : 12, best: empty ? 0 : 45, lastDay: empty ? null : "2026-11-03", week: empty ? [] : ["2026-11-02", "2026-11-03"], milestones: [7, 15, 30, 60] },
      ranking: empty ? { position: null, total: 0, previous: null } : { position: 3, total: 120, previous: 5 },
      achievements,
      levelUps: levelUp ? [2] : [],
    },
    performance: empty
      ? { answered: 0, correct: 0, wrong: 0, seconds: 0, week: { answered: 0, correct: 0, prevAnswered: 0, prevCorrect: 0 }, subjects: [] }
      : { answered: 1250, correct: 1025, wrong: 225, seconds: 48 * 3600, week: { answered: 140, correct: 120, prevAnswered: 120, prevCorrect: 74 }, subjects: [{ name: "Direito Penal", answered: 400, correct: 360 }, { name: "Processo Penal", answered: 120, correct: 66 }] },
    continueLesson: empty ? null : { lessonId: "00000000-0000-4000-8000-000000000001", lesson: "Princípios do Direito Penal", subject: "Direito Penal", module: "Módulo 1", pct: 68, at: "2026-11-02T22:00:00Z" },
    contests: empty
      ? []
      : [{ id: "c1", name: "Concurso Exemplo", institution: "Órgão de exemplo (galeria)", roleName: "Agente", status: "edital_publicado", vacancies: 5000, salary: null, examDate: "2027-07-27", examDateConfirmed: true, infoConfirmed: false, sourceName: "Exemplo da galeria", sourceUrl: null, infoUpdatedAt: "2026-11-01", imageUrl: null }],
    insights: empty ? [] : [{ title: "Reforce Processo Penal: Inquérito Policial.", reason: "Você acertou 55% das 120 questões desse assunto.", href: "/questoes", actionLabel: "Resolver 15 questões" }],
    top: empty ? [] : [{ pos: 1, name: "Ana P.", level: 6, xp: 7200, motto: "Disciplina vence talento." }, { pos: 2, name: "João S.", level: 5, xp: 5600 }, { pos: 3, name: "Rafael A.", level: 1, xp: 1000 }],
  };
  return (
    <HomeOperacao
      name="Rafael Alves"
      data={data}
      avatar={{ config: defaultAvatar(gender, demoAvatarItems), items: demoAvatarItems }}
      mannequin={mannequin}
      request={null}
      canCustomize={canCustomize}
      skins={canCustomize ? [{ id: "d1", thumb: "/avatar/ui/palco-fundo.webp", active: true }, { id: "d2", thumb: "/mentor/caveira.webp", active: false }] : []}
      selectSkin={async () => ({ ok: true })}
      ackLevels={async () => {}}
      requestAction={async (fd) => {
        const f = fd.get("foto");
        if (!(f instanceof File) || !f.size) return { ok: false, error: "Escolha uma foto de corpo inteiro." };
        return { ok: true, request: { status: "enviada", note: null, createdAt: new Date().toISOString() } };
      }}
    />
  );
}
