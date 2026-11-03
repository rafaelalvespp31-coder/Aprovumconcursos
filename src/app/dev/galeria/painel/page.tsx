import { DemoAvatar } from "./demo-avatar";

/** Galeria: o painel é o avatar (como no app). */
export default async function Page({ searchParams }: { searchParams: Promise<{ avatar?: string }> }) {
  const sp = await searchParams;
  return <DemoAvatar mannequin={sp.avatar === "manequim"} />;
}
