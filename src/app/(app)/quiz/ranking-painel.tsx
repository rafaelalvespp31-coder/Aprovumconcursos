"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Crown, Flame, Radio, Swords, Target, TrendingUp, Users } from "lucide-react";
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

const inicial = (n: string) => (n.trim().charAt(0) || "A").toUpperCase();
const TOM: Record<number, { anel: string; fundo: string; rotulo: string }> = {
  1: { anel: "ring-[#F5C542]", fundo: "from-[#F5C542] to-[#B8860B]", rotulo: "OURO" },
  2: { anel: "ring-[#C9CED6]", fundo: "from-[#E3E7EE] to-[#8A93A0]", rotulo: "PRATA" },
  3: { anel: "ring-[#C47A3A]", fundo: "from-[#E09A55] to-[#8A4B17]", rotulo: "BRONZE" },
};

function Podio({ top, aberto, aoAbrir }: { top: RankingRow[]; aberto: number | null; aoAbrir: (p: number) => void }) {
  const ordem = [top[1], top[0], top[2]].filter(Boolean) as RankingRow[]; // 2º, 1º, 3º
  const alt: Record<number, string> = { 1: "h-[104px]", 2: "h-[78px]", 3: "h-[60px]" };
  return (
    <ol className="relative mt-5 grid grid-cols-3 items-end gap-2" aria-label="Pódio" data-testid="ranking-podio">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_bottom,rgba(225,6,0,.28),transparent_70%)]" />
      {ordem.map((r) => {
        const t = TOM[r.pos]!;
        return (
          <li key={r.pos} className="rk-sobe relative flex flex-col items-center text-center" style={{ animationDelay: `${r.pos === 1 ? 250 : r.pos === 2 ? 100 : 180}ms` }} data-pos={r.pos}>
            {r.pos === 1 && <Crown className="rk-coroa mb-0.5 h-7 w-7 text-[#F5C542]" aria-hidden />}
            <button type="button" onClick={() => aoAbrir(r.pos)} aria-expanded={aberto === r.pos} aria-label={`${r.pos}º lugar, ${r.name}. Ver detalhes`} className="group flex flex-col items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30]">
              <span className={`relative flex ${r.pos === 1 ? "h-16 w-16" : "h-13 w-13"} items-center justify-center rounded-full bg-gradient-to-br ${t.fundo} font-stencil text-[24px] text-black ring-[3px] ${t.anel} shadow-[0_8px_22px_-6px_rgba(0,0,0,.8)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${r.isMe ? "outline outline-[3px] outline-offset-2 outline-white" : ""}`} style={r.pos !== 1 ? { width: 52, height: 52 } : undefined}>
                {inicial(r.name)}
                <span className="font-hud absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black px-1.5 py-px text-[8.5px] font-bold tracking-[0.14em] text-white ring-1 ring-white/25">{t.rotulo}</span>
              </span>
              <span className="font-hud mt-3 block w-full max-w-[110px] truncate text-[13px] font-bold">{r.name}{r.isMe ? " (você)" : ""}</span>
              <span className="font-hud text-[11px] text-white/55">{pct(r)}% de acerto</span>
            </button>
            <span className={`rk-degrau relative mt-2 flex w-full ${alt[r.pos]} flex-col items-center justify-start overflow-hidden rounded-t-[14px] pt-2.5 ring-1 ring-white/10 ${r.pos === 1 ? "bg-gradient-to-b from-[#E10600] to-[#5E0000]" : "bg-gradient-to-b from-[#2C2C2C] to-[#121212]"}`}>
              {r.pos === 1 && <span aria-hidden className="rk-brilho absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" />}
              <span className="font-stencil relative text-[30px] leading-none">{r.pos}º</span>
              <span className="font-hud relative mt-1 text-[12.5px] font-bold tabular-nums"><Contagem valor={r.xp} atraso={400} /> XP</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Detalhe({ r }: { r: RankingRow }) {
  const p = pct(r);
  return (
    <div className="rk-abre font-hud mt-2 grid gap-2 border-t border-white/10 pt-2 text-[12px]" data-testid={`ranking-detalhe-${r.pos}`}>
      <div className="flex items-center justify-between text-white/70"><span>Acertos</span><b className="text-white tabular-nums">{r.hits} de {r.answered}</b></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${p}% de acerto`}>
        <span className="rk-barra block h-full rounded-full bg-gradient-to-r from-[#E10600] to-[#FF6A3D]" style={{ width: `${p}%` }} />
      </div>
      <div className="flex items-center justify-between text-white/70"><span>Patente</span><b className="text-white">{r.patente}</b></div>
      {r.motto && <p className="italic text-white/70">“{r.motto}”</p>}
    </div>
  );
}

export function RankingPainel({ geral, erro, preview, comNivel }: { geral: RankingRow[] | null; erro: string | null; preview: boolean; comNivel: boolean }) {
  const [periodo, setPeriodo] = useState<PeriodoRanking>("geral");
  const [aberto, setAberto] = useState<number | null>(null);
  const [cache, setCache] = useState<Partial<Record<PeriodoRanking, RankingRow[] | string>>>({});
  const dados = periodo === "geral" ? (erro ?? geral) : cache[periodo] ?? null;
  const trocar = (p: PeriodoRanking) => { setPeriodo(p); setAberto(null); };
  const alternar = (pos: number) => setAberto((a) => (a === pos ? null : pos));

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
  const disputa = me && acima && acima.xp > 0 ? Math.min(100, Math.round((me.xp / acima.xp) * 100)) : 100;
  const idx = ABAS.findIndex((a) => a.id === periodo);
  const detalheTop = aberto !== null && aberto <= 3 ? rows?.find((r) => r.pos === aberto) : null;

  return (
    <section className="px-4 pb-5 sm:px-6" aria-label="Ranking de todos os alunos" data-testid="ranking-painel">
      <div role="tablist" aria-label="Período do ranking" className="relative mx-auto mt-1 grid max-w-[380px] grid-cols-3 rounded-full bg-white/5 p-1 ring-1 ring-white/10">
        <span aria-hidden className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-[#E10600] shadow-[0_6px_16px_-6px_rgba(225,6,0,.8)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none" style={{ transform: `translateX(${idx * 100}%)` }} />
        {ABAS.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={periodo === a.id} onClick={() => trocar(a.id)} data-testid={`ranking-aba-${a.id}`}
            className={`font-hud relative z-10 min-h-[42px] rounded-full text-[12.5px] font-bold uppercase tracking-[0.12em] transition-colors ${periodo === a.id ? "text-white" : "text-white/60 hover:text-white"}`}>
            {a.rotulo}
          </button>
        ))}
      </div>

      {rows && rows.length > 0 && (
        <div className="rk-sobe mt-4 grid grid-cols-3 gap-2 text-center" data-testid="ranking-resumo">
          {[
            { Icon: Users, v: String(total), l: "alunos" },
            { Icon: Flame, v: me ? `${me.xp}` : "—", l: "seu XP" },
            { Icon: Target, v: me ? `${pct(me)}%` : "—", l: "acerto" },
          ].map(({ Icon, v, l }) => (
            <div key={l} className="relative overflow-hidden rounded-[14px] bg-[#141414] px-2 py-2.5 ring-1 ring-white/10">
              <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-[#E10600]" />
              <Icon className="mx-auto h-4 w-4 text-[#FF3B30]" aria-hidden />
              <b className="font-stencil mt-0.5 block text-[22px] leading-none tabular-nums">{v}</b>
              <span className="font-hud text-[10.5px] uppercase tracking-[0.14em] text-white/55">{l}</span>
            </div>
          ))}
        </div>
      )}

      {me && (
        <div className="rk-sobe font-hud relative mt-3 overflow-hidden rounded-[18px] bg-gradient-to-br from-[#D90A00] to-[#6E0000] p-3.5 ring-1 ring-white/25" data-testid="ranking-minha-posicao">
          <span aria-hidden className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="font-stencil text-[42px] leading-none">{me.pos}º</span>
            <span className="min-w-0 flex-1 text-[13px] leading-snug">
              <b className="block text-[14.5px]">{me.pos === 1 ? "Você lidera o ranking!" : `Faltam ${falta} XP para o ${me.pos - 1}º lugar`}</b>
              <span className="text-white/80">{me.pos === 1 ? "Continue pontuando para manter a liderança." : `Rival: ${acima?.name}`}</span>
            </span>
            {me.pos > 1 ? <Swords className="h-6 w-6 shrink-0 text-white/85" aria-hidden /> : <Flame className="rk-coroa h-6 w-6 shrink-0 text-[#F5C542]" aria-hidden />}
          </div>
          {me.pos > 1 && (
            <div className="relative mt-3" aria-label={`Você tem ${disputa}% do XP do rival`}>
              <div className="h-2 overflow-hidden rounded-full bg-black/35"><span className="rk-barra block h-full rounded-full bg-white" style={{ width: `${disputa}%` }} /></div>
              <div className="mt-1 flex justify-between text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/75"><span>Você {me.xp} XP</span><span>{acima?.xp} XP</span></div>
            </div>
          )}
        </div>
      )}
      {!me && rows && rows.length > 0 && (
        <p className="font-hud mt-3 rounded-[14px] bg-white/5 px-4 py-3 text-center text-[13px] text-white/75">Você ainda não pontuou {periodo === "hoje" ? "hoje" : periodo === "semana" ? "nesta semana" : "no jogo"}. Acerte uma questão para entrar no ranking.</p>
      )}

      {top3.length > 0 && <Podio top={top3} aberto={aberto} aoAbrir={alternar} />}
      {detalheTop && <div className="rounded-b-[14px] bg-[#141414] px-3 pb-3 ring-1 ring-white/10"><Detalhe r={detalheTop} /></div>}

      <ol className="mt-3 flex flex-col gap-2" start={4} aria-label="Demais posições">
        {dados === null && Array.from({ length: 5 }, (_, i) => <li key={i} className="h-[56px] animate-pulse rounded-[14px] bg-white/5" />)}
        {mensagem && <li className="rounded-[14px] bg-white/5 px-4 py-3 text-[14px] text-white/70">{mensagem}</li>}
        {rows?.length === 0 && <li className="rounded-[14px] bg-white/5 px-4 py-4 text-center text-[14px] text-white/70">Ninguém pontuou {periodo === "hoje" ? "hoje" : periodo === "semana" ? "nesta semana" : "ainda"}. Seja o primeiro.</li>}
        {resto.map((r, i) => {
          const anterior = i === 0 ? 3 : resto[i - 1]!.pos;
          const on = aberto === r.pos;
          return (
            <li key={r.pos} className="contents">
              {r.pos > anterior + 1 && <span aria-hidden className="font-hud text-center text-[16px] leading-none tracking-[0.5em] text-white/35">• • •</span>}
              <div
                className={`rk-sobe font-hud rounded-[14px] transition-colors ${r.isMe ? "bg-gradient-to-r from-[#D90A00] to-[#7A0000] ring-2 ring-white/30" : on ? "bg-[#1C1C1C] ring-1 ring-[#E10600]/60" : "bg-[#141414] ring-1 ring-white/5 hover:ring-white/20"}`}
                style={{ animationDelay: `${(comNivel ? 1300 : 120) + i * 55}ms` }}
                data-testid={`ranking-linha-${r.pos}`}
              >
                <button type="button" onClick={() => alternar(r.pos)} aria-expanded={on} className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30] active:scale-[0.99]">
                  <span className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-1 text-[14px] font-bold tabular-nums ${r.isMe ? "bg-black/35" : "bg-white/10"}`} aria-label={`${r.pos}º lugar`}>{r.pos}º</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{r.name}{r.isMe ? " (você)" : ""}</span>
                    <span className={`block truncate text-[12px] ${r.isMe ? "text-white/80" : "text-white/50"}`}>{r.patente} • {r.answered} questões</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[17px] font-bold tabular-nums">{r.xp}</span>
                    <span className={`block text-[11px] ${r.isMe ? "text-white/80" : "text-white/50"}`}>XP</span>
                  </span>
                  <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-white/50 transition-transform duration-200 ${on ? "rotate-180" : ""}`} />
                </button>
                {on && <div className="px-3 pb-3"><Detalhe r={r} /></div>}
                {!on && r.motto && <p className={`truncate px-3 pb-2 -mt-1 text-[11.5px] italic ${r.isMe ? "text-white/90" : "text-white/55"}`} data-testid="ranking-frase">“{r.motto}”</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="font-hud mt-4 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-white/55"><Radio className="h-3 w-3 text-[#FF3B30]" aria-hidden />Atualizado ao abrir • empate no XP: acertos, depois menos questões. Só primeiro nome e inicial aparecem.</p>
    </section>
  );
}
