/** Retrato congelado do "Meu PDF de Revisão" (postit_pdfs.snapshot). */
export interface PostitPdfSnapshot {
  schema: 1;
  generatedAt: string;
  student: { name: string | null };
  lesson: { id: string; title: string; subject: string | null; trailTitle: string | null };
  items: Array<{
    n: number;
    sectionTitle: string | null;
    quote: string;
    note: string;
    createdAt: string;
  }>;
}
