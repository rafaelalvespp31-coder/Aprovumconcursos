import { QuizView } from "@/app/(app)/quiz/quiz-view";
import { buildAll, type LawNode } from "@/domain/quiz/cloze";

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

export default function Page() {
  return (
    <QuizView
      home={{ topics, xp: 130, todayHits: 7, streak: { current: 3, best: 5, studiedToday: true, last7: [false, true, false, false, true, true, true], message: "Faltam 4 dia(s) para 7 seguidos" } }}
      initialRound={{ topic: topics[0]!, items }}
      lives={3}
      dailyGoal={20}
    />
  );
}
