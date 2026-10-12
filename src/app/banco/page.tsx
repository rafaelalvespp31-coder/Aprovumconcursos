import Link from "next/link";
import { bankDashboard, requireBankStaff } from "@/server/services/bank";
import { DIFFICULTIES, DIFFICULTY_LABEL, FLAG_LABEL, ORIGIN_LABEL, ORIGINS, STATUS_LABEL, type BankStatus } from "@/domain/bank/labels";
import { DBadge, DCard, DLink, DStat, STATUS_TONE, fmtDate } from "./ui";
import { LegalUpdateForm } from "./legal-update-form";

export default async function BankDashboardPage() {
  const staff = await requireBankStaff();
  const d = await bankDashboard();
  const s = d.by_status;
  const total = Object.entries(s).filter(([k]) => k !== "arquivada").reduce((a, [, n]) => a + n, 0);
  const pending = (s.aguardando_conferencia ?? 0) + (s.em_revisao ?? 0) + (s.correcao_necessaria ?? 0) + (s.importada ?? 0);
  const flags = Object.values(d.flags_open).reduce((a, n) => a + n, 0);
  const maxSubject = Math.max(1, ...d.by_subject.map((x) => x.total));
  const accuracy = d.attempts ? Math.round((d.attempts_correct / d.attempts) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[Space_Grotesk] text-[26px] font-bold">Painel do banco</h1>
          <p className="text-[14px] text-white/60">Nada é publicado sem revisão humana. Questões só entram no Ranked depois de aprovadas por outro revisor e publicadas.</p>
        </div>
        {staff.roles.autor && <DLink href="/banco/questoes/nova">+ Nova questão</DLink>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DStat label="Cadastradas" value={total} hint="sem contar arquivadas" />
        <DStat label="Publicadas" value={s.publicada ?? 0} tone="verde" hint={`${s.aprovada ?? 0} aprovada(s) aguardando publicação`} />
        <DStat label="Pendentes" value={pending} tone="ambar" hint="conferência, revisão ou correção" />
        <DStat label="Suspensas" value={s.suspensa ?? 0} tone="vermelho" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DCard title="Por matéria" className="lg:col-span-2">
          <ul className="flex flex-col gap-2.5">
            {d.by_subject.map((x) => (
              <li key={x.slug}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="font-medium">{x.name}</span>
                  <span className="tabular-nums text-white/60">
                    {x.published} publicada(s) / {x.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ff2a2a] to-[#8a0303]" style={{ width: `${(x.total / maxSubject) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </DCard>
        <div className="flex flex-col gap-4">
          <DCard title="Por dificuldade">
            <ul className="flex flex-col gap-1.5 text-[14px]">
              {DIFFICULTIES.map((k) => (
                <li key={k} className="flex justify-between">
                  <span>{DIFFICULTY_LABEL[k]}</span>
                  <span className="tabular-nums text-white/70">{d.by_difficulty[k] ?? 0}</span>
                </li>
              ))}
            </ul>
          </DCard>
          <DCard title="Por origem">
            <ul className="flex flex-col gap-1.5 text-[14px]">
              {ORIGINS.map((k) => (
                <li key={k} className="flex justify-between">
                  <span>{ORIGIN_LABEL[k]}</span>
                  <span className="tabular-nums text-white/70">{d.by_origin[k] ?? 0}</span>
                </li>
              ))}
            </ul>
          </DCard>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DStat label="Fontes" value={d.sources} hint={d.sources_unverified ? `${d.sources_unverified} prova(s) sem autorização verificada` : "todas as provas verificadas"} />
        <DStat label="Importações" value={d.imports_processing} hint="em processamento/conferência" />
        <DStat label="Alertas abertos" value={flags} tone={flags ? "vermelho" : "neutro"} />
        <DStat label="Acerto geral" value={accuracy === null ? "—" : `${accuracy}%`} hint={`${d.attempts} tentativa(s) registradas`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DCard title="Alertas" action={<Link href="/banco/questoes?flagged=1" className="text-[13px] font-semibold text-[#ff8080] hover:underline">Ver questões com alerta</Link>}>
          {flags === 0 ? (
            <p className="text-[14px] text-white/60">Nenhum alerta aberto.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-[14px]">
              {Object.entries(d.flags_open).map(([k, n]) => (
                <li key={k} className="flex justify-between">
                  <span>{FLAG_LABEL[k] ?? k}</span>
                  <DBadge tone="vermelho">{n}</DBadge>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] text-white/45">
            Custo de IA registrado: US$ {Number(d.ai_cost_usd).toFixed(4)} em {d.ai_batches} lote(s).
          </p>
        </DCard>
        <DCard title="Atividade recente">
          {d.recent.length === 0 ? (
            <p className="text-[14px] text-white/60">Nenhuma decisão registrada ainda.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/10 text-[13px]">
              {d.recent.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-2">
                  <Link href={`/banco/questoes/${r.question_id}`} className="font-mono font-semibold text-[#ff8080] hover:underline">{r.public_code}</Link>
                  <DBadge tone={STATUS_TONE[r.to_status]}>{STATUS_LABEL[r.to_status as BankStatus] ?? r.to_status}</DBadge>
                  <span className="text-white/45">{fmtDate(r.created_at, true)}</span>
                  {r.notes && <span className="w-full truncate text-white/60">“{r.notes}”</span>}
                </li>
              ))}
            </ul>
          )}
        </DCard>
      </div>

      {staff.roles.revisor && (
        <DCard title="Atualização legislativa">
          <p className="mb-3 text-[14px] text-white/65">
            Mudou uma lei? Informe a norma e o artigo exatamente como estão nas referências das questões. Todas as questões ligadas ganham o alerta “possivelmente desatualizada” para revisão — nada é alterado automaticamente.
          </p>
          <LegalUpdateForm />
        </DCard>
      )}
    </div>
  );
}
