import Link from "next/link";
import { Icon } from "@/components/icons";
import type { BankFilters } from "@/server/queries";

const selectCls =
  "min-h-11 w-full rounded-md border border-linha-forte bg-superficie px-3 text-[0.95rem] text-tinta focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20";

const BOARD_NAMES: Record<string, string> = {
  fgv: "FGV", cebraspe: "CEBRASPE", aocp: "AOCP", vunesp: "VUNESP", ibfc: "IBFC", ibade: "IBADE", selecon: "SELECON",
};

/** Filtros por GET: a URL guarda o estado e pode ser compartilhada/recarregada. */
export function BankFiltersForm({
  action,
  filters,
  trails,
  boards,
  modules,
}: {
  action: string;
  filters: BankFilters;
  trails: Array<{ id: string; title: string }>;
  boards: string[];
  modules: Array<{ id: string; title: string }>;
}) {
  const active = Object.values(filters).filter((v) => v && v !== "todas").length;
  return (
    <details className="group rounded-lg border border-linha bg-superficie" open={active > 0}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold">
        <Icon name="filtro" className="size-4" /> Filtros
        {active > 0 && <span className="rounded-full bg-nevoa px-2 t-tiny text-azul-escuro">{active} ativo(s)</span>}
        <Icon name="chevronDown" className="ml-auto size-4 transition-transform group-open:rotate-180" />
      </summary>
      <form action={action} method="get" className="grid gap-3 border-t border-linha p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 t-small font-semibold">Trilha
          <select name="trilha" defaultValue={filters.trilha ?? ""} className={selectCls}>
            <option value="">Todas</option>
            {trails.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 t-small font-semibold">Banca
          <select name="banca" defaultValue={filters.banca ?? ""} className={selectCls}>
            <option value="">Todas</option>
            {boards.map((b) => <option key={b} value={b}>{BOARD_NAMES[b] ?? b}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 t-small font-semibold">Matéria (módulo)
          <select name="materia" defaultValue={filters.materia ?? ""} className={selectCls}>
            <option value="">Todas</option>
            {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 t-small font-semibold">Assunto
          <input name="assunto" defaultValue={filters.assunto ?? ""} placeholder="Ex.: atos administrativos" className={selectCls} />
        </label>
        <label className="flex flex-col gap-1 t-small font-semibold">Dificuldade
          <select name="dificuldade" defaultValue={filters.dificuldade ?? ""} className={selectCls}>
            <option value="">Todas</option>
            <option value="1">1 — Compreensão</option>
            <option value="2">2 — Aplicação</option>
            <option value="3">3 — Interpretação</option>
            <option value="4">4 — Avançada</option>
            <option value="5">5 — Integradora</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 t-small font-semibold">Situação
          <select name="situacao" defaultValue={filters.situacao ?? "todas"} className={selectCls}>
            <option value="todas">Todas</option>
            <option value="nao_respondidas">Não respondidas</option>
            <option value="erradas">Errei na última tentativa</option>
            <option value="acertadas">Acertei na última tentativa</option>
            <option value="marcadas">Marcadas para resolver depois</option>
          </select>
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" className="inline-flex min-h-11 items-center rounded-md bg-azul px-4 font-semibold text-white hover:bg-azul-escuro">Aplicar filtros</button>
          {active > 0 && <Link href={action} className="inline-flex min-h-11 items-center px-3 font-semibold text-azul">Limpar</Link>}
        </div>
      </form>
    </details>
  );
}

export function parseFilters(sp: Record<string, string | undefined>): BankFilters {
  const situacoes = ["todas", "nao_respondidas", "erradas", "acertadas", "marcadas"] as const;
  return {
    trilha: sp.trilha && /^[0-9a-f-]{36}$/i.test(sp.trilha) ? sp.trilha : undefined,
    banca: sp.banca?.slice(0, 40) || undefined,
    materia: sp.materia && /^[0-9a-f-]{36}$/i.test(sp.materia) ? sp.materia : undefined,
    assunto: sp.assunto?.slice(0, 80) || undefined,
    dificuldade: sp.dificuldade && /^[1-5]$/.test(sp.dificuldade) ? sp.dificuldade : undefined,
    situacao: situacoes.includes(sp.situacao as (typeof situacoes)[number]) ? (sp.situacao as BankFilters["situacao"]) : "todas",
  };
}
