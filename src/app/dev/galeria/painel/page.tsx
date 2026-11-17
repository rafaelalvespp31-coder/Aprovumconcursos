import { HeroBanner } from "@/app/(app)/painel/hero-banner";
import { BlackNovemberTicker } from "@/components/home/black-november-ticker";
import { CentralMissoesView } from "@/components/central/central-missoes";
import { DemoHome } from "./demo-home";

const cards = [
  { id: "1", sigla: "PRF", nome: "PRF", foto: "/orgs/prf-card.webp", pct: 42, href: "#", pronto: true },
  { id: "2", sigla: "PMRJ", nome: "PMRJ", foto: "/orgs/pmerj-card.webp", pct: 18, href: "#", pronto: true },
  { id: "3", sigla: "PCMG", nome: "PCMG", foto: "/orgs/pcmg-card.webp", pct: 0, href: "#", pronto: true },
];

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
      <BlackNovemberTicker href="/dev/galeria/plano" />
      <DemoHome
        mannequin={sp.avatar === "manequim"}
        gender={sp.genero === "f" ? "f" : "m"}
        level={Number(sp.nivel) || 1}
        empty={sp.dados === "vazio"}
        levelUp={sp.levelup === "1"}
        canCustomize={sp.plano !== "gratis"}
        central={<CentralMissoesView cards={cards} selecionado="1" limite={10} action={async () => { "use server"; return { ok: true }; }} />}
      />
    </>
  );
}
