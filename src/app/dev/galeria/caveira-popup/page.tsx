import { notFound } from "next/navigation";
import { CaveiraPopup } from "@/components/promo/caveira-popup";
import { PremiumIndicador } from "@/components/promo/premium-indicador";

/** Galeria de desenvolvimento: popup e indicador da campanha (bloqueada em produção). */
async function noop() {
  "use server";
}

export default function Page() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_GALLERY !== "1") notFound();
  const fim = new Date(Date.now() + 6.4 * 86_400_000).toISOString();
  return (
    <div className="p-6">
      <PremiumIndicador expiresAt={fim} campaignName="O CAVEIRA FICOU MALUCO" />
      <CaveiraPopup campaignId="caveira-ficou-maluco" days={7} markSeen={noop} />
    </div>
  );
}
