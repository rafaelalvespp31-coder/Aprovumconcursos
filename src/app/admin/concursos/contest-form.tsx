"use client";

import { useState, useTransition } from "react";
import { CONTEST_STATUS } from "@/domain/gamification/home";
import { UFS } from "@/domain/concursos";
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
      <p className="t-small font-semibold sm:col-span-2">Onde aparece no mapa e nos filtros</p>
      <label className="text-sm">Estado (UF)
        <select name="uf" defaultValue={c?.uf ?? ""} className={input}>
          <option value="">Nacional / sem estado (NÃO aparece no mapa nem em “Minas Gerais” etc.)</option>
          {UFS.map(([u, n]) => <option key={u} value={u}>{u} — {n}</option>)}
        </select>
      </label>
      <label className="text-sm">Cidade<input name="city" defaultValue={c?.city ?? ""} className={input} placeholder="Belo Horizonte" /></label>
      <label className="text-sm">Órgão<input name="orgao" defaultValue={c?.orgao ?? ""} className={input} placeholder="Secretaria de Estado de Justiça e Segurança Pública" /></label>
      <label className="text-sm">Banca organizadora<input name="banca" defaultValue={c?.banca ?? ""} className={input} placeholder="Cebraspe, FGV, Vunesp…" /></label>
      <label className="text-sm">Escolaridade
        <select name="education" defaultValue={c?.education ?? ""} className={input}>
          <option value="">Não informada</option>
          {["Fundamental", "Médio", "Técnico", "Superior"].map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className="text-sm">Local de prova / lotação<input name="location" defaultValue={c?.location ?? ""} className={input} placeholder="Capital e regiões metropolitanas" /></label>
      <label className="text-sm">Início das inscrições<input name="registration_start" type="date" defaultValue={c?.registrationStart ?? ""} className={input} /></label>
      <label className="text-sm">Fim das inscrições<input name="registration_end" type="date" defaultValue={c?.registrationEnd ?? ""} className={input} /></label>
      <label className="text-sm">Link para detalhes (edital)<input name="detail_url" type="url" defaultValue={c?.detailUrl ?? ""} className={input} placeholder="https://" /></label>
      <label className="text-sm sm:col-span-2">Descrição (texto livre mostrado ao aluno; até 2000 caracteres)
        <textarea name="description" rows={4} maxLength={2000} defaultValue={c?.description ?? ""} className={input} placeholder="Resumo do edital, etapas, requisitos…" />
      </label>
      <div className="flex flex-col gap-1 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={c?.featured ?? false} /> Destaque (aparece no painel “Destaques” ao lado do mapa)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="forecast" defaultChecked={c?.forecast ?? false} /> É uma previsão (o aluno vê o selo “Previsão”, não confirmado)</label>
      </div>
      <label className="text-sm">Fonte*<input name="source_name" required defaultValue={c?.sourceName} className={input} placeholder="Edital nº 1/2027, DOU de…" /></label>
      <label className="text-sm">Link da fonte<input name="source_url" type="url" defaultValue={c?.sourceUrl ?? ""} className={input} placeholder="https://" /></label>
      <div className="flex flex-wrap items-center gap-3 text-sm sm:col-span-2">
        {c?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.imageUrl} alt={`Imagem de ${c.name}`} className="h-20 w-32 rounded border border-linha object-cover" />
        )}
        <label className="flex flex-col">
          Imagem do concurso — ideal 720 × 460 px (proporção 14:9), JPG, PNG ou WEBP, até 4 MB
          <input
            name="imagem"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 text-sm"
            data-testid={c ? `concurso-imagem-${c.id}` : "concurso-imagem-novo"}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f && f.size > 4_000_000) {
                setMsg("Imagem acima de 4 MB: reduza antes de enviar.");
                e.currentTarget.value = "";
              } else setMsg(null);
            }}
          />
        </label>
        {c?.imageUrl && <label className="flex items-center gap-2"><input type="checkbox" name="remover_imagem" /> Remover imagem (volta a arte padrão)</label>}
        <span className="t-small text-tinta-suave">Referência de uso da imagem: card “Próximos concursos” da Home, cards da página Concursos, painel do estado e “Destaques”. Outros tamanhos são ajustados para 720 × 460 automaticamente (as bordas são cortadas, sem distorcer): deixe o assunto principal no centro.</span>
      </div>
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
