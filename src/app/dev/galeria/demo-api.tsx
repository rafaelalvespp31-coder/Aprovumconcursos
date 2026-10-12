"use client";

/**
 * Implementação EM MEMÓRIA das ações de estudo, exclusiva da galeria de desenvolvimento.
 * Permite testar as interações reais dos componentes (responder, marcar, anotar,
 * esclarecer, concluir leitura, resultado) sem Supabase nem IA. Nada é persistido.
 */
import { useState, type ReactNode } from "react";
import { StudyApiProvider, type StudyApi } from "@/components/study-api";
import type { AnswerFeedback } from "@/server/services/study";
import type { Annotation, SearchItem } from "@/app/(app)/study-actions";
import { DEFAULT_CRITERIA, evaluateQuiz } from "@/domain/progress/state-machine";
import { LEVELS, type LevelKey } from "@/domain/progress/levels";
import { bank, reader } from "./fixtures";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/** Gabarito das fixtures: letra correta (múltipla escolha) ou valor (certo/errado). */
const KEY: Record<string, { label?: string; truth?: boolean; why: string }> = {
  [bank[0]!.id]: { label: "B", why: "Documento falso é vício de legalidade: o ato deve ser anulado, com efeitos em regra retroativos." },
  [bank[1]!.id]: { truth: false, why: "Revogar é juízo de conveniência e oportunidade, exclusivo de quem praticou o ato. O Judiciário, ao julgar, só anula por ilegalidade." },
  [bank[2]!.id]: { label: "B", why: "Só vícios sanáveis podem ser convalidados, e desde que não haja prejuízo ao interesse público nem a terceiros." },
};

function allQuestions() {
  const byId = new Map(bank.map((q) => [q.id, q]));
  for (const q of reader.questions) if (!byId.has(q.id)) byId.set(q.id, { ...bank[0]!, ...q });
  return byId;
}

