import { DemoHome } from "./demo-home";

/** Galeria: a Home (painel de operações) com dados de exemplo. `?dados=vazio`, `?genero=f`, `?nivel=N`, `?levelup=1`. */
export default async function Page({ searchParams }: { searchParams: Promise<{ avatar?: string; genero?: string; nivel?: string; dados?: string; levelup?: string }> }) {
  const sp = await searchParams;
  return (
    <DemoHome
      mannequin={sp.avatar === "manequim"}
      gender={sp.genero === "f" ? "f" : "m"}
      level={Number(sp.nivel) || 1}
      empty={sp.dados === "vazio"}
      levelUp={sp.levelup === "1"}
    />
  );
}
