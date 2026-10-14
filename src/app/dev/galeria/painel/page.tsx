import { DashboardView } from "@/app/(app)/painel/view";
import { BrandBanner } from "@/app/(app)/painel/brand-banner";
import { dashboard } from "../fixtures";

export default function Page() {
  return (
    <>
      <BrandBanner />
      <DashboardView {...dashboard} />
    </>
  );
}
