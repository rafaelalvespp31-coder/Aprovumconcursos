import { requireUser } from "@/server/auth";
import { listTestimonials } from "@/server/services/testimonials";
import { DepoimentosView } from "@/components/depoimentos/depoimentos-view";

export const metadata = { title: "Depoimentos" };
export const dynamic = "force-dynamic";

export default async function DepoimentosPage() {
  await requireUser("/depoimentos");
  const items = await listTestimonials().catch(() => []);
  return <DepoimentosView items={items} />;
}
