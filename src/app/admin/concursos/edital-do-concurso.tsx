"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnexarEdital } from "@/components/missao/anexar-edital";
import type { VinculoEdital } from "@/server/services/concurso-edital";

type Vincular = (contestId: string, prepId: string | null) => Promise<{ ok: boolean; error?: string }>;

/** Edital que os alunos estudam neste concurso: o admin envia o PDF (mesmo leitor), confere a leitura e o concurso passa a aparecer na página inicial do aluno. */
export function EditalDoConcurso({ contestId, vinculo, vincular }: { contestId: string; vinculo: VinculoEdital | null; vincular: Vincular }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ligar = (prepId: string | null, revisar = false) =>
    start(async () => {
      const r = await vincular(contestId, prepId);
      setMsg(r.ok ? (prepId ? "Edital vinculado: o concurso já aparece para os alunos." : "Edital desvinculado: o concurso saiu da escolha dos alunos.") : (r.error ?? "Erro."));
      if (!r.ok) return;
      // Recém-lido: abre a página do conteúdo programático para o admin conferir (e reler, se precisar) o que os alunos vão ver.
      if (revisar && prepId) router.push(`/conteudo-programatico/${prepId}`);
      else router.refresh();
    });

  return (
    <div className="rounded-lg border border-linha bg-superficie p-4" data-testid={`concurso-edital-${contestId}`}>
      <p className="t-small font-semibold">Edital para estudo dos alunos</p>
      {vinculo ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span>
            <strong>{vinculo.titulo}</strong> · {vinculo.disciplinas} matérias · publicado para os alunos
          </span>
          <Link href={`/conteudo-programatico/${vinculo.prepId}`} className="underline" target="_blank">Revisar a leitura</Link>
          <button type="button" disabled={pending} onClick={() => ligar(null)} className="rounded border border-linha px-3 py-1 text-sm disabled:opacity-60">
            Desvincular
          </button>
        </div>
      ) : (
        <p className="mt-1 t-small text-tinta-suave">Nenhum edital vinculado: o aluno ainda não vê este concurso para estudar.</p>
      )}
      <div className="mt-3 rounded-lg bg-black p-3">
        <p className="mb-2 text-sm text-white">{vinculo ? "Trocar o edital:" : "Enviar o edital em PDF:"} ao terminar a leitura, o edital é vinculado e a página do conteúdo programático abre para você conferir.</p>
        <AnexarEdital onLido={(id) => ligar(id, true)} desabilitado={pending} />
      </div>
      {msg && <p role="status" className="mt-2 t-small">{msg}</p>}
    </div>
  );
}
