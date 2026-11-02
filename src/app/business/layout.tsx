import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getPartnerStatus } from "@/server/services/partner";

export const metadata = {
  title: "APROVUM BUSINESS",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Área exclusiva do SÓCIO ADMINISTRATIVO. A sessão é validada no servidor; quem não é sócio não
 * vê nem que a rota existe. Cada indicador ainda é conferido de novo pelo banco (partner_dashboard).
 */
export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/business");
  if (!(await getPartnerStatus(user.id)).isPartner) notFound();
  return children;
}
