"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { comandoParaCargo, validarImportacao } from "@/domain/edital/importacao";
import type { VinculoEdital } from "@/server/services/concurso-edital";

type Vincular = (contestId: string, prepId: string | null) => Promise<{ ok: boolean; error?: string }>;
type Importar = (contestId: string, texto: string) => Promise<{ ok: true; id: string; materias: number; topicos: number } | { ok: false; error: string }>;

/**
 * Análise do concurso para os alunos: o admin roda o comando no ChatGPT com o PDF do edital, cola o JSON aqui,
 * confere o resumo e importa. O concurso passa a aparecer na página inicial do aluno.
 */
export function EditalDoConcurso({ contestId, cargoSugerido, vinculo, vincular, importar }: { contestId: string; cargoSugerido: string; vinculo: VinculoEdital | null; vincular: Vincular; importar: Importar }) {
  const router = useRouter();
  const [cargo, setCargo] = useState(cargoSugerido);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // A mesma validação do servidor roda aqui: o resumo e os avisos aparecem antes de importar.
  const v = useMemo(() => (texto.trim() ? validarImportacao(texto) : null), [texto]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(comandoParaCargo(cargo));
      setMsg("Comando copiado. Cole no ChatGPT e anexe o PDF do edital.");
    } catch {
      setMsg("Não consegui copiar. Selecione o texto do comando abaixo e copie.");
    }
  };

  const desvincular = () =>
    start(async () => {
      const r = await vincular(contestId, null);
      setMsg(r.ok ? "Desvinculado: o concurso saiu da escolha dos alunos." : (r.error ?? "Erro."));
      if (r.ok) router.refresh();
    });

  const importarAgora = () =>
    start(async () => {
      const r = await importar(contestId, texto);
      if (!r.ok) return setMsg(r.error);
      setMsg(`Importado: ${r.materias} matérias, ${r.topicos} tópicos. Abrindo a conferência…`);
      router.push(`/conteudo-programatico/${r.id}`);
    });

  const campo = "mt-1 w-full rounded border border-linha bg-superficie px-2 py-1.5 text-sm";
  return (
    <div className="rounded-lg border border-linha bg-superficie p-4" data-testid={`concurso-edital-${contestId}`}>
      <p className="t-small font-semibold">Análise do concurso para os alunos</p>
      {vinculo ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span>
            <strong>{vinculo.titulo}</strong> · {vinculo.disciplinas} matérias · publicado para os alunos
          </span>
          <Link href={`/conteudo-programatico/${vinculo.prepId}`} className="underline" target="_blank">Conferir</Link>
          <button type="button" disabled={pending} onClick={desvincular} className="rounded border border-linha px-3 py-1 text-sm disabled:opacity-60">
            Desvincular
          </button>
        </div>
      ) : (
        <p className="mt-1 t-small text-tinta-suave">Nada importado: o aluno ainda não vê este concurso para estudar.</p>
      )}

      <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm">
        <li>
          <label className="block">Cargo que o ChatGPT deve analisar
            <input value={cargo} onChange={(e) => setCargo(e.target.value)} className={campo} placeholder="Policial Penal" />
          </label>
          <button type="button" onClick={() => void copiar()} className="mt-2 rounded bg-tinta px-3 py-1.5 text-sm font-semibold text-white">Copiar o comando</button>
          <details className="mt-2">
            <summary className="cursor-pointer t-small text-tinta-suave">Ver o comando</summary>
            <textarea readOnly rows={8} value={comandoParaCargo(cargo)} className={`${campo} font-mono text-xs`} aria-label="Comando para o ChatGPT" />
          </details>
        </li>
        <li>No ChatGPT, anexe o PDF do edital, cole o comando e aguarde a resposta (JSON). Se ele cortar, peça “continue” e cole as partes juntas.</li>
        <li>
          <label className="block">Cole aqui a resposta do ChatGPT
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} className={`${campo} font-mono text-xs`} placeholder='{ "versao": 1, "concurso": { … }, "materias": [ … ] }' data-testid={`importacao-texto-${contestId}`} />
          </label>
          {v && !v.ok && (
            <ul role="alert" className="mt-2 list-disc pl-5 text-red-700">
              {v.erros.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {v?.ok && (
            <div className="mt-2 space-y-1" role="status">
              <p className="font-semibold text-emerald-700">
                Análise válida: {v.resumo.materias} matérias · {v.resumo.topicos} tópicos
                {v.info.cargo ? ` · ${v.info.cargo}` : ""}
                {v.info.banca ? ` · ${v.info.banca}` : ""}
              </p>
              <ul className="t-small text-tinta-suave">
                {v.resumo.porMateria.map((m) => <li key={m.nome}>{m.nome}: {m.topicos}</li>)}
              </ul>
              {v.avisos.length > 0 && (
                <ul className="list-disc pl-5 text-amber-700">
                  {v.avisos.map((a) => <li key={a}>{a}</li>)}
                </ul>
              )}
            </div>
          )}
          <button type="button" disabled={pending || !v?.ok} onClick={importarAgora} className="mt-2 rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" data-testid={`importacao-enviar-${contestId}`}>
            {pending ? "Importando…" : vinculo ? "Importar e substituir" : "Importar e publicar"}
          </button>
          <span className="ml-2 t-small text-tinta-suave">Publica na hora para os alunos; você confere na página que abre.</span>
        </li>
      </ol>
      {msg && <p role="status" className="mt-2 t-small">{msg}</p>}
    </div>
  );
}
