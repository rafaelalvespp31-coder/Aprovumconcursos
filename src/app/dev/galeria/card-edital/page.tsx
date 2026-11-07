import { CardEdital } from "@/components/aprovum-ai/card-edital";
import type { PreparationTree } from "@/server/services/edital-view";

/** Dados de EXEMPLO (só na galeria de desenvolvimento) para revisar o card do edital sem backend. */
const tree = {
  prep: { id: "demo", title: "Prefeitura Municipal de Paulínia", contestName: "Prefeitura Municipal de Paulínia", roleName: "Guarda Civil Municipal", board: "VUNESP", year: 2026, orgLogo: null, createdAt: "2026-05-18T12:00:00Z", stats: {} },
  disciplines: [],
  totals: { topics: 48, done: 12, pct: 25, lessonsAvailable: 12, lessonsDone: 3, pending: 5, questionsAnswered: 10 },
} as unknown as PreparationTree;

async function save() { "use server"; }
async function start(): Promise<{ error?: string }> { "use server"; return {}; }

export default function Page() {
  return (
    <div style={{ background: "#050507", minHeight: "100vh", padding: 12 }}>
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <CardEdital tree={tree} save={save} start={start} />
      </div>
    </div>
  );
}
