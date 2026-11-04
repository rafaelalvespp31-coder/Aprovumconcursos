import { PlanoView } from "@/app/(app)/plano/view";

/** Galeria: a tela "Meu Plano" com um plano atual de exemplo (`?atual=mensal`). */
export default async function Page({ searchParams }: { searchParams: Promise<{ atual?: string }> }) {
  const sp = await searchParams;
  const atual = (["mensal", "semestral", "anual", "vitalicio"] as const).find((k) => k === sp.atual) ?? "gratuito";
  async function choose(plan: string) {
    "use server";
    return { ok: true as const, url: null, plan };
  }
  return <div style={{ background: "#070707", padding: 12 }}><PlanoView current={atual} choose={choose} /></div>;
}
