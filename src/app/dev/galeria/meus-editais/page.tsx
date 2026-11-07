import { MeusEditaisView } from "@/components/meus-editais/meus-editais-view";
import type { EditaisOverview, EditalCard } from "@/server/services/edital-overview";

/** Dados de EXEMPLO (só na galeria de desenvolvimento) para revisar Meus Editais sem backend. */
const base = { orgLogo: null, board: null, year: null, fileName: "edital.pdf", fileSize: 1, pageCount: 40, step: 5, error: null, createdAt: "2026-10-01T12:00:00Z" } as const;
const stats = (d: number, t: number, c: number) => ({ disciplines: d, topics: t, completa: c, parcial: 0 });

const cards: EditalCard[] = [
  { ...base, id: "a1", title: "Polícia Penal MG 2026", contestName: "Polícia Penal do Estado de Minas Gerais", roleName: "Agente de Segurança Penitenciário", status: "concluido", stats: stats(4, 48, 12),
    progress: { topics: 48, topicsDone: 6, pct: 12, lessons: 12, lessonsDone: 3, questions: 10, started: true, lastActivity: "2026-11-05T12:00:00Z", nextLessonId: "x" }, raioX: { available: true, analyzedAt: "2026-11-01T12:00:00Z" }, studyFolderId: null },
  { ...base, id: "a2", title: "PRF 2026", contestName: "Polícia Rodoviária Federal", roleName: "Policial Rodoviário Federal", status: "concluido", stats: stats(5, 62, 20),
    progress: { topics: 62, topicsDone: 0, pct: 0, lessons: 20, lessonsDone: 0, questions: 0, started: false, lastActivity: null, nextLessonId: null }, raioX: { available: false, analyzedAt: null }, studyFolderId: null },
  { ...base, id: "a3", title: "PC SP Investigador", contestName: "Polícia Civil do Estado de São Paulo", roleName: null, status: "lendo", stats: stats(0, 0, 0), progress: null, raioX: { available: false, analyzedAt: null }, studyFolderId: null },
  { ...base, id: "a4", title: "Guarda Municipal BH", contestName: "Guarda Municipal de Belo Horizonte", roleName: "Guarda", status: "concluido", stats: stats(3, 30, 9),
    progress: { topics: 30, topicsDone: 30, pct: 100, lessons: 9, lessonsDone: 9, questions: 44, started: true, lastActivity: "2026-11-03T12:00:00Z", nextLessonId: null }, raioX: { available: true, analyzedAt: "2026-10-20T12:00:00Z" }, studyFolderId: null },
];

const data: EditaisOverview = { cards, totals: { analyzed: 3, avgPct: 37, evolution7d: 4, questions: 54 }, progressError: false };

export default function Page() {
  return <MeusEditaisView data={data} />;
}
