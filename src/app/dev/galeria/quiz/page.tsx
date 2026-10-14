import { QuizView } from "@/app/(app)/quiz/quiz-view";
import { buildAll, type LawNode } from "@/domain/quiz/cloze";
import { levelFor, patente, tierFor, toNextLevel } from "@/domain/quiz/levels";

/** Prévia do Modo Jogo com dispositivos de exemplo (sem servidor: verificar não funciona aqui). */
const N = (key: string, kind: string, marker: string | null, sourceText: string, parentKey: string | null = null): LawNode => ({ key, kind, marker, sourceText, parentKey, path: marker ?? key });
const nodes: LawNode[] = [
  N("N0028", "artigo", "Art. 10", "Art. 10. O inquérito deverá terminar no prazo de 10 dias, se o indiciado tiver sido preso em flagrante, ou estiver preso preventivamente, ou no prazo de 30 dias, quando estiver solto, mediante fiança ou sem ela."),
  N("N0045", "artigo", "Art. 17", "Art. 17. A autoridade policial não poderá mandar arquivar autos de inquérito."),
  N("N0014", "artigo", "Art. 6º", "Art. 6º Logo que tiver conhecimento da prática da infração penal, a autoridade policial deverá:"),
  N("N0018", "inciso", "IV", "IV - ouvir o ofendido;", "N0014"),
];
const items = buildAll(nodes, "galeria").map(({ answers, ...rest }) => ({ ...rest, blanks: answers.length }));
const topics = [
  { id: "00000000-0000-4000-8000-000000000001", title: "Inquérito Policial (CPP, arts. 4º a 23)", discipline: "Direito Processual Penal", lawCode: "CPP", total: 42, mastered: 13 },
  { id: "00000000-0000-4000-8000-000000000002", title: "Homicídio (CP, art. 121)", discipline: "Direito Penal", lawCode: "CP", total: 20, mastered: 0 },
];

const lv = (answered: number) => {
  const level = levelFor(answered);
  return { level, patente: patente(level), nextPatente: patente(level + 1), tier: tierFor(level), answered, toNext: toNextLevel(answered) };
};
const ranking = [
  { pos: 1, name: "Marina S.", xp: 940, answered: 58 },
  { pos: 2, name: "Carlos R.", xp: 715, answered: 44 },
  { pos: 3, name: "Lucas M.", xp: 300, answered: 20, isMe: true },
  { pos: 4, name: "Júlia P.", xp: 210, answered: 17 },
  { pos: 5, name: "Aluno APROVUM", xp: 90, answered: 9 },
].map((r) => ({ isMe: false, ...r, patente: patente(levelFor(r.answered)) }));

/** Exemplo de prévia: ?nivel=1 abre o popup de passagem de nível; ?ranking=1 o ranking. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const level = lv(sp.nivel ? 20 : 13);
  return (
    <QuizView
      home={{ topics, level, xp: 130, todayHits: 7, streak: { current: 3, best: 5, studiedToday: true, last7: [false, true, false, false, true, true, true], message: "Faltam 4 dia(s) para 7 seguidos" } }}
      initialRound={{ topic: topics[0]!, items, level }}
      previewLevelUp={sp.nivel ? { from: lv(19), to: level } : undefined}
      previewRanking={ranking}
      lives={3}
      dailyGoal={20}
    />
  );
}
