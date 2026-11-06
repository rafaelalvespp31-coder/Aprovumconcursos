"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { applyImportAction, previewImportAction } from "../actions";
import type { ImportPreview } from "@/server/services/strategic";

export function ImportForm({ example }: { example: string }) {
  const [json, setJson] = useState("");
  const [pv, setPv] = useState<ImportPreview | null>(null);
  const [done, setDone] = useState<{ examId: string; updated: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const check = () => start(async () => { setErr(null); setDone(null); setPv(await previewImportAction(json)); });
  const apply = () => start(async () => {
    const r = await applyImportAction(json);
    if (r.ok) setDone({ examId: r.examId, updated: r.updated });
    else setErr(r.error);
  });
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 1_500_000) return setErr("Arquivo grande demais (limite ~1,5 MB).");
    setJson(await f.text());
    setPv(null);
    setDone(null);
  };

  return (
    <div className="mt-5 grid gap-3">
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-full border border-linha px-4 py-2 t-small font-semibold">
          Enviar arquivo .json<input type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <button type="button" className="rounded-full border border-linha px-4 py-2 t-small font-semibold" onClick={() => { setJson(example); setPv(null); }}>Ver exemplo do formato</button>
      </div>
      <textarea value={json} onChange={(e) => { setJson(e.target.value); setPv(null); setDone(null); }} rows={14} spellCheck={false} placeholder="Cole aqui o JSON da análise" className="w-full rounded-xl border border-linha bg-white p-3 font-mono text-[12.5px]" aria-label="JSON da análise" />
      <div><button type="button" disabled={pending || json.trim().length < 10} onClick={check} className="rounded-full bg-tinta px-5 py-2 t-small font-semibold text-white disabled:opacity-50">{pending ? "Conferindo…" : "Conferir e ver prévia"}</button></div>
      {err && <p role="alert" className="rounded-lg bg-[#FDECEC] p-3 t-small text-[#C81018]">{err}</p>}
      {pv && (
        <section className="rounded-xl border border-linha p-4" aria-label="Prévia">
          <h2 className="font-semibold">Prévia da importação</h2>
          {pv.summary && <p className="mt-1 t-small text-tinta-suave">{pv.summary.editions} edições · {pv.summary.subjects} disciplinas · {pv.summary.topics} assuntos · {pv.summary.cutoffs} notas de corte · {pv.summary.sources} fontes · {pv.summary.recommendations} recomendações</p>}
          {pv.data && <p className="mt-1 t-small"><b>{pv.data.exam.name}</b>{pv.existing ? " — já cadastrado: será ATUALIZADO" : " — novo concurso (entra como Rascunho)"}</p>}
          <ul className="mt-3 grid gap-1.5">
            {pv.issues.length === 0 && <li className="t-small text-[#1d7a46]">Nenhum problema encontrado.</li>}
            {pv.issues.map((i, k) => (
              <li key={k} className={`rounded-lg px-3 py-2 t-small ${i.level === "erro" ? "bg-[#FDECEC] text-[#C81018]" : "bg-[#FFF6DD] text-[#7a5b00]"}`}><b>{i.level === "erro" ? "Erro" : "Aviso"}</b> · {i.path}: {i.message}</li>
            ))}
          </ul>
          {pv.ok && !done && <button type="button" disabled={pending} onClick={apply} className="mt-4 rounded-full bg-destaque px-5 py-2 t-small font-semibold text-white disabled:opacity-50">{pending ? "Salvando…" : pv.existing ? "Atualizar registros (volta para Em revisão)" : "Salvar como rascunho"}</button>}
          {!pv.ok && <p className="mt-3 t-small font-semibold text-[#C81018]">Corrija os erros e confira novamente. Nada foi salvo.</p>}
        </section>
      )}
      {done && <p role="status" className="rounded-lg bg-[#E8F7EE] p-3 t-small text-[#1d7a46]">{done.updated ? "Registros atualizados" : "Importado como rascunho"}. <Link className="font-semibold underline" href={`/admin/estrategico/${done.examId}`}>Revisar e publicar</Link></p>}
    </div>
  );
}
