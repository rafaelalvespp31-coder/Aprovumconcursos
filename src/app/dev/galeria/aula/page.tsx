import { LessonReader } from "@/app/(app)/aula/[id]/reader";
import { Notice } from "@/components/ui";
import { reader } from "../fixtures";

export default function Page() {
  return (
    <LessonReader
      {...reader}
      notices={
        <Notice tone="alerta" title="Contém informação não verificada">
          A seção de jurisprudência foi escrita sem conferência em fonte oficial.
        </Notice>
      }
    />
  );
}
