import { DashboardView } from "@/app/(app)/painel/view";
import { HeroBanner } from "@/app/(app)/painel/hero-banner";
import { dashboard } from "../fixtures";
import { DemoAvatar } from "./demo-avatar";

export default async function Page({ searchParams }: { searchParams: Promise<{ avatar?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <HeroBanner name={dashboard.name} />
      <DemoAvatar mannequin={sp.avatar !== "producao"} />
      <DashboardView {...dashboard} />
    </>
  );
}
