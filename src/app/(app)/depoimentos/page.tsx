import { requireUser } from "@/server/auth";
import { listTestimonials, loadStories } from "@/server/services/testimonials";
import { DEFAULT_FOUNDERS, DEFAULT_QUOTE } from "@/domain/testimonials";
import { DepoimentosView } from "@/components/depoimentos/depoimentos-view";

export const metadata = { title: "Depoimentos" };
export const dynamic = "force-dynamic";

export default async function DepoimentosPage() {
  await requireUser("/depoimentos");
  const [items, stories] = await Promise.all([
    listTestimonials().catch(() => []),
    loadStories().catch(() => ({ founders: DEFAULT_FOUNDERS, stats: { students: null, approved: null, satisfaction: null, studentsReal: 0, approvedReal: 0 }, quote: DEFAULT_QUOTE })),
  ]);
  return <DepoimentosView items={items} stories={stories} />;
}
