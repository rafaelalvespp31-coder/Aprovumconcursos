import Link from "next/link";
import { StudiesPage } from "@/components/estudos/studies-page";
import { buildStudiesHome, type StudiesRaw } from "@/domain/studies/home";

/**
 * Prévia da página de Estudos com dados de EXEMPLO (galeria). Os números passam pela
 * mesma agregação usada com os dados reais do aluno.
 */
const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();
const T = (n: number) => `00000000-0000-4000-8100-${String(n).padStart(12, "0")}`;
const L = (n: number) => `00000000-0000-4000-8200-${String(n).padStart(12, "0")}`;

// título, matéria (catálogo), aulas, aulas concluídas, questões, respondidas
const studies: Array<[string, string, number, number, number, number]> = [
  ["Ato administrativo: anulação, revogação e convalidação", "adm", 6, 3, 60, 41],
  ["Princípios fundamentais (CF, arts. 1º a 4º)", "const", 4, 2, 40, 22],
  ["Teoria do crime: fato típico", "penal", 5, 2, 50, 21],
  ["Inquérito policial (CPP, arts. 4º a 23)", "pp", 6, 1, 60, 13],
  ["Lei de Execução Penal: direitos e deveres do preso", "leg", 5, 0, 50, 4],
  ["Hardware e software", "info", 3, 1, 30, 10],
];
const catalogDisc: Record<string, [string, number]> = {
  adm: ["Direito Administrativo", 58],
  const: ["Direito Constitucional", 90],
  penal: ["Direito Penal", 72],
  pp: ["Direito Processual Penal", 36],
  leg: ["Legislação especial", 40],
  info: ["Informática", 22],
};
const lastHours = [0.1, 2, 4, 26, 50, 75];

const raw: StudiesRaw = {
  name: "Rafael",
  streak: { current: 4, last7: [false, true, false, true, true, true, true] },
  trails: studies.map(([title, disc], i) => ({ id: T(i + 1), title, status: "active", last_studied_at: ago(lastHours[i]!), updated_at: ago(i), folder_id: null, catalogTopicIds: [`cat-${disc}-0`] })),
  folders: [],
  lessons: studies.flatMap(([, , n], i) =>
    Array.from({ length: n }, (_, k) => ({ id: L((i + 1) * 100 + k), trail_id: T(i + 1), title: i === 0 && k === 3 ? "Anulação e revogação" : `Aula ${k + 1}`, objective: "", estimated_minutes: 25, sort_order: k })),
  ),
  progress: studies.flatMap(([, , n, done], i) =>
    Array.from({ length: n }, (_, k) => ({
      lesson_id: L((i + 1) * 100 + k),
      trail_id: T(i + 1),
      state: k < done ? "dominada" : k === done ? "em_andamento" : "disponivel",
      levels_passed: k < done ? 3 : k === done ? 1 : 0,
      updated_at: ago(k === done ? i + 0.1 : 200),
    })),
  ),
  questions: studies.flatMap(([, , n, , q], i) => Array.from({ length: q }, (_, k) => ({ id: `q-${i}-${k}`, lesson_id: L((i + 1) * 100 + (k % n)) }))),
  attempts: studies.flatMap(([, , , , , a], i) => Array.from({ length: a }, (_, k) => ({ question_id: `q-${i}-${k}`, created_at: ago(i * 3 + 0.05 + k * 0.001), time_spent_seconds: 55 }))),
  catalog: Object.entries(catalogDisc).flatMap(([k, [d, n]]) => Array.from({ length: n }, (_, j) => ({ id: `cat-${k}-${j}`, discipline: d, questions: 4 }))),
};

export default function Page() {
  const data = buildStudiesHome(raw);
  return (
    <StudiesPage data={data} base="/dev/galeria">
      <section id="pastas" className="scroll-mt-24 rounded-[18px] border border-[#E5E8ED] bg-white p-5">
        <h2 className="t-h2">Todos os seus estudos, por pasta</h2>
        <p className="mt-1 t-small text-tinta-suave">Na página real, aqui ficam as pastas por matéria (organizar, renomear, ordenar).</p>
        <ul className="mt-3 divide-y divide-[#E5E8ED]">
          {data.studies.map((s) => (
            <li key={s.id} className="py-2">
              <Link href="/dev/galeria/trilha" className="font-semibold hover:text-[#F01820]">
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </StudiesPage>
  );
}
