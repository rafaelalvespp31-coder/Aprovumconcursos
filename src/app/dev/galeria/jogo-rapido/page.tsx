"use client";

import { RapidoView, type RapidoApi } from "@/app/(app)/quiz/rapido/rapido-view";
import type { RapidoCheck, RapidoHome, RapidoRound } from "@/server/services/quiz-rapido";

/** Prévia do Desafio rápido com perguntas de exemplo (sem servidor). Responder funciona com gabarito local. */
const home: RapidoHome = {
  total: 15131,
  done: 42,
  wrong: 6,
  level: { level: 5, patente: "Subtenente", toNext: 8 },
  disciplines: [
    { slug: "direito_penal", label: "Direito Penal", total: 6000, done: 30, wrong: 4 },
    { slug: "direito_processual_penal", label: "Direito Processual Penal", total: 3500, done: 12, wrong: 2 },
    { slug: "lingua_portuguesa", label: "Língua Portuguesa", total: 3500, done: 0, wrong: 0 },
    { slug: "matematica", label: "Matemática", total: 1300, done: 0, wrong: 0 },
    { slug: "informatica", label: "Informática", total: 450, done: 0, wrong: 0 },
    { slug: "ctb_codigo_de_transito_brasileiro", label: "Código de Trânsito Brasileiro (CTB)", total: 500, done: 0, wrong: 0 },
  ],
};

const bank = [
  { key: "G000001", kind: "vf" as const, prompt: "O homicídio privilegiado é hediondo.", subject: "Homicídio (CP, art. 121)", discipline: "Direito Penal", difficulty: 2 as const, options: [], right: "f", text: "Falso", why: "Falso. O homicídio privilegiado não consta do rol de crimes hediondos." },
  { key: "G000002", kind: "escolha" as const, prompt: "Qual princípio exige atuação conforme a lei?", subject: "Princípios da Administração", discipline: "Direito Administrativo", difficulty: 1 as const, options: [{ id: "A", text: "Impessoalidade" }, { id: "B", text: "Legalidade" }, { id: "C", text: "Publicidade" }, { id: "D", text: "Eficiência" }], right: "B", text: "Legalidade", why: "A legalidade submete a atuação administrativa ao que a lei autoriza." },
  { key: "G000003", kind: "vf" as const, prompt: "A Administração Pública deve obedecer ao princípio da hierarquia, e não da legalidade.", subject: "Princípios", discipline: "Direito Administrativo", difficulty: 1 as const, options: [], right: "f", text: "Falso", why: "Falso. O art. 37 da CF elenca a legalidade como princípio expresso." },
];

const round: RapidoRound = {
  items: bank.map(({ right, text, why, ...i }) => i),
  scope: { discipline: null, label: "Todas as matérias", mode: "novas" },
  level: home.level,
};

const api: RapidoApi = {
  start: async () => ({ ok: true, round }),
  check: async (key, choice) => {
    const q = bank.find((b) => b.key === key)!;
    const correct = choice === q.right;
    const c: RapidoCheck = { correct, correctId: q.right, correctText: q.text, explanation: q.why, pickedNote: null, xp: correct ? 10 : 0, bonus: 0, run: correct ? 1 : 0, repeated: false, level: home.level, levelUp: null };
    return { ok: true, check: c };
  },
};

export default function Page() {
  return <RapidoView home={home} api={api} />;
}
