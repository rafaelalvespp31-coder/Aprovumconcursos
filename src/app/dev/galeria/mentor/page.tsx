import { MentorView } from "@/components/mentor/mentor-view";
import { recommend } from "@/domain/mentor/engine";
import { reconcile } from "@/domain/mentor/history";
import { mentorSnapshots } from "../mentor-fixtures";

/** Galeria: a página do Mentor com dados fictícios, calculada pelo motor real (nada é gravado). */
export default async function Page({ searchParams }: { searchParams: Promise<{ dados?: string }> }) {
  const { dados = "ok" } = await searchParams;
  const snapshot = mentorSnapshots[dados] ?? mentorSnapshots.ok!;
  const result = recommend(snapshot);
  const { visible } = reconcile(result.all, [], new Date(snapshot.now));
  const demoVisible = visible.map((v, i) => ({ ...v, storedId: `11111111-1111-4111-8111-00000000000${i + 1}` }));
  return <MentorView name="Rafael" result={result} visible={demoVisible} lessons={snapshot.lessons} base="/dev/galeria" demo />;
}
