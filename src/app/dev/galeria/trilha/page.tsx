import { TrailMap } from "@/app/(app)/trilhas/[id]/trail-map";
import { trailModules, trailTitles } from "../fixtures";

export default function Page() {
  return (
    <div>
      <h1 className="t-h1">Polícia Penal MG — Direito Administrativo</h1>
      <h2 className="mt-6 mb-3 t-h2">Mapa da trilha</h2>
      <TrailMap
        modules={trailModules}
        titleByKey={trailTitles}
        review={false}
        progress={new Map([
          [trailModules[0]!.id, { id: trailModules[0]!.id, title: "", total: 14, studied: 12, practiced: 9, mastered: 5 }],
          [trailModules[1]!.id, { id: trailModules[1]!.id, title: "", total: 8, studied: 1, practiced: 0, mastered: 0 }],
        ])}
      />
    </div>
  );
}
