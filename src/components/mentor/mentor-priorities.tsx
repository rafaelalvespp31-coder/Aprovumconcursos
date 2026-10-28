"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { MentorResult } from "@/domain/mentor/engine";
import type { VisibleRecommendation } from "@/domain/mentor/history";
import { mentorStatusAction } from "@/app/(app)/mentor/actions";

/**
 * As prioridades do aluno (com o motivo verificável e o progresso real), com "Dispensar".
 * Usado na página do Mentor e no Mentor flutuante (compacto).
 */
export function MentorPriorities({
  result,
  visible: initialVisible,
  base = "",
  demo = false,
  compact = false,
  onNavigate,
  onExpired,
}: {
  result: MentorResult;
  visible: VisibleRecommendation[];
  base?: string;
  demo?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
  onExpired?: () => void;
}) {
  const [visible, setVisible] = useState(initialVisible);
  const [notice, setNotice] = useState<string | null>(null);
  const href = (h: string) => `${base}${h}`;

  const dismiss = async (r: VisibleRecommendation) => {
    if (!r.storedId) return;
    const before = visible;
    setVisible((v) => v.filter((x) => x.key !== r.key));
    if (demo) return setNotice("Recomendação dispensada (demonstração).");
    const res = await mentorStatusAction(r.storedId, "dispensada").catch(() => ({ ok: false as const, error: "Não foi possível salvar agora." }));
    if (!res.ok) {
      setVisible(before);
      setNotice(res.error);
      if ("expired" in res && res.expired) onExpired?.();
    } else setNotice("Recomendação dispensada. Ela volta se a pendência continuar.");
  };
  const opened = (r: VisibleRecommendation) => {
    if (!demo && r.storedId && r.status === "nova") void mentorStatusAction(r.storedId, "visualizada").catch(() => undefined);
    onNavigate?.();
  };

  // Manutenção não é pendência: com só ela, o aluno está em dia (e ela vira sugestão).
  const actionable = visible.filter((r) => r.kind !== "manutencao");
  const upkeep = visible.filter((r) => r.kind === "manutencao");
  const others = result.all.filter((r) => r.kind !== "manutencao" && !visible.some((v) => v.key === r.key)).slice(0, compact ? 4 : 8);
  const pad = compact ? "p-3" : "p-4";

  if (result.insufficientData)
    return (
      <div data-testid="mentor-sem-dados">
        <p className="text-[14px] font-bold text-[#08090B]">Ainda não tenho dados seus suficientes.</p>
        <p className="mt-1 text-[13px] text-[#64666D]">Comece um estudo ou resolva algumas questões: eu passo a acompanhar o seu progresso real.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={href("/nova-trilha")} onClick={onNavigate} className="pc-botao">
            Começar um estudo <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href={href("/questoes")} onClick={onNavigate} className="mentor-sec">
            Resolver questões
          </Link>
        </div>
      </div>
    );

  return (
    <div>
      {!actionable.length ? (
        <div data-testid="mentor-em-dia">
          <p className="text-[14px] font-bold text-[#08090B]">Você está em dia.</p>
          <p className="mt-1 text-[13px] text-[#64666D]">
            Sem aula pela metade, revisão vencida ou caderno parado.{result.completedLessons.length ? ` Aulas concluídas: ${result.completedLessons.length}.` : ""} Escolha um novo assunto para avançar.
          </p>
          <Link href={href("/trilhas")} onClick={onNavigate} className="pc-botao mt-3">
            Escolher um assunto <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {upkeep.length > 0 && (
            <>
              <h3 className="mt-4 text-[12.5px] font-bold text-[#08090B]">Para manter o nível</h3>
              <ul className="mt-1 divide-y divide-[#ECEDF0]">
                {upkeep.map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#08090B]">{r.explanation}</span>
                      <span className="block text-[12px] text-[#64666D]">{r.reason}</span>
                    </span>
                    <Link href={href(r.href)} onClick={() => opened(r)} className="pc-vertodas shrink-0">
                      {r.actionLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <ol className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`} data-testid="mentor-lista">
          {actionable.map((r, i) => (
            <li key={r.key} className={`rounded-[12px] border border-[#E6E7EB] bg-white ${pad}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#E50914]">
                {i + 1}. {r.title}
              </p>
              <p className={`mt-1 font-bold leading-snug text-[#08090B] ${compact ? "text-[14px]" : "text-[15px]"}`}>{r.explanation}</p>
              <p className="mt-1 text-[12.5px] text-[#64666D]">
                <span className="font-semibold text-[#3A3C42]">Por quê: </span>
                {r.reason}
              </p>
              {r.progress && (
                <div className="mt-2">
                  <span className="pc-barra" role="img" aria-label={r.progress.label}>
                    <span style={{ width: `${r.progress.pct}%` }} />
                  </span>
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Link href={href(r.href)} onClick={() => opened(r)} className={compact ? "pc-botao mentor-botao-p" : "pc-botao"} data-testid="mentor-acao">
                  {r.actionLabel} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                {r.storedId && (
                  <button type="button" onClick={() => void dismiss(r)} className="mentor-dispensar" aria-label={`Dispensar: ${r.explanation}`}>
                    <X className="h-3.5 w-3.5" aria-hidden /> Dispensar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {notice && (
        <p role="status" className="mt-2 text-[12px] text-[#64666D]">
          {notice}
        </p>
      )}
      {others.length > 0 && (
        <>
          <h3 className="mt-4 text-[12.5px] font-bold text-[#08090B]">Outras pendências</h3>
          <ul className="mt-1 divide-y divide-[#ECEDF0]">
            {others.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[#08090B]">{r.explanation}</span>
                  <span className="block text-[12px] text-[#64666D]">{r.reason}</span>
                </span>
                <Link href={href(r.href)} onClick={onNavigate} className="pc-vertodas shrink-0">
                  {r.actionLabel}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
