import { NewTrailForm } from "@/app/(app)/nova-trilha/form";

const catalog = [
  { discipline: "Direito Administrativo", topics: [{ id: "00000000-0000-4000-8000-0000000000a1", title: "Administração Pública (Noções de Direito Administrativo)", summary: "Conceito e sentidos, Direta e Indireta, entidades, LIMPE, autotutela, cargos e responsabilidade civil do Estado.", minutes: 150 }] },
  { discipline: "Direito Penal", topics: [{ id: "00000000-0000-4000-8000-0000000000a2", title: "Homicídio (CP, art. 121)", summary: "Homicídio simples, privilegiado, qualificado, culposo e feminicídio.", minutes: 120 }] },
  { discipline: "Direito Processual Penal", topics: [{ id: "00000000-0000-4000-8000-0000000000a3", title: "Inquérito Policial (CPP, arts. 4º a 23)", summary: "Conceito, características, instauração, diligências, prazos e arquivamento.", minutes: 90 }] },
];

/** Prévia do formulário de novo estudo no modo só catálogo (como está em produção). */
export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-h1">Novo estudo</h1>
      <div className="mt-8">
        <NewTrailForm aiOn={false} catalog={catalog} />
      </div>
    </div>
  );
}
