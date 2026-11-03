import { HeroBanner } from "@/app/(app)/painel/hero-banner";
import { DemoAvatar } from "./demo-avatar";

/** Galeria: o painel como no app (banner das aprovações + card do avatar). */
export default async function Page({ searchParams }: { searchParams: Promise<{ avatar?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <HeroBanner name="Rafael" />
      <DemoAvatar mannequin={sp.avatar === "manequim"} />
    </>
  );
}
