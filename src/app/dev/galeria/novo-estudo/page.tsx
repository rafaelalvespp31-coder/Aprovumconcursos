import { NewTrailForm } from "@/app/(app)/nova-trilha/form";
import { StudyPicker } from "@/components/estudos/study-picker";
import type { ThemeCard } from "@/domain/studies/home";

const catalog = [
  { discipline: "Direito Administrativo", topics: [{ id: "00000000-0000-4000-8000-0000000000a1", title: "Administração Pública (Noções de Direito Administrativo)", summary: "Conceito e sentidos, Direta e Indireta, entidades, LIMPE, autotutela, cargos e responsabilidade civil do Estado.", minutes: 150 }] },
  { discipline: "Direito Penal", topics: [{ id: "00000000-0000-4000-8000-0000000000a2", title: "Homicídio (CP, art. 121)", summary: "Homicídio simples, privilegiado, qualificado, culposo e feminicídio.", minutes: 120 }] },
  { discipline: "Direito Processual Penal", topics: [{ id: "00000000-0000-4000-8000-0000000000a3", title: "Inquérito Policial (CPP, arts. 4º a 23)", summary: "Conceito, características, instauração, diligências, prazos e arquivamento.", minutes: 90 }] },
];

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

/** Prévia do formulário de novo estudo no modo só catálogo (como está em produção). */
export default function Page() {
  return (
    <>
      <div className="mx-auto mb-10 max-w-5xl">
        <StudyPicker themes={themes} base="/dev/galeria" />
      </div>
      <div id="formulario" className="mx-auto max-w-2xl scroll-mt-24">
        <h1 className="t-h1">Montar meu estudo</h1>
        <div className="mt-8">
          <NewTrailForm aiOn={false} catalog={catalog} />
        </div>
      </div>
    </>
  );
}
