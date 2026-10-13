import { NewTrailForm } from "@/app/(app)/nova-trilha/form";

/** Prévia do formulário de novo estudo no modo só catálogo (como está em produção). */
export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-h1">Novo estudo</h1>
      <div className="mt-8">
        <NewTrailForm aiOn={false} available={["Homicídio (CP, art. 121)", "Inquérito Policial (CPP, arts. 4º a 23)"]} />
      </div>
    </div>
  );
}
