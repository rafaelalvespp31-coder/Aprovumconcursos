import { ConcursosView } from "@/components/concursos/concursos-view";
import type { Contest } from "@/server/services/gamification";

const base = { examDateConfirmed: false, infoConfirmed: false, sourceName: "Exemplo da galeria", sourceUrl: null, infoUpdatedAt: "2026-11-01", imageUrl: null, roleName: null, vacancies: null, salary: null, examDate: null } satisfies Partial<Contest>;

/** Galeria: Concursos com dados de EXEMPLO (`?vazio=1`). */
export default async function Page({ searchParams }: { searchParams: Promise<{ vazio?: string }> }) {
  const sp = await searchParams;
  const contests: Contest[] = sp.vazio
    ? []
    : [
        { ...base, id: "c1", name: "Concurso Exemplo — Polícia Penal", institution: "Órgão de exemplo (galeria)", orgao: "Secretaria de exemplo", roleName: "Agente", status: "edital_publicado", vacancies: 5000, salary: "R$ 5.000,00", examDate: "2027-07-27", examDateConfirmed: true, uf: "MG", city: "Belo Horizonte", banca: "Banca exemplo", education: "Médio", registrationStart: "2026-12-01", registrationEnd: "2026-12-30", description: "Texto de exemplo da galeria.", detailUrl: "https://example.com", featured: true },
        { ...base, id: "c2", name: "Concurso Exemplo — Guarda Municipal", institution: "Prefeitura de exemplo", status: "previsto", uf: "SP", forecast: true },
        { ...base, id: "c3", name: "Concurso Exemplo — Inscrições abertas", institution: "Instituição de exemplo", status: "inscricoes_abertas", vacancies: 120, uf: "RJ", featured: true },
        { ...base, id: "c4", name: "Concurso Exemplo — Concluído", institution: "Instituição de exemplo", status: "encerrado", uf: "DF" },
      ];
  return <ConcursosView contests={contests} today="2026-11-04" />;
}
