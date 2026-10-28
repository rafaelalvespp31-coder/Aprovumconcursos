import { DashboardView } from "@/app/(app)/painel/view";
import { HeroBanner } from "@/app/(app)/painel/hero-banner";
import { dashboard } from "../fixtures";

export default function Page() {
  return (
    <>
      <HeroBanner name={dashboard.name} />
      <DashboardView {...dashboard} />
    </>
  );
}
