import { StartPicker } from "@/app/(app)/nova-trilha/start-picker";
import { MapStart } from "@/app/(app)/nova-trilha/map-start";
import type { ThemeCard } from "@/domain/studies/home";

const st = (trailId: string, answered: number, totalQuestions: number, lessonsDone: number, lessonsTotal: number): ThemeCard["study"] => ({
  trailId,
  answered,
  totalQuestions,
  lessonsDone,
  lessonsTotal,
  lastStudiedAt: new Date(Date.now() - 3600_000).toISOString(),
  pct: Math.round((answered / totalQuestions) * 100),
  done: lessonsDone === lessonsTotal,
});
const G = (n: number) => `00000000-0000-4000-8100-${String(n).padStart(12, "0")}`;
// Temas de exemplo, com e sem estudo do aluno.
const themes: ThemeCard[] = [
  { id: "t-adm-1", title: "Ato administrativo: anulação, revogação e convalidação", discipline: "Direito Administrativo", questions: 60, minutes: 150, study: st(G(1), 41, 60, 3, 6) },
  { id: "t-adm-2", title: "Agentes públicos", discipline: "Direito Administrativo", questions: 36, minutes: 55, study: null },
  { id: "t-pen-1", title: "Homicídio (CP, art. 121)", discipline: "Direito Penal", questions: 48, minutes: 120, study: null },
  { id: "t-pen-2", title: "Roubo (CP, art. 157)", discipline: "Direito Penal", questions: 72, minutes: 300, study: null },
  { id: "t-pen-3", title: "Teoria do crime: fato típico", discipline: "Direito Penal", questions: 50, minutes: 90, study: st(G(3), 30, 30, 5, 5) },
  { id: "t-pp-1", title: "Inquérito Policial (CPP, arts. 4º a 23)", discipline: "Direito Processual Penal", questions: 42, minutes: 90, study: st(G(4), 13, 42, 1, 6) },
];

// "?topicos=1": aulas organizadas em tópicos do edital (4. Ilicitude › 4.1, 4.2).
const ilicitude = (sub: string) => ({ title: "Ilicitude", code: "4", sub });
const grouped: ThemeCard[] = [
  { id: "t-pen-41", title: "Causas de exclusão da ilicitude", discipline: "Direito Penal", questions: 36, minutes: 80, study: st(G(5), 36, 36, 1, 1), group: ilicitude("4.1") },
  { id: "t-pen-42", title: "Excesso punível", discipline: "Direito Penal", questions: 30, minutes: 60, study: st(G(6), 12, 30, 0, 1), group: ilicitude("4.2") },
];

/** Prévia do novo estudo: mapa do conhecimento; "?modo=lista" mostra a escolha em lista. */
export default async function Page({ searchParams }: { searchParams: Promise<{ modo?: string; vazio?: string; topicos?: string }> }) {
  const sp = await searchParams;
  if (sp.modo !== "lista") return <MapStart themes={sp.vazio ? [] : sp.topicos ? [...themes, ...grouped] : themes} name="Rafael" base="/dev/galeria" />;
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="sr-only">Novo estudo</h1>
      <StartPicker themes={themes} base="/dev/galeria" />
    </div>
  );
}
