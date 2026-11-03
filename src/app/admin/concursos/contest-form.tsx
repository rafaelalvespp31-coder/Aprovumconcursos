"use client";

import { useState, useTransition } from "react";
import { CONTEST_STATUS } from "@/domain/gamification/home";
import type { Contest } from "@/server/services/gamification";

type Action = (id: string | null, form: FormData) => Promise<{ ok: boolean; error?: string }>;

const input = "mt-1 w-full rounded border border-linha bg-superficie px-2 py-1.5 text-sm";

/** Formulário de um concurso (novo ou edição). Só dados com fonte; nada é preenchido automaticamente. */
export function ContestForm({ contest, action }: { contest: (Contest & { active: boolean }) | null; action: Action }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const c = contest;
  return (
    <form
      className="grid gap-3 rounded-lg border border-linha bg-superficie p-4 sm:grid-cols-2"
      data-testid={c ? `concurso-form-${c.id}` : "concurso-form-novo"}
      action={(fd) =>
        start(async () => {
          const r = await action(c?.id ?? null, fd);
          setMsg(r.ok ? "Salvo." : r.error ?? "Erro.");
        })
      }
    >
      <label className="text-sm">Concurso*<input name="name" required defaultValue={c?.name} className={input} placeholder="PRF 2027" /></label>
      <label className="text-sm">Instituição*<input name="institution" required defaultValue={c?.institution} className={input} placeholder="Polícia Rodoviária Federal" /></label>
      <label className="text-sm">Cargo<input name="role_name" defaultValue={c?.roleName ?? ""} className={input} /></label>
      <label className="text-sm">Situação
        <select name="status" defaultValue={c?.status ?? "previsto"} className={input}>
          {Object.entries(CONTEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="text-sm">Vagas<input name="vacancies" type="number" min={0} defaultValue={c?.vacancies ?? ""} className={input} /></label>
      <label className="text-sm">Remuneração<input name="salary" defaultValue={c?.salary ?? ""} className={input} placeholder="R$ 10.000,00" /></label>
      <label className="text-sm">Data da prova<input name="exam_date" type="date" defaultValue={c?.examDate ?? ""} className={input} /></label>
      <div className="flex flex-col justify-end gap-1 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="exam_date_confirmed" defaultChecked={c?.examDateConfirmed ?? false} /> Data da prova confirmada (mostra contagem regressiva)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="info_confirmed" defaultChecked={c?.infoConfirmed ?? false} /> Informações confirmadas por fonte oficial</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} /> Mostrar aos alunos</label>
      </div>
      <label className="text-sm">Fonte*<input name="source_name" required defaultValue={c?.sourceName} className={input} placeholder="Edital nº 1/2027, DOU de…" /></label>
      <label className="text-sm">Link da fonte<input name="source_url" type="url" defaultValue={c?.sourceUrl ?? ""} className={input} placeholder="https://" /></label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded bg-tinta px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Salvando…" : c ? "Salvar alterações" : "Cadastrar concurso"}
        </button>
        {c && <span className="t-small text-tinta-suave">Atualizado em {new Date(`${c.infoUpdatedAt}T12:00:00`).toLocaleDateString("pt-BR")}</span>}
        {msg && <span role="status" className="t-small">{msg}</span>}
      </div>
    </form>
  );
}
