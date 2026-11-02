import { notFound } from "next/navigation";
import { periodDays } from "@/domain/partner/series";
import { visibleSections } from "@/domain/partner/sections";
import { BusinessNotice, BusinessShell } from "@/components/business/shell";
import { BusinessDashboard } from "@/components/business/dashboard";
import { fixture, PRESETS } from "./fixtures";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "APROVUM BUSINESS (prévia)",
  robots: { index: false, follow: false },
};

/** Galeria do APROVUM BUSINESS com dados de EXEMPLO (?perfil=todos|geral|nenhum|desativado). */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; perfil?: string }>;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_DESIGN_GALLERY !== "1"
  )
    notFound();
  const sp = await searchParams;
  const period = periodDays(sp.periodo);
  const who = { name: "Sócio de exemplo", email: "socio@exemplo.com" };
  if (sp.perfil === "desativado")
    return (
      <BusinessShell sections={new Set()} who={who}>
        <BusinessNotice title="Acesso desativado" testId="business-desativado">
          O administrador do APROVUM desativou este acesso. Fale com ele para
          reativar.
        </BusinessNotice>
      </BusinessShell>
    );
  const data = fixture(period, PRESETS[sp.perfil ?? "todos"] ?? PRESETS.todos!);
  const base = sp.perfil
    ? `/dev/business?perfil=${encodeURIComponent(sp.perfil)}`
    : "/dev/business";
  return (
    <BusinessShell sections={visibleSections(data)} who={who} studentHref="/dev/galeria">
      <p className="mb-4 rounded-lg border border-dashed border-white/20 px-3 py-2 text-[12px]">
        Galeria de desenvolvimento: dados de exemplo. Nada aqui é real.
      </p>
      <BusinessDashboard data={data} period={period} base={base} />
    </BusinessShell>
  );
}
