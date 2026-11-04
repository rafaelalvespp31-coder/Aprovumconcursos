import { HeroBanner } from "@/app/(app)/painel/hero-banner";
import { DemoHome } from "./demo-home";

/** Galeria: a Home (painel de operações) com dados de exemplo. `?dados=vazio`, `?genero=f`, `?nivel=N`, `?levelup=1`, `?plano=gratis` (conta gratuita). */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    avatar?: string;
    genero?: string;
    nivel?: string;
    dados?: string;
    levelup?: string;
    plano?: string;
  }>;
}) {
  const sp = await searchParams;
  return (
    <>
      <div className="cl-banner">
        <HeroBanner name="Rafael" />
      </div>
      <DemoHome
        mannequin={sp.avatar === "manequim"}
        gender={sp.genero === "f" ? "f" : "m"}
        level={Number(sp.nivel) || 1}
        empty={sp.dados === "vazio"}
        levelUp={sp.levelup === "1"}
        canCustomize={sp.plano !== "gratis"}
      />
    </>
  );
}
