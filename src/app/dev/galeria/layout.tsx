import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DemoStudyApi } from "./demo-api";

/**
 * Galeria de design com dados de EXEMPLO, para revisar as telas autenticadas sem backend.
 * Bloqueada em produção, a menos que ENABLE_DESIGN_GALLERY=1 (uso local/CI).
 */
export const dynamic = "force-dynamic";

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_GALLERY !== "1") notFound();
  return (
    <AppShell email="exemplo@nivelaprovado.dev">
      <p className="mb-5 rounded-md border border-dashed border-alerta/50 bg-alerta-fundo px-3 py-2 t-tiny text-tinta-suave">
        Galeria de desenvolvimento: dados de exemplo para revisão visual. Nada aqui vem de um aluno real.
      </p>
      <DemoStudyApi>{children}</DemoStudyApi>
    </AppShell>
  );
}
