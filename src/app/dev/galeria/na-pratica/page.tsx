import { PracticeCard } from "@/components/practice-card";
import { extractPractice } from "@/domain/content/practice";
import { SAMPLE_BLOCKS } from "./samples";

/** Prévia dos cards "Na prática" com tirinha e esquema. */
export default function Page() {
  return (
    <div className="mx-auto max-w-[820px]">
      <h1 className="t-h1">Na prática — exemplos visuais</h1>
      {SAMPLE_BLOCKS.map((b, i) => (
        <PracticeCard key={i} cases={extractPractice(b).cases} />
      ))}
    </div>
  );
}
