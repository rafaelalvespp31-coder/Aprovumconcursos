import Link from "next/link";
import { bankLookups, requireBankStaff, topicPath } from "@/server/services/bank";
import { bankAIStatus, listBatches, usageReport, usedToday } from "@/server/services/bank-generation";
import { BLOCKED_BASE_KINDS, FREE_BASE_KINDS } from "@/domain/bank/generation";
import { DBadge, DCard, DNotice, DStat, fmtDate } from "../ui";
import { GenerateForm } from "./generate-form";

export const metadata = { title: "Gerar com IA — Banco" };
// Cada passo da geração roda numa chamada curta ao servidor.
export const maxDuration = 60;

const STATUS_TONE: Record<string, "verde" | "vermelho" | "ambar" | "neutro"> = { concluido: "verde", falhou: "vermelho", processando: "ambar", pendente: "ambar", cancelado: "neutro" };

export default async function GeneratePage() {
  const staff = await requireBankStaff();
  const [status, lk, batches, usage, used] = await Promise.all([Promise.resolve(bankAIStatus()), bankLookups(), listBatches(), usageReport(), usedToday()]);
  const sources = lk.sources
    .filter((s) => s.status === "ativa" && !(BLOCKED_BASE_KINDS as readonly string[]).includes(s.kind))
    .map((s) => ({ id: s.id, name: s.name, kind: s.kind, usable: (FREE_BASE_KINDS as readonly string[]).includes(s.kind) || s.reuse_verified }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[Space_Grotesk] text-[26px] font-bold">Gerar questões inéditas com IA</h1>
        <p className="text-[14px] text-white/60">
          A IA só usa o texto-base que você colar. Cada questão precisa citar trechos literais desse texto: citação inexistente é descartada. Tudo entra como “aguardando conferência” e passa por revisão humana. Nada é publicado automaticamente.
        </p>
      </div>

      {!status.enabled ? (
        <DNotice tone="alerta">
          A geração por IA está desligada. No Vercel, defina <code>AI_ENABLED=banco</code>, o provedor (<code>AI_PROVIDER</code>), a chave e <code>AI_MODEL</code>, e faça um novo deploy.
        </DNotice>
      ) : !status.configured ? (
        <DNotice tone="erro">IA ligada, mas não configurada: confira AI_PROVIDER, a chave do provedor e AI_MODEL no servidor.</DNotice>
      ) : (
        <DNotice tone="ok">
          IA ativa: {status.provider} · {status.model}. Hoje: {used}/{status.dailyLimit} questões pedidas.
        </DNotice>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DStat label="Geradas hoje" value={usage.today.produced} hint={`${usage.today.batches} lote(s)`} />
        <DStat label="Tokens hoje" value={usage.today.tokens.toLocaleString("pt-BR")} />
        <DStat label="Geradas no mês" value={usage.month.produced} hint={`${usage.month.tokens.toLocaleString("pt-BR")} tokens`} />
        <DStat label="Custo estimado (mês)" value={`US$ ${usage.month.cost.toFixed(4)}`} hint="0 no plano gratuito; configure preços para estimar" />
      </div>

      {staff.roles.autor ? (
        status.configured ? (
          <GenerateForm
            subjects={lk.subjects.filter((s) => s.status === "ativa").map((s) => ({ id: s.id, name: s.name }))}
            topics={lk.topics.filter((t) => t.status === "ativo").map((t) => ({ id: t.id, subject_id: t.subject_id, path: topicPath(lk.topics, t.id) }))}
            boards={lk.boards}
            sources={sources}
            remainingToday={Math.max(0, status.dailyLimit - used)}
          />
        ) : null
      ) : (
        <DNotice tone="erro">Somente autores geram questões.</DNotice>
      )}

      <DCard title="Lotes recentes (consumo)">
        {batches.length === 0 ? (
          <p className="text-[14px] text-white/55">Nenhum lote ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead className="text-left text-white/50">
                <tr>
                  <th className="py-1 pr-3">Quando</th>
                  <th className="py-1 pr-3">Modelo</th>
                  <th className="py-1 pr-3">Questões</th>
                  <th className="py-1 pr-3">Tokens</th>
                  <th className="py-1 pr-3">Tempo</th>
                  <th className="py-1">Situação</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id as string} className="border-t border-white/10">
                    <td className="py-2 pr-3">{fmtDate(b.created_at as string, true)}</td>
                    <td className="py-2 pr-3">{b.provider as string} · {b.model as string}</td>
                    <td className="py-2 pr-3 tabular-nums">{b.produced_count as number}/{b.requested_count as number}</td>
                    <td className="py-2 pr-3 tabular-nums">{((b.input_tokens as number) + (b.output_tokens as number)).toLocaleString("pt-BR")}</td>
                    <td className="py-2 pr-3 tabular-nums">{b.duration_ms ? `${Math.round((b.duration_ms as number) / 1000)}s` : "—"}</td>
                    <td className="py-2">
                      <DBadge tone={STATUS_TONE[b.status as string] ?? "neutro"}>{b.status as string}</DBadge>
                      {b.error ? <span className="ml-2 text-[12px] text-[#ff9b9b]">{String(b.error).slice(0, 80)}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[12px] text-white/45">
          As questões geradas ficam em <Link href="/banco/questoes?origin=ia_assistida&status=aguardando_conferencia" className="text-[#ff8080] underline">Questões › aguardando conferência</Link>.
        </p>
      </DCard>
    </div>
  );
}
