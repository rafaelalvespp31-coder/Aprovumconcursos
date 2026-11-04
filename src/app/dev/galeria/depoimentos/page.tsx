import { DepoimentosView } from "@/components/depoimentos/depoimentos-view";
import { DEFAULT_FOUNDERS, DEFAULT_QUOTE, type Testimonial } from "@/domain/testimonials";

const base = { thumbUrl: null, photoUrl: null, captionsUrl: null, description: "Texto de exemplo da galeria.", publishedAt: "2026-11-01", featured: false } satisfies Partial<Testimonial>;

/** Galeria: Depoimentos com dados de EXEMPLO (`?vazio=1` = sem vídeos). */
export default async function Page({ searchParams }: { searchParams: Promise<{ vazio?: string }> }) {
  const sp = await searchParams;
  const items: Testimonial[] = sp.vazio
    ? []
    : [
        { ...base, id: "d1", name: "Aluno exemplo 1", headline: "Frase de exemplo da galeria (aprovado).", videoUrl: "https://example.com/exemplo1.mp4", category: "aprovados", cargo: "Cargo exemplo", estado: "MG", approved: true, durationSeconds: 204 },
        { ...base, id: "d2", name: "Aluno exemplo 2", headline: "Frase de exemplo da galeria (superação).", videoUrl: "https://example.com/exemplo2.mp4", category: "superacao", cargo: "Cargo exemplo", estado: "SP", approved: false, durationSeconds: 252 },
        { ...base, id: "d3", name: "Aluno exemplo 3", headline: "Frase de exemplo da galeria (transformação).", videoUrl: "https://example.com/exemplo3.mp4", category: "transformacao", estado: "RJ", approved: true, durationSeconds: 310 },
        { ...base, id: "d4", name: "Aluno exemplo 4", headline: "Frase de exemplo da galeria (comunidade).", videoUrl: "https://example.com/exemplo4.mp4", category: "comunidade", approved: false, durationSeconds: 225 },
        { ...base, id: "d5", name: "Aluno exemplo 5", headline: "Quinto vídeo (aprovado).", videoUrl: "https://example.com/exemplo5.mp4", category: "aprovados", approved: true },
      ];
  const founders = DEFAULT_FOUNDERS.map((f, i) => (i === 0 ? { ...f, age: 30, city: "Cidade/UF exemplo", bio: "Biografia de exemplo da galeria.", story: "História de exemplo.", trajectory: "Trajetória de exemplo." } : f));
  return <DepoimentosView items={items} stories={{ founders, stats: { students: 1200, approved: 340, satisfaction: "4.9/5", studentsReal: 3, approvedReal: 2 }, quote: DEFAULT_QUOTE }} />;
}
