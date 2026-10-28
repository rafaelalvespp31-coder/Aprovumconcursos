import { notFound } from "next/navigation";
import { PastelShell } from "@/components/pastel/shell";
import { DemoStudyApi } from "./demo-api";
import { shellSummary } from "./fixtures";
import { Suspense } from "react";
import { MentorFloat } from "@/components/mentor/mentor-float";
import { mentorPanelDemos } from "./mentor-fixtures";

/**
 * Galeria de design com dados de EXEMPLO, para revisar as telas autenticadas sem backend.
 * Bloqueada em produção, a menos que ENABLE_DESIGN_GALLERY=1 (uso local/CI).
 */
export const dynamic = "force-dynamic";

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_DESIGN_GALLERY !== "1"
  )
    notFound();
  return (
    <DemoStudyApi>
      <PastelShell
        floating={
          <Suspense fallback={null}>
            <MentorFloat base="/dev/galeria" demos={mentorPanelDemos} />
          </Suspense>
        }
        summary={shellSummary}
        basePath="/dev/galeria"
      >
        <p className="mb-5 rounded-[14px] border border-dashed border-[#D4D4D4] bg-[#F5F5F5] px-3 py-2 text-[12px] text-[#4D4D4D]">
          Galeria de desenvolvimento: dados de exemplo para revisão visual. Nada
          aqui vem de um aluno real.
        </p>
        {children}
      </PastelShell>
    </DemoStudyApi>
  );
}
