"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, Flame, Medal, Target, TrendingUp } from "lucide-react";
import type { PeriodoRanking, RankingRow } from "@/server/services/quiz";
import { rankingAction } from "./actions";

const ABAS: Array<{ id: PeriodoRanking; rotulo: string }> = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "semana", rotulo: "Semana" },
  { id: "geral", rotulo: "Geral" },
];
const COR = { 1: "bg-[#F5C542] text-black", 2: "bg-[#C9CED6] text-black", 3: "bg-[#C47A3A] text-black" } as const;
const pct = (r: RankingRow) => (r.answered ? Math.round((r.hits / r.answered) * 100) : 0);

/** XP que sobe de 0 até o valor (só com movimento permitido). */
function Contagem({ valor, atraso = 0 }: { valor: number; atraso?: number }) {
  const [reduz] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [n, setN] = useState(reduz ? valor : 0);
  const ant = useRef(0);
  useEffect(() => {
    if (reduz) return;
    const de = ant.current, ini = performance.now() + atraso, dur = 750;
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - ini) / dur));
      setN(Math.round(de + (valor - de) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(passo); else ant.current = valor;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor, atraso, reduz]);
  return <>{reduz ? valor : n}</>;
}

function Podio({ top }: { top: RankingRow[] }) {
  // ordem visual: 2º, 1º, 3º
  const ordem = [top[1], top[0], top[2]].filter(Boolean) as RankingRow[];
  const alt: Record<number, string> = { 1: "h-[92px]", 2: "h-[68px]", 3: "h-[52px]" };
  return (
    <ol className="mt-4 grid grid-cols-3 items-end gap-2" aria-label="Pódio" data-testid="ranking-podio">
      {ordem.map((r, i) => (
        <li key={r.pos} className="rk-sobe flex flex-col items-center text-center" style={{ animationDelay: `${r.pos === 1 ? 250 : r.pos === 2 ? 100 : 180}ms` }} data-pos={r.pos}>
          {r.pos === 1 && <Crown className="rk-coroa mb-0.5 h-6 w-6 text-[#F5C542]" aria-hidden />}
          <span className={`flex h-11 w-11 items-center justify-center rounded-full text-[17px] font-bold ring-2 ring-white/20 ${COR[r.pos as 1 | 2 | 3]} ${r.isMe ? "ring-4 !ring-white" : ""}`}>
            <Medal className="h-5 w-5" aria-label={`${r.pos}º lugar`} />
          </span>
          <span className="font-hud mt-1 block w-full truncate px-0.5 text-[13px] font-bold">{r.name}{r.isMe ? " (você)" : ""}</span>
          <span className="font-hud text-[11px] text-white/55">{r.hits}/{r.answered} · {pct(r)}%</span>
          <span className={`mt-1.5 flex w-full ${alt[r.pos]} flex-col items-center justify-start rounded-t-[14px] pt-2 ${r.pos === 1 ? "bg-gradient-to-b from-[#E10600] to-[#6E0000]" : "bg-gradient-to-b from-[#2A2A2A] to-[#141414]"} ring-1 ring-white/10`}>
            <span className="font-stencil text-[28px] leading-none">{r.pos}º</span>
            <span className="font-hud mt-1 text-[12px] font-bold tabular-nums"><Contagem valor={r.xp} atraso={400} /> XP</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function RankingPainel({ geral, erro, preview, comNivel }: { geral: RankingRow[] | null; erro: string | null; preview: boolean; comNivel: boolean }) {
  const [periodo, setPeriodo] = useState<PeriodoRanking>("geral");
  const [cache, setCache] = useState<Partial<Record<PeriodoRanking, RankingRow[] | string>>>({});
  const dados = periodo === "geral" ? (erro ?? geral) : cache[periodo] ?? null;

  useEffect(() => {
    if (periodo === "geral" || preview || cache[periodo] !== undefined) return;
    let vivo = true;
    void rankingAction(periodo).then((r) => { if (vivo) setCache((c) => ({ ...c, [periodo]: r.ok ? r.rows : r.error })); });
    return () => { vivo = false; };
  }, [periodo, preview, cache]);

  const rows = Array.isArray(dados) ? dados : null;
  const mensagem = typeof dados === "string" ? dados : null;
  const me = rows?.find((r) => r.isMe);
  const top3 = rows?.filter((r) => r.pos <= 3) ?? [];
  const resto = rows?.filter((r) => r.pos > 3) ?? [];
  const acima = me && me.pos > 1 ? rows?.find((r) => r.pos === me.pos - 1) : null;
  const falta = me && acima ? Math.max(1, acima.xp - me.xp + 1) : 0;
  const total = rows?.[0]?.total ?? 0;

  return (
    <section className="px-4 pb-5 sm:px-6" aria-label="Ranking de todos os alunos" data-testid="ranking-painel">
      <div role="tablist" aria-label="Período do ranking" className="mx-auto mt-1 grid max-w-[360px] grid-cols-3 gap-1 rounded-full bg-white/5 p-1 ring-1 ring-white/10">
        {ABAS.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={periodo === a.id} onClick={() => setPeriodo(a.id)} data-testid={`ranking-aba-${a.id}`}
            className={`font-hud min-h-[40px] rounded-full text-[12.5px] font-bold uppercase tracking-[0.12em] transition-colors ${periodo === a.id ? "bg-[#E10600] text-white shadow-[0_6px_16px_-6px_rgba(225,6,0,.8)]" : "text-white/65 hover:text-white"}`}>
            {a.rotulo}
          </button>
        ))}
      </div>

      {me && (
        <div className="rk-sobe font-hud mt-4 flex items-center gap-3 rounded-[16px] bg-gradient-to-r from-[#D90A00] to-[#7A0000] px-4 py-3 ring-1 ring-white/25" data-testid="ranking-minha-posicao">
          <span className="font-stencil text-[36px] leading-none">{me.pos}º</span>
          <span className="min-w-0 flex-1 text-[13px] leading-snug">
            <b className="block text-[14px]">{me.pos === 1 ? "Você lidera o ranking!" : `Faltam ${falta} XP para o ${me.pos - 1}º lugar`}</b>
            <span className="text-white/80">de {total} aluno{total === 1 ? "" : "s"} • {me.xp} XP • {pct(me)}% de acerto</span>
          </span>
          {me.pos > 1 ? <TrendingUp className="h-5 w-5 shrink-0 text-white/80" aria-hidden /> : <Flame className="h-5 w-5 shrink-0 text-[#F5C542]" aria-hidden />}
        </div>
      )}
      {!me && rows && rows.length > 0 && (
        <p className="font-hud mt-4 rounded-[14px] bg-white/5 px-4 py-3 text-center text-[13px] text-white/75">Você ainda não pontuou {periodo === "hoje" ? "hoje" : periodo === "semana" ? "nesta semana" : "no jogo"}. Acerte uma questão para entrar no ranking.</p>
      )}

      {top3.length > 0 && <Podio top={top3} />}

      <ol className="mt-3 flex flex-col gap-2" start={4} aria-label="Demais posições">
        {dados === null && Array.from({ length: 5 }, (_, i) => <li key={i} className="h-[52px] animate-pulse rounded-[14px] bg-white/5" />)}
        {mensagem && <li className="rounded-[14px] bg-white/5 px-4 py-3 text-[14px] text-white/70">{mensagem}</li>}
        {rows?.length === 0 && <li className="rounded-[14px] bg-white/5 px-4 py-4 text-center text-[14px] text-white/70">Ninguém pontuou {periodo === "hoje" ? "hoje" : periodo === "semana" ? "nesta semana" : "ainda"}. Seja o primeiro.</li>}
        {resto.map((r, i) => {
          const anterior = i === 0 ? 3 : resto[i - 1]!.pos;
          return (
            <li key={r.pos} className="contents">
              {r.pos > anterior + 1 && <span aria-hidden className="font-hud text-center text-[16px] leading-none tracking-[0.5em] text-white/35">• • •</span>}
              <div
                className={`rk-sobe font-hud flex items-center gap-3 rounded-[14px] px-3 py-2.5 ${r.isMe ? "bg-gradient-to-r from-[#D90A00] to-[#7A0000] ring-2 ring-white/30" : "bg-[#141414] ring-1 ring-white/5"}`}
                style={{ animationDelay: `${(comNivel ? 1300 : 120) + i * 55}ms` }}
                data-testid={`ranking-linha-${r.pos}`}
              >
                <span className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-1 text-[14px] font-bold tabular-nums ${r.isMe ? "bg-black/35" : "bg-white/10"}`} aria-label={`${r.pos}º lugar`}>{r.pos}º</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{r.name}{r.isMe ? " (você)" : ""}</span>
                  <span className={`flex items-center gap-1 text-[12px] ${r.isMe ? "text-white/80" : "text-white/50"}`}><Target className="h-3 w-3" aria-hidden />{r.patente} • {r.answered} questões • {pct(r)}%</span>
                  {r.motto && <span className={`block truncate text-[11.5px] italic ${r.isMe ? "text-white/90" : "text-white/60"}`} data-testid="ranking-frase">“{r.motto}”</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[17px] font-bold tabular-nums">{r.xp}</span>
                  <span className={`block text-[11px] ${r.isMe ? "text-white/80" : "text-white/50"}`}>XP</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="font-hud mt-3 text-center text-[11.5px] text-white/60">Posições únicas. Empate no XP: vence quem acertou mais e respondeu menos questões. Só o primeiro nome e a inicial aparecem.</p>
    </section>
  );
}
