import { ConcursosView } from "@/components/concursos/concursos-view";

/** Galeria: Concursos com dados de EXEMPLO (`?vazio=1`). */
export default async function Page({ searchParams }: { searchParams: Promise<{ vazio?: string }> }) {
  const sp = await searchParams;
  const contests = sp.vazio
    ? []
    : [
        { id: "c1", name: "Concurso Exemplo — Polícia Penal", institution: "Órgão de exemplo (galeria)", roleName: "Agente", status: "edital_publicado", vacancies: 5000, salary: "R$ 5.000,00", examDate: "2027-07-27", examDateConfirmed: true, infoConfirmed: false, sourceName: "Exemplo da galeria", sourceUrl: null, infoUpdatedAt: "2026-11-01", imageUrl: null },
        { id: "c2", name: "Concurso Exemplo — Guarda Municipal", institution: "Prefeitura de exemplo", roleName: null, status: "previsto", vacancies: null, salary: null, examDate: null, examDateConfirmed: false, infoConfirmed: false, sourceName: "Exemplo da galeria", sourceUrl: null, infoUpdatedAt: "2026-11-01", imageUrl: null },
      ];
  return <ConcursosView contests={contests} today="2026-11-04" />;
}
