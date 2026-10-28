import { describe, expect, it } from "vitest";
import { recommend, type MentorLesson, type MentorSnapshot } from "./engine";
import { reconcile, type StoredRecommendation } from "./history";

const NOW = new Date("2026-10-28T12:00:00.000Z");
const lesson = (over: Partial<MentorLesson> = {}): MentorLesson => ({
  id: "l1", trailId: "t1", trailTitle: "Patrimônio", subject: "Direito Penal", title: "Extorsão", order: 1, state: "em_andamento", readingDone: false, levelsPassed: 0,
  updatedAt: "2026-10-27T12:00:00.000Z", prerequisiteIds: [], questionsByLevel: { facil: 12, medio: 12, dificil: 12 }, ...over,
});
const snap = (lessons: MentorLesson[]): MentorSnapshot => ({ now: NOW.toISOString(), lessons, performance: [], reviews: [], notebooks: [] });
const row = (over: Partial<StoredRecommendation>): StoredRecommendation => ({ id: "s1", key: "aula_pendente:l1", contextHash: "r0-l0", status: "nova", createdAt: "2026-10-27T00:00:00.000Z", dismissedAt: null, ...over });

describe("histórico e deduplicação do Mentor", () => {
  it("12. recarregar a tela não duplica: mesma chave e contexto já gravados não são gravados de novo", () => {
    const { all } = recommend(snap([lesson()]));
    const first = reconcile(all, [], NOW);
    expect(first.toInsert.map((r) => r.key)).toEqual(["aula_pendente:l1"]);
    const second = reconcile(all, [row({})], NOW);
    expect(second.toInsert).toEqual([]);
    expect(second.visible[0]).toMatchObject({ storedId: "s1", status: "nova" });
    // linhas repetidas no histórico também não confundem
    expect(reconcile(all, [row({}), row({ id: "s0", createdAt: "2026-10-26T00:00:00.000Z" })], NOW).toInsert).toEqual([]);
  });

  it("13. dispensada some no mesmo contexto por 7 dias; depois volta se ainda for pendência", () => {
    const { all } = recommend(snap([lesson()]));
    const recent = reconcile(all, [row({ status: "dispensada", dismissedAt: "2026-10-27T12:00:00.000Z" })], NOW);
    expect(recent.visible).toEqual([]);
    expect(recent.toInsert).toEqual([]);
    const old = reconcile(all, [row({ status: "dispensada", dismissedAt: "2026-10-10T12:00:00.000Z" })], NOW);
    expect(old.visible).toHaveLength(1);
    expect(old.toReactivate).toEqual(["s1"]);
  });

  it("14. conclusão só quando os dados confirmam: a pendência resolvida vira concluída", () => {
    // Aula ainda pendente: a linha continua ativa (um clique não conclui nada).
    const pending = reconcile(recommend(snap([lesson()])).all, [row({ status: "visualizada" })], NOW);
    expect(pending.toResolve).toEqual([]);
    // Leitura concluída e 3 níveis aprovados: o motor não gera mais → concluída.
    const done = reconcile(recommend(snap([lesson({ readingDone: true, levelsPassed: 3 })])).all, [row({ status: "visualizada" })], NOW);
    expect(done.toResolve).toEqual(["s1"]);
  });

  it("contexto mudou de verdade (leu a teoria): nova linha e a anterior é resolvida, histórico preservado", () => {
    const now = recommend(snap([lesson({ readingDone: true, state: "aula_concluida" })])).all;
    const r = reconcile(now, [row({})], NOW);
    expect(r.toInsert.map((x) => x.key)).toEqual(["questoes_pendentes:l1"]);
    expect(r.toResolve).toEqual(["s1"]);
  });
});
