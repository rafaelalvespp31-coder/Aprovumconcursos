import { MeuEstudo, type EstudoTrail } from "@/components/meu-estudo/meu-estudo";

/**
 * Prévia da página Meu Estudo com dados de EXEMPLO (galeria). Em produção os dados vêm do Supabase.
 * `?vazio=1` mostra o estado sem pastas; `?soltas=0` mostra "Sem pasta" vazia.
 */
const F = (n: number) => `00000000-0000-4000-8300-${String(n).padStart(12, "0")}`;
const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const status = { label: "Em estudo", tone: "verde" as const };
const T = (n: number, title: string, folderId: string | null, done: number, total: number, banca: string, bancaLabel: string, d: number): EstudoTrail => ({
  id: `00000000-0000-4000-8100-${String(n).padStart(12, "0")}`, title, subtitle: bancaLabel, status, folderId, progress: { done, total }, banca, bancaLabel, updatedAt: ago(d),
});

export default async function Page({ searchParams }: { searchParams: Promise<{ vazio?: string; soltas?: string }> }) {
  const { vazio, soltas } = await searchParams;
  const folders = [
    { id: F(1), name: "Direito Penal", color: "vermelho" },
    { id: F(2), name: "Processo Penal", color: "azul" },
    { id: F(3), name: "Matemática", color: "verde" },
    { id: F(4), name: "Português", color: "amarelo" },
  ];
  const trails = [
    T(1, "Teoria do crime: fato típico", F(1), 7, 12, "cebraspe", "Cebraspe", 1),
    T(2, "Inquérito policial (CPP, arts. 4º a 23)", F(2), 5, 12, "fgv", "FGV", 2),
    T(3, "Porcentagem e juros", F(3), 6, 6, "idecan", "Idecan", 3),
    T(4, "Porcentagem — problemas", F(3), 4, 4, "idecan", "Idecan", 4),
    T(5, "Interpretação de texto", F(4), 1, 4, "fgv", "FGV", 5),
    ...(soltas === "0" ? [] : [T(6, "Hardware e software", null, 0, 3, "cebraspe", "Cebraspe", 6), T(7, "Direitos humanos", null, 2, 5, "fgv", "FGV", 7)]),
  ];
  return (
    <MeuEstudo
      folders={vazio ? [] : folders}
      trails={vazio ? [] : trails}
      studySeconds={vazio ? 0 : 5 * 3600 + 20 * 60}
      continueHref={vazio ? null : "/dev/galeria/aula"}
      continueLabel="Continuar estudos"
      archivedCount={vazio ? 0 : 2}
    />
  );
}
