import { DashboardView } from "@/app/(app)/painel/view";
import { HeroBanner } from "@/app/(app)/painel/hero-banner";
import { dashboard } from "../fixtures";
import { mentorDemos } from "../mentor-fixtures";

export default async function Page({ searchParams }: { searchParams: Promise<{ mentor?: string }> }) {
  const { mentor = "ok" } = await searchParams;
  return (
    <>
      <HeroBanner name={dashboard.name} />
      <DashboardView {...dashboard} mentorDemo={mentorDemos[mentor] ?? mentorDemos.ok} />
    </>
  );
}