function createDemoApi(): StudyApi {
    const questions = allQuestions();
    const answers = new Map<string, { correct: boolean; essential: boolean }>();
    const attempts = new Map<string, number>();
    let annotations: Annotation[] = [...reader.annotations];
    let seq = 0;
    let levelsPassed = 0;

    const feedbackFor = (questionId: string, correct: boolean): AnswerFeedback => {
      const q = questions.get(questionId)!;
      const key = KEY[questionId] ?? { label: "A", why: "Na demonstração, a alternativa A é a correta." };
      return {
        correct,
        justification: key.why,
        correctAnswerTrue: q.type === "certo_errado" ? (key.truth ?? true) : null,
        attempts: attempts.get(questionId) ?? 1,
        options: q.options.map((o) => ({
          id: o.id,
          label: o.label,
          isCorrect: o.label === key.label,
          explanation: o.label === key.label ? "Correta. " + key.why : `Incorreta: a alternativa ${o.label} não corresponde ao conceito cobrado.`,
        })),
      };
    };

    return {
      async answerQuestion(input) {
        await delay();
        const q = questions.get(input.questionId);
        if (!q) return { ok: false, error: "Questão não encontrada." };
        const key: { label?: string; truth?: boolean } = KEY[q.id] ?? { label: "A" };
        const correct =
          q.type === "certo_errado"
            ? input.answerTrue === (key.truth ?? true)
            : q.options.find((o) => o.id === input.optionId)?.label === key.label;
        attempts.set(q.id, (attempts.get(q.id) ?? q.history?.length ?? 0) + 1);
        answers.set(q.id, { correct, essential: q.essential });
        return { ok: true, data: feedbackFor(q.id, correct) };
      },
      async toggleQuestionMark(_id, marked) {
        await delay(150);
        return { ok: true, data: marked };
      },
      async reviewAnsweredQuestion(id) {
        await delay();
        const q = questions.get(id);
        if (!q || !(q.history?.length || answers.has(id))) return { ok: true, data: null };
        return { ok: true, data: feedbackFor(id, answers.get(id)?.correct ?? q.history.at(-1)?.correct ?? false) };
      },
      async createAnnotation(input) {
        await delay();
        if (input.kind === "nota" && !input.body?.trim()) return { ok: false, error: "Escreva a anotação." };
        const a: Annotation = {
          id: `00000000-0000-4000-9000-${String(++seq).padStart(12, "0")}`,
          section_id: input.sectionId ?? null,
          section_title: input.sectionTitle ?? null,
          kind: input.kind,
          body: input.body ?? "",
          resolved: false,
          updated_at: new Date().toISOString(),
        };
        annotations = [a, ...annotations];
        return { ok: true, data: a };
      },
      async updateAnnotation(id, patch) {
        await delay();
        const a = annotations.find((x) => x.id === id);
        if (!a) return { ok: false, error: "Anotação não encontrada." };
        Object.assign(a, patch, { updated_at: new Date().toISOString() });
        return { ok: true, data: { ...a } };
      },
      async deleteAnnotation(id) {
        await delay();
        annotations = annotations.filter((a) => a.id !== id);
        return { ok: true, data: true as const };
      },
      async askClarification(input) {
        await delay(600);
        return {
          ok: true,
          data: {
            id: `00000000-0000-4000-9100-${String(++seq).padStart(12, "0")}`,
            question: input.question,
            sectionId: input.sectionId,
            verificationPending: false,
            answerMarkdown: `**Resposta de demonstração da galeria.** Em produção, a IA responde a "${input.question.slice(0, 80)}" com base no conteúdo desta aula.`,
          },
        };
      },
      async startLesson() {},
      async completeReading() {
        await delay();
        return { explanation: "Leitura concluída. Agora resolva as questões para demonstrar o aprendizado." };
      },
      async evaluateQuiz(_lessonId: string, _context: "fixacao" | "revisao", levelKey?: LevelKey) {
        await delay();
        // Mesma regra do produto: um nível por vez, todas as questões do nível, ≥90% e essenciais corretas.
        const level = levelKey ?? LEVELS[Math.min(2, levelsPassed)]!.key;
        const n = LEVELS.find((l) => l.key === level)!.n;
        const ids = new Set(reader.questions.filter((q) => q.level === level).map((q) => q.id));
        const list = [...answers.entries()].filter(([id]) => ids.has(id)).map(([, a]) => a);
        const outcome = {
          answered: list.length,
          correct: list.filter((a) => a.correct).length,
          essentialAnswered: list.filter((a) => a.essential).length,
          essentialCorrect: list.filter((a) => a.essential && a.correct).length,
          total: ids.size,
        };
        const v = evaluateQuiz(outcome, DEFAULT_CRITERIA);
        if (v.passed && n === levelsPassed + 1) levelsPassed = n;
        return {
          ok: true,
          accuracy: ids.size ? outcome.correct / ids.size : 0,
          unlocksNext: v.passed && n === 3,
          explanation: v.passed
            ? `Nível ${LEVELS[n - 1]!.label.toLowerCase()} aprovado com ${Math.round(v.accuracy * 100)}%.`
            : `Ainda não é hora de avançar neste nível. ${v.reasons.join(" ")}`,
          recommendations: v.passed ? [] : ["Faça os exercícios de recuperação: eles substituem só as questões que você errou."],
          level,
          levelsPassed,
          correct: outcome.correct,
          total: ids.size,
        };
      },
      async generateRecovery() {
        await delay();
        return { ok: false, error: "Na galeria de demonstração não há IA: os exercícios de recuperação só são gerados no app." };
      },
      async search(query: string) {
        await delay(120);
        const q = query.trim().toLowerCase();
        if (q.length < 2) return { ok: true, data: [] };
        const items: SearchItem[] = [
          { type: "Estudo", name: "Polícia Penal MG — Direito Administrativo", href: "/dev/galeria/trilha" },
          { type: "Tema", name: reader.lesson.title, href: "/dev/galeria/aula" },
          { type: "Revisão", name: "Atributos do ato administrativo", href: "/dev/galeria/aula" },
        ];
        return { ok: true, data: items.filter((i) => i.name.toLowerCase().includes(q)) };
      },
    };
}

export function DemoStudyApi({ children }: { children: ReactNode }) {
  const [api] = useState(createDemoApi);
  return <StudyApiProvider api={api}>{children}</StudyApiProvider>;
}
