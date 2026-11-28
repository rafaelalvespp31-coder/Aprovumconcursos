import { CentralMissao } from "@/components/missao/central-missao";

/** Galeria: a home mobile (Central de Missão) com dados de exemplo. `?intro=1` mostra a abertura; `?vazio=1` sem números. */
export default async function Page({ searchParams }: { searchParams: Promise<{ intro?: string; vazio?: string }> }) {
  const sp = await searchParams;
  return (
    <CentralMissao
      primeiroNome="Rafael"
      email="rafael@exemplo.com"
      objetivo={null}
      intro={sp.intro === "1"}
      indicadores={sp.vazio === "1" ? null : { horas: 328, questoes: 7842, aproveitamento: 92, concluido: 78 }}
      materias={[{ slug: "portugues", nome: "Português", aulas: 24, assuntos: [], minutos: 600, progresso: 40 }]}
      concursos={[]}
    />
  );
}
