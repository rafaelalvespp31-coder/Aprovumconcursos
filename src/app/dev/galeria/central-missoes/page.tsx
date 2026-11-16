import { CentralMissoesView } from "@/components/central/central-missoes";

/** Só galeria: dados de exemplo para conferir o visual (a ação não grava nada). */
const cards = [
  { id: "1", sigla: "PRF", nome: "PRF", foto: "/orgs/prf-card.webp", pct: 42, href: "#", pronto: true },
  { id: "2", sigla: "PMRJ", nome: "PMRJ", foto: "/orgs/pmerj-card.webp", pct: 18, href: "#", pronto: true },
  { id: "3", sigla: "PCMG", nome: "PCMG", foto: "/orgs/pcmg-card.webp", pct: 0, href: "#", pronto: true },
  { id: "4", sigla: "POLÍCIA PENAL", nome: "Polícia Penal", foto: "/missoes/pp.webp", pct: 67, href: "#", pronto: true },
  { id: "5", sigla: "GCM", nome: "GCM", foto: "/missoes/gcm.webp", pct: null, href: "#", pronto: false },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ vazio?: string }> }) {
  const { vazio } = await searchParams;
  return (
    <div style={{ background: "#000", padding: 16, minHeight: "100vh" }}>
      <CentralMissoesView cards={vazio ? [] : cards} selecionado={vazio ? null : "1"} limite={10} action={async () => { "use server"; return { ok: true }; }} />
    </div>
  );
}
