import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { listEvents, listPreparations } from "@/server/services/edital";
import { Processing } from "@/components/aprovum-ai/processing";

export const metadata = { title: "APROVUM AI · Processamento" };
export const dynamic = "force-dynamic";

export default async function ProcessandoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/aprovum-ai/${id}`);
  const prep = (await listPreparations(user.id)).find((p) => p.id === id);
  if (!prep) notFound();
  const events = await listEvents(user.id, id).catch(() => []);
  return <Processing initial={prep} initialEvents={events} />;
}
