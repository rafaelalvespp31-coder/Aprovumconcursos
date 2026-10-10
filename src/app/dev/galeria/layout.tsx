import { notFound } from "next/navigation";
import { PastelShell } from "@/components/pastel/shell";
import { DemoStudyApi } from "./demo-api";
import { shellSummary } from "./fixtures";

/**
 * Galeria de design com dados de EXEMPLO, para revisar as telas autenticadas sem backend.
 * Bloqueada em produção, a menos que ENABLE_DESIGN_GALLERY=1 (uso local/CI).
 */
export const dynamic = "force-dynamic";

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_GALLERY !== "1") notFound();
  return (
    <DemoStudyApi>
      <PastelShell summary={shellSummary} basePath="/dev/galeria">
        <p className="mb-5 rounded-[14px] border border-dashed border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[12px] text-[#6B6A8A]">
          Galeria de desenvolvimento: dados de exemplo para revisão visual. Nada aqui vem de um aluno real.
        </p>
        {children}
      </PastelShell>
    </DemoStudyApi>
  );
}
