import { VozDemo } from "./demo";

export default async function Page({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const { modo } = await searchParams;
  return <VozDemo modo={modo ?? "fala"} />;
}
