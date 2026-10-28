import { MentorView } from "@/components/mentor/mentor-view";
import { mentorDemoData } from "../mentor-fixtures";

/** Galeria: a página do Mentor com dados fictícios, calculada pelo motor real (nada é gravado). */
export default async function Page({ searchParams }: { searchParams: Promise<{ dados?: string }> }) {
  const { dados = "ok" } = await searchParams;
  const d = mentorDemoData(dados);
  return <MentorView name={d.name} result={d.result} visible={d.visible} lessons={d.lessons} base="/dev/galeria" demo />;
}
