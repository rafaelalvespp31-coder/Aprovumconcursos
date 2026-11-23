"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { comandoAnaliseParaCargo, lerAnalise } from "@/domain/edital/analise";
import type { ResumoAnaliseAdmin } from "@/server/services/concurso-analise";

export type ImportarEstrategica = (contestId: string, texto: string) => Promise<{ ok: true; disciplinas: number; avisos: string[] } | { ok: false; error: string }>;
export type RemoverEstrategica = (contestId: string) => Promise<{ ok: boolean; error?: string }>;

/**
 * Análise estratégica do concurso (modelo "Análise completa do edital"): o admin roda o comando no ChatGPT com o PDF do edital,
 * cola o texto aqui, confere o resumo e importa. O aluno vê a análise na página do concurso.
 */
export function AnaliseEstrategica({ contestId, cargoSugerido, atual, importar, remover }: { contestId: string; cargoSugerido: string; atual: ResumoAnaliseAdmin | null; importar: ImportarEstrategica; remover: RemoverEstrategica }) {
  const router = useRouter();
  const [cargo, setCargo] = useState(cargoSugerido);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // A mesma leitura do servidor roda aqui: o resumo e os avisos aparecem antes de importar.
  const v = useMemo(() => (texto.trim() ? lerAnalise(texto) : null), [texto]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(comandoAnaliseParaCargo(cargo));
      setMsg("Comando copiado. Cole no ChatGPT e anexe o PDF do edital.");
    } catch {
      setMsg("Não consegui copiar. Abra “Ver o comando” e copie o texto.");
    }
  };
  const enviar = () =>
    start(async () => {
      const r = await importar(contestId, texto);
      if (!r.ok) return setMsg(r.error);
      setMsg(`Análise importada: ${r.disciplinas} disciplinas${r.avisos.length ? `, com ${r.avisos.length} aviso(s)` : ""}.`);
      setTexto("");
      router.refresh();
    });
  const tirar = () =>
    start(async () => {
      const r = await remover(contestId);
      setMsg(r.ok ? "Análise removida." : (r.error ?? "Erro."));
      if (r.ok) router.refresh();
    });

  const campo = "mt-1 w-full rounded border border-linha bg-superficie px-2 py-1.5 text-sm";
  return (
    <div className="rounded-lg border border-linha bg-superficie p-4" data-testid={`concurso-analise-${contestId}`}>
      <p className="t-small font-semibold">Análise estratégica do concurso (modelo completo)</p>
      {atual ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span><strong>{atual.titulo || "Análise importada"}</strong> · {atual.disciplinas} disciplinas · visível para os alunos</span>
          <a href={`/analise-concurso/${contestId}`} target="_blank" rel="noreferrer" className="underline">Ver como o aluno</a>
          <button type="button" disabled={pending} onClick={tirar} className="rounded border border-linha px-3 py-1 text-sm disabled:opacity-60">Remover</button>
        </div>
      ) : (
        <p className="mt-1 t-small text-tinta-suave">Sem análise: o aluno vê só o conteúdo programático.</p>
      )}

      <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm">
        <li>
          <label className="block">Cargo que o ChatGPT deve analisar
            <input value={cargo} onChange={(e) => setCargo(e.target.value)} className={campo} placeholder="Investigador" />
          </label>
          <button type="button" onClick={() => void copiar()} className="mt-2 rounded bg-tinta px-3 py-1.5 text-sm font-semibold text-white">Copiar o comando</button>
          <details className="mt-2">
            <summary className="cursor-pointer t-small text-tinta-suave">Ver o comando</summary>
            <textarea readOnly rows={8} value={comandoAnaliseParaCargo(cargo)} className={`${campo} font-mono text-xs`} aria-label="Comando da análise para o ChatGPT" />
          </details>
        </li>
        <li>No ChatGPT, anexe o PDF do edital, cole o comando e aguarde. Se ele cortar, peça “continue” e cole as partes juntas.</li>
        <li>
          <label className="block">Cole aqui o texto da análise
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} className={`${campo} font-mono text-xs`} placeholder="ANÁLISE COMPLETA DO EDITAL — ÓRGÃO | CARGO …" data-testid={`analise-texto-${contestId}`} />
          </label>
          {v && !v.ok && (
            <ul role="alert" className="mt-2 list-disc pl-5 text-red-700">
              {v.erros.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {v?.ok && (
            <div className="mt-2 space-y-1" role="status">
              <p className="font-semibold text-emerald-700">
                Análise lida: {v.resumo.disciplinas} disciplinas
                {v.resumo.questoes != null ? ` · ${v.resumo.questoes} questões` : ""} · {v.resumo.blocos} blocos · {v.resumo.grupos} grupos de dificuldade
              </p>
              <ul className="t-small text-tinta-suave">
                {v.analise.disciplinas.map((d) => <li key={d.ordem}>{d.nome}: {d.questoes ?? "?"} questões · {d.prioridade || "sem prioridade"}</li>)}
              </ul>
              {v.avisos.length > 0 && (
                <ul className="list-disc pl-5 text-amber-700">
                  {v.avisos.map((a) => <li key={a}>{a}</li>)}
                </ul>
              )}
            </div>
          )}
          <button type="button" disabled={pending || !v?.ok} onClick={enviar} className="mt-2 rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" data-testid={`analise-enviar-${contestId}`}>
            {pending ? "Salvando…" : atual ? "Importar e substituir" : "Importar análise"}
          </button>
        </li>
      </ol>
      {msg && <p role="status" className="mt-2 t-small">{msg}</p>}
    </div>
  );
}
