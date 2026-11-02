"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  LineChart as LineIcon,
  Repeat,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { BarChart, compact, LineChart } from "./charts";
import { byMonth, byWeek, changePct, PERIODS } from "@/domain/partner/series";
import type { PartnerDashboard } from "@/server/services/partner";
import { visibleSections } from "@/domain/partner/sections";

export type PartnerOk = Extract<PartnerDashboard, { status: "ok" }>;

const n = (v: number) => v.toLocaleString("pt-BR");
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number | null | undefined) =>
  v === null || v === undefined
    ? "—"
    : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")}%`;
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(m) - 1]}/${y!.slice(2)}`;
};
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const PLAN: Record<string, string> = {
  pro: "Pro",
  premium: "Premium",
  free: "Gratuito",
};
const PERIOD: Record<string, string> = {
  mensal: "Mensal",
  semestral: "Semestral",
  anual: "Anual",
};

function Kpi({
  icon,
  label,
  value,
  hint,
  testId,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: ReactNode;
  testId: string;
}) {
  return (
    <div className="bz-card bz-kpi" data-testid={testId}>
      <span className="bz-kpi-ico" aria-hidden>
        {icon}
      </span>
      <p className="bz-kpi-rotulo">{label}</p>
      <p className="bz-kpi-valor">{value}</p>
      {hint && <p className="bz-kpi-dica">{hint}</p>}
    </div>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="bz-secao">
      <div className="bz-secao-topo">
        <h2 id={`${id}-t`}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * APROVUM BUSINESS — indicadores do sócio. Recebe SÓ o que o banco liberou: o que não veio
 * (permissão desativada) não é desenhado, nem como zero.
 */
export function BusinessDashboard({
  data,
  period,
  base = "/business",
}: {
  data: PartnerOk;
  period: number;
  base?: string;
}) {
  const [grain, setGrain] = useState<"dia" | "semana" | "mes">("dia");
  const sections = visibleSections(data);
  const novos = (data.serie_cadastros ?? []).map((p) => ({
    dia: p.dia,
    valor: p.novos,
  }));
  const grouped =
    grain === "dia"
      ? novos
      : grain === "semana"
        ? byWeek(novos)
        : byMonth(novos);
  const groupedPoints = grouped.map((p) => ({
    label: grain === "mes" ? monthLabel(p.dia) : dayLabel(p.dia),
    value: p.valor,
  }));
  const comp =
    data.periodo_atual !== undefined && data.periodo_anterior !== undefined
      ? changePct(data.periodo_atual, data.periodo_anterior)
      : null;
  const periodLabel =
    PERIODS.find((p) => p.days === period)?.label ?? `${period} dias`;

  return (
    <div className="flex flex-col gap-8" data-testid="business-dashboard">
      <div className="bz-filtros" role="group" aria-label="Período">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`${base}${base.includes("?") ? "&" : "?"}periodo=${p.key}`}
            className={p.days === period ? "is-on" : ""}
            aria-current={p.days === period ? "true" : undefined}
            scroll={false}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {sections.size === 0 && (
        <div
          className="bz-card bz-estado"
          data-testid="business-sem-permissoes"
        >
          <p className="font-bold text-white">
            Nenhum indicador liberado ainda.
          </p>
          <p>
            O administrador do APROVUM escolhe quais indicadores aparecem aqui.
            Assim que liberar, eles surgem nesta tela automaticamente.
          </p>
        </div>
      )}

      {sections.has("visao-geral") && (
        <Section
          id="visao-geral"
          title="Visão geral"
          subtitle="Alunos da plataforma (contas da equipe e de sócios não entram)."
        >
          <div className="bz-grade">
            {data.total_cadastrados !== undefined && (
              <Kpi
                testId="kpi-total"
                icon={<Users />}
                label="Alunos cadastrados"
                value={n(data.total_cadastrados)}
              />
            )}
            {data.usuarios_ativos_30d !== undefined && (
              <Kpi
                testId="kpi-ativos"
                icon={<UserCheck />}
                label="Ativos (30 dias)"
                value={n(data.usuarios_ativos_30d)}
                hint="Entraram, responderam ou estudaram nos últimos 30 dias"
              />
            )}
            {data.usuarios_inativos_30d !== undefined && (
              <Kpi
                testId="kpi-inativos"
                icon={<UserMinus />}
                label="Inativos (30 dias)"
                value={n(data.usuarios_inativos_30d)}
                hint="Sem nenhuma atividade nos últimos 30 dias"
              />
            )}
            {data.cadastros_hoje !== undefined && (
              <Kpi
                testId="kpi-hoje"
                icon={<UserPlus />}
                label="Novos hoje"
                value={n(data.cadastros_hoje)}
              />
            )}
            {data.cadastros_7d !== undefined && (
              <Kpi
                testId="kpi-7d"
                icon={<UserPlus />}
                label="Novos em 7 dias"
                value={n(data.cadastros_7d)}
              />
            )}
            {data.cadastros_30d !== undefined && (
              <Kpi
                testId="kpi-30d"
                icon={<UserPlus />}
                label="Novos em 30 dias"
                value={n(data.cadastros_30d)}
              />
            )}
            {data.crescimento_mensal_pct !== undefined && (
              <Kpi
                testId="kpi-crescimento"
                icon={
                  (data.crescimento_mensal_pct ?? 0) < 0 ? (
                    <TrendingDown />
                  ) : (
                    <TrendingUp />
                  )
                }
                label="Crescimento mensal"
                value={pct(data.crescimento_mensal_pct)}
                hint={
                  data.crescimento_mensal_pct === null
                    ? "Sem cadastros nos 30 dias anteriores para comparar"
                    : "Novos cadastros: últimos 30 dias × 30 dias anteriores"
                }
              />
            )}
          </div>
        </Section>
      )}

      {sections.has("crescimento") && (
        <Section
          id="crescimento"
          title="Crescimento da plataforma"
          subtitle={`Período: ${periodLabel}.`}
        >
          {data.serie_cadastros && (
            <div className="bz-card">
              <div className="bz-card-topo">
                <h3>Novos cadastros</h3>
                <div
                  className="bz-abas"
                  role="tablist"
                  aria-label="Agrupar por"
                >
                  {(
                    [
                      ["dia", "Diário"],
                      ["semana", "Semanal"],
                      ["mes", "Mensal"],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={grain === k}
                      className={grain === k ? "is-on" : ""}
                      onClick={() => setGrain(k)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <BarChart
                points={groupedPoints}
                title={`Novos cadastros por ${grain === "dia" ? "dia" : grain === "semana" ? "semana" : "mês"}`}
              />
              {data.periodo_atual !== undefined && (
                <p className="bz-comparacao" data-testid="comparacao-periodos">
                  <b>{n(data.periodo_atual)}</b> novos neste período ×{" "}
                  <b>{n(data.periodo_anterior ?? 0)}</b> no período anterior{" "}
                  <span
                    className={
                      comp === null ? "" : comp >= 0 ? "bz-sobe" : "bz-desce"
                    }
                  >
                    ({comp === null ? "sem base de comparação" : pct(comp)})
                  </span>
                </p>
              )}
            </div>
          )}
          {data.serie_base && (
            <div className="bz-card">
              <div className="bz-card-topo">
                <h3>Evolução da base total de alunos</h3>
              </div>
              <LineChart
                title="Base total de alunos"
                series={[
                  {
                    name: "Alunos",
                    color: "#E50914",
                    points: data.serie_base.map((p) => ({
                      label: dayLabel(p.dia),
                      value: p.total,
                    })),
                  },
                ]}
              />
            </div>
          )}
        </Section>
      )}

      {sections.has("comercial") && (
        <Section
          id="comercial"
          title="Indicadores comerciais"
          subtitle="Somente pagamentos confirmados pelo administrador."
        >
          <div className="bz-grade">
            {data.pagantes !== undefined && (
              <Kpi
                testId="kpi-pagantes"
                icon={<BadgeDollarSign />}
                label="Assinantes pagantes"
                value={n(data.pagantes)}
                hint="Pagamento confirmado e plano vigente"
              />
            )}
            {data.assinaturas_ativas !== undefined && (
              <Kpi
                testId="kpi-ass-ativas"
                icon={<Repeat />}
                label="Assinaturas ativas"
                value={n(data.assinaturas_ativas)}
              />
            )}
            {data.assinaturas_vencidas !== undefined && (
              <Kpi
                testId="kpi-ass-vencidas"
                icon={<UserMinus />}
                label="Assinaturas vencidas"
                value={n(data.assinaturas_vencidas)}
                hint="Já pagaram e hoje estão sem plano vigente"
              />
            )}
            {data.assinaturas_mensais !== undefined && (
              <Kpi
                testId="kpi-mensais"
                icon={<BarChart3 />}
                label="Mensais"
                value={n(data.assinaturas_mensais)}
              />
            )}
            {data.assinaturas_semestrais !== undefined && (
              <Kpi
                testId="kpi-semestrais"
                icon={<BarChart3 />}
                label="Semestrais"
                value={n(data.assinaturas_semestrais)}
              />
            )}
            {data.assinaturas_anuais !== undefined && (
              <Kpi
                testId="kpi-anuais"
                icon={<BarChart3 />}
                label="Anuais"
                value={n(data.assinaturas_anuais)}
              />
            )}
            {data.taxa_conversao_pct !== undefined && (
              <Kpi
                testId="kpi-conversao"
                icon={<TrendingUp />}
                label="Conversão gratuito → pagante"
                value={
                  data.taxa_conversao_pct === null
                    ? "—"
                    : `${data.taxa_conversao_pct.toLocaleString("pt-BR")}%`
                }
              />
            )}
            {data.faturamento_periodo_cents !== undefined && (
              <Kpi
                testId="kpi-faturamento"
                icon={<BadgeDollarSign />}
                label={`Faturamento (${periodLabel})`}
                value={brl(data.faturamento_periodo_cents)}
                hint={
                  data.pagamentos_sem_valor
                    ? `${data.pagamentos_sem_valor} pagamento(s) sem valor informado`
                    : "Soma dos pagamentos registrados"
                }
              />
            )}
          </div>
          {data.faturamento_mensal && (
            <div className="bz-card">
              <div className="bz-card-topo">
                <h3>Faturamento por mês (12 meses)</h3>
              </div>
              <BarChart
                points={data.faturamento_mensal.map((m) => ({
                  label: monthLabel(m.mes),
                  value: m.cents,
                }))}
                title="Faturamento por mês"
                format={brl}
                axisFormat={(c) => `R$ ${compact(c / 100)}`}
              />
            </div>
          )}
          {data.lista_pagantes && (
            <div className="bz-card" data-testid="lista-pagantes">
              <div className="bz-card-topo">
                <h3>Assinantes ({n(data.lista_pagantes.length)})</h3>
              </div>
              {data.lista_pagantes.length ? (
                <div className="bz-tabela">
                  <table>
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>Plano</th>
                        <th>Período</th>
                        <th>Vence em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lista_pagantes.map((p, i) => (
                        <tr key={i}>
                          <td>
                            {p.nome}
                            <span className="block text-[11.5px] text-white/50">
                              {p.email}
                            </span>
                          </td>
                          <td>{PLAN[p.plano] ?? p.plano}</td>
                          <td>{PERIOD[p.periodo] ?? p.periodo}</td>
                          <td>{date(p.vence)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="bz-vazio">Nenhum assinante pagante no momento.</p>
              )}
            </div>
          )}
          {data.historico_pagamentos && (
            <div className="bz-card" data-testid="historico-pagamentos">
              <div className="bz-card-topo">
                <h3>Histórico de pagamentos</h3>
              </div>
              {data.historico_pagamentos.length ? (
                <div className="bz-tabela">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Aluno</th>
                        <th>Plano</th>
                        <th>Período</th>
                        {data.historico_pagamentos.some(
                          (h) => "valor_cents" in h,
                        ) && <th>Valor</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.historico_pagamentos.map((h, i) => (
                        <tr key={i}>
                          <td>{date(h.pago_em)}</td>
                          <td>{h.nome}</td>
                          <td>{PLAN[h.plano] ?? h.plano}</td>
                          <td>{PERIOD[h.periodo] ?? h.periodo}</td>
                          {"valor_cents" in h && (
                            <td>
                              {h.valor_cents === null ||
                              h.valor_cents === undefined
                                ? "—"
                                : brl(h.valor_cents)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="bz-vazio">Nenhum pagamento registrado ainda.</p>
              )}
            </div>
          )}
        </Section>
      )}

      {sections.has("desempenho") && (
        <Section
          id="desempenho"
          title="Desempenho da plataforma"
          subtitle={`Período: ${periodLabel}. Só atividade registrada de verdade (entradas, respostas, Modo Jogo e aulas).`}
        >
          <div className="bz-grade">
            <Kpi
              testId="kpi-ativos-periodo"
              icon={<Activity />}
              label="Usuários ativos no período"
              value={n(data.ativos_periodo ?? 0)}
            />
            <Kpi
              testId="kpi-frequencia"
              icon={<LineIcon />}
              label="Frequência de acesso"
              value={
                data.dias_ativos_media === null ||
                data.dias_ativos_media === undefined
                  ? "—"
                  : `${data.dias_ativos_media.toLocaleString("pt-BR")} dias`
              }
              hint="Média de dias com atividade por aluno ativo"
            />
            <Kpi
              testId="kpi-retornaram"
              icon={<Repeat />}
              label="Retornaram"
              value={n(data.retornaram ?? 0)}
              hint="Ativos em 2 dias ou mais no período"
            />
            {data.respostas_periodo !== undefined && (
              <Kpi
                testId="kpi-respostas"
                icon={<BarChart3 />}
                label="Questões respondidas"
                value={n(data.respostas_periodo)}
                hint="Aulas, banco de questões e Modo Jogo"
              />
            )}
          </div>
          {data.serie_ativos && (
            <div className="bz-card">
              <div className="bz-card-topo">
                <h3>Alunos ativos por dia</h3>
              </div>
              <LineChart
                title="Alunos ativos por dia"
                series={[
                  {
                    name: "Ativos",
                    color: "#FF6B5E",
                    points: data.serie_ativos.map((p) => ({
                      label: dayLabel(p.dia),
                      value: p.ativos,
                    })),
                  },
                ]}
              />
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
