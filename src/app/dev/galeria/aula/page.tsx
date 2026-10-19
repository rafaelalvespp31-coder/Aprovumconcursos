import { LessonReader } from "@/app/(app)/aula/[id]/reader";
import { Notice } from "@/components/ui";
import { reader } from "../fixtures";
import { PdfPanel } from "@/app/(app)/trilhas/[id]/pdf-panel";

export default function Page() {
  return (
    <LessonReader
      {...reader}
      pdf={<PdfPanel trailId={reader.lesson.trailId} ready={false} unitsDone={2} unitsTotal={6} pdfs={[]} />}
      notices={
        <Notice tone="alerta" title="Contém informação não verificada">
          A seção de jurisprudência foi escrita sem conferência em fonte oficial.
        </Notice>
      }
    />
  );
}
