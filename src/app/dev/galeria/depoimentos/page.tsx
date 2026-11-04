import { DepoimentosView } from "@/components/depoimentos/depoimentos-view";

/** Galeria: Depoimentos com dados de EXEMPLO (`?vazio=1` = sem vídeos). */
export default async function Page({ searchParams }: { searchParams: Promise<{ vazio?: string }> }) {
  const sp = await searchParams;
  const items = sp.vazio ? [] : [{ id: "d1", name: "Aluno de exemplo", headline: "Da primeira aula à aprovação em 8 meses.", videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ" }];
  return <DepoimentosView items={items} />;
}
