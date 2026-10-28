import { describe, expect, it } from "vitest";
import { recommend, type MentorLesson, type MentorSnapshot } from "./engine";
import { answer, detectIntent } from "./chat";

const lesson = (over: Partial<MentorLesson> = {}): MentorLesson => ({
  id: "l1", trailId: "t1", trailTitle: "Patrimônio", subject: "Direito Penal", title: "Extorsão", order: 1, state: "em_andamento", readingDone: false, levelsPassed: 0,
  updatedAt: "2026-10-27T12:00:00.000Z", prerequisiteIds: [], questionsByLevel: { facil: 12, medio: 12, dificil: 12 }, ...over,
});
const ctxOf = (s: Partial<MentorSnapshot>) => {
  const snap: MentorSnapshot = { now: "2026-10-28T12:00:00.000Z", lessons: [], performance: [], reviews: [], notebooks: [], ...s };
  const result = recommend(snap);
  return { result, visible: result.top, lessons: snap.lessons };
};

describe("chat do Mentor (sem IA)", () => {
  it("reconhece as perguntas previstas", () => {
    expect(detectIntent("O que devo estudar hoje?")).toBe("hoje");
    expect(detectIntent("O que está pendente?")).toBe("pendente");
    expect(detectIntent("Qual matéria devo terminar?")).toBe("terminar_materia");
    expect(detectIntent("Em quais assuntos estou errando mais?")).toBe("erros");
    expect(detectIntent("Onde meu desempenho precisa melhorar?")).toBe("melhorar");
    expect(detectIntent("Quais revisões estão vencidas?")).toBe("revisoes");
    expect(detectIntent("O que faço depois de concluir esta aula?")).toBe("depois_aula");
    expect(detectIntent("Por que você está recomendando essa atividade?")).toBe("porque");
    expect(detectIntent("Quais tarefas já concluí?")).toBe("concluidas");
    expect(detectIntent("qual a capital da França")).toBe("fallback");
  });

  it("responde com dados reais e ações clicáveis", () => {
    const ctx = ctxOf({ lessons: [lesson(), lesson({ id: "l2", order: 2, title: "Extorsão mediante sequestro", state: "nao_iniciada" })] });
    const hoje = answer("o que estudar hoje", ctx);
    expect(hoje.items[0]).toMatchObject({ href: "/aula/l1", actionLabel: "Continuar aula" });
    const depois = answer("O que faço depois de concluir esta aula?", ctx);
    expect(depois.items.map((i) => i.href)).toEqual(["/aula/l1", "/aula/l2"]);
    const pq = answer("por que?", ctx);
    expect(pq.items[0]!.detail).toContain("Motivo:");
  });

  it("não inventa dados quando não há informação suficiente", () => {
    const vazio = ctxOf({});
    for (const q of ["o que estudar hoje", "onde estou errando mais", "quais tarefas já concluí", "o que está pendente"]) {
      const r = answer(q, vazio);
      expect(r.items).toEqual([]);
      expect(r.text.join(" ")).toMatch(/não tenho dados|não concluiu|Não encontrei/);
    }
    // Poucas respostas: não diz onde erra mais.
    const pouco = ctxOf({ performance: [{ key: "k", label: "Furto", subject: "Direito Penal", href: "/questoes", attempts: [{ correct: false, questionValid: true }] }] });
    expect(answer("onde estou errando mais", pouco).text[0]).toContain("Ainda não dá para dizer");
    expect(answer("asdfgh", vazio).intent).toBe("fallback");
  });
});
