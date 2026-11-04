import { VozDemo } from "./demo";
import type { Fase } from "@/components/mentor/voz-view";

export default async function Page({ searchParams }: { searchParams: Promise<{ modo?: string; fase?: string }> }) {
  const { modo, fase } = await searchParams;
  return <VozDemo modo={modo ?? "parado"} fase={(fase as Fase) ?? "pronto"} />;
}
