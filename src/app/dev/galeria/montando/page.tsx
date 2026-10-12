import { BuildingOverlay } from "@/app/(app)/nova-trilha/building-overlay";

/** Prévia da tela de preparação da aula (estudo do catálogo). */
export default function Page() {
  return (
    <div className="min-h-[60vh]">
      <h1 className="t-h1">Novo estudo</h1>
      <BuildingOverlay topic="Homicídio (CP, art. 121)" durationMs={60000} />
    </div>
  );
}
