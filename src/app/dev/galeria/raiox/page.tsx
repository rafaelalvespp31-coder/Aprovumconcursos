import { RaioXPainel } from "@/components/aprovum-ai/raiox-painel";
import type { Comparison } from "@/domain/strategic/analysis";
import type { CutoffView } from "@/server/services/strategic";

/** Dados de EXEMPLO (só na galeria de desenvolvimento) para revisar os cards do Raio-X sem backend. */
const cut = (year: number, score: number): CutoffView => ({ id: String(year), editionYear: year, board: "VUNESP", position: null, modality: "ampla", stage: null, kind: "minima_aprovacao", score, maxScore: 100, candidates: null, criterion: null, source: null, sourcePage: null, verifiedAt: null });
const ed = (year: number, rows: Array<[string, number]>) => ({ year, board: "VUNESP", denominator: rows.reduce((n, r) => n + r[1], 0), rows: rows.map(([name, questions]) => ({ name, questions })) });
const base = { id: "x", board: null, totalQuestions: null, countingRule: null, topics: [], mode: null, annulled: 0 };
const cmp = {
  recent: { ...base, year: 2025, subjects: [] }, previous: { ...base, year: 2023, subjects: [] }, topics: [], topicDataBoth: false,
  subjects: [{ name: "Conhecimentos Específicos", previous: 36, recent: 40, delta: 4 }, { name: "Língua Portuguesa", previous: 12, recent: 10, delta: -2 }, { name: "Matemática e Raciocínio Lógico", previous: 10, recent: 10, delta: 0 }],
} as unknown as Comparison;
const mods: Array<[string, string]> = [["ampla", "Ampla concorrência"]];

export default function Page() {
  return (
    <div style={{ background: "#050507", minHeight: "100vh", padding: 12, display: "grid", gap: 28 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <RaioXPainel cutoffs={[cut(2019, 64.7), cut(2021, 71.2), cut(2023, 78), cut(2025, 82.4)]} modalities={mods} incidence={[ed(2025, [["Conhecimentos Específicos", 40], ["Língua Portuguesa", 10], ["Matemática e Raciocínio Lógico", 10]]), ed(2023, [["Conhecimentos Específicos", 36], ["Língua Portuguesa", 12], ["Matemática e Raciocínio Lógico", 10]])]} comparison={cmp} detalhesCortes={<p>detalhes</p>} detalhesComparativo={<p>detalhes</p>} />
      </div>
      <div id="vazio" style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <RaioXPainel cutoffs={[]} modalities={[]} incidence={[]} comparison={null} detalhesCortes={null} detalhesComparativo={null} />
      </div>
    </div>
  );
}
