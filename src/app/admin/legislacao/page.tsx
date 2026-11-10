import Link from "next/link";
import { createAdminClient } from "@/server/supabase";
import { requireAdmin } from "@/server/services/catalog";
import { atualizarTemaAction, conferirLeisAction, restaurarTemaAction } from "./actions";
import { LegBotao } from "./botoes";

export const metadata = { title: "Legislação do catálogo" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "nunca");

const LABEL: Record<string, string> = {
  nao_conferido: "Não conferido",
  baseline: "Base registrada",
  ok: "Em dia",
  desatualizado: "DESATUALIZADO",
  sem_referencia: "Sem lei citada",
  erro: "Falha ao conferir",
  atualizando: "Atualizando…",
};

interface Row {
  id: string;
  title: string;
  status: string;
  version: number;
  law_status: string;
  law_changed: string[];
  law_missing: string[];
  law_checked_at: string | null;
}

/** Conferência de legislação: compara os artigos citados pelos temas com o texto oficial do Planalto. */
export default async function LegislacaoPage() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("catalog_topics")
    .select("id,title,status,version,law_status,law_changed,law_missing,law_checked_at")
    .neq("status", "arquivado")
    .order("title")
    .limit(1000);
  const rows = (data ?? []) as Row[];
  const ordem = (r: Row) => (r.law_status === "desatualizado" ? 0 : r.law_status === "atualizando" ? 1 : r.law_status === "erro" ? 2 : 3);
  rows.sort((a, b) => ordem(a) - ordem(b) || a.title.localeCompare(b.title, "pt-BR"));
  const desat = rows.filter((r) => r.law_status === "desatualizado").length;
  return (
    <div>
      <h1 className="t-h1">LEGISLAÇÃO DO CATÁLOGO</h1>
      <p className="mt-2 max-w-2xl t-small text-tinta-suave">
        Compara os artigos que cada tema cita com o texto compilado oficial do Planalto. Na primeira conferência o sistema só registra a redação atual como base; a partir da segunda, avisa quando algum artigo mudou. A atualização refaz a aula e as questões com IA, guarda a versão anterior e restaura sozinha se algo falhar.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3" data-testid="leg-controle">
        <LegBotao primary label="Conferir leis agora" action={conferirLeisAction} />
        <span className="t-small">{rows.length} temas · {desat} desatualizados</span>
      </div>
      <ul className="mt-4 divide-y divide-linha rounded-lg border border-linha bg-superficie">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3" data-testid="leg-linha">
            <div className="min-w-0">
              <Link href={`/admin/catalogo/${r.id}`} className="font-semibold underline-offset-2 hover:underline">{r.title}</Link>
              <p className="t-tiny text-tinta-suave">
                {LABEL[r.law_status] ?? r.law_status} · v{r.version} · conferido {fmt(r.law_checked_at)}
                {r.law_changed.length > 0 && ` · mudou: ${r.law_changed.join(", ")}`}
                {r.law_missing.length > 0 && ` · não encontrado: ${r.law_missing.join(", ")}`}
              </p>
            </div>
            {(r.law_status === "desatualizado" || r.law_status === "erro" || r.law_status === "ok" || r.law_status === "baseline") && (
              <span className="flex flex-wrap gap-2">
                <LegBotao label="Atualizar" action={atualizarTemaAction.bind(null, r.id)} confirmText="Refazer aula e questões deste tema com o texto oficial atual? A versão atual fica guardada." />
                {r.law_status === "desatualizado" && <LegBotao label="Restaurar anterior" action={restaurarTemaAction.bind(null, r.id)} confirmText="Voltar à versão guardada antes da última atualização?" />}
              </span>
            )}
          </li>
        ))}
        {!rows.length && <li className="p-4 t-small">Nenhum tema cadastrado.</li>}
      </ul>
    </div>
  );
}
