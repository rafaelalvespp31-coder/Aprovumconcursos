import { HeroBanner } from "@/app/(app)/painel/hero-banner";
import { DemoAvatar } from "./demo-avatar";

/** Galeria: o painel como no app (banner das aprovações + card do avatar). */
export default async function Page({ searchParams }: { searchParams: Promise<{ avatar?: string; genero?: string; nivel?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <HeroBanner name="Rafael" />
      <DemoAvatar mannequin={sp.avatar === "manequim"} gender={sp.genero === "f" ? "f" : "m"} level={Number(sp.nivel) || 4} />
    </>
  );
}
