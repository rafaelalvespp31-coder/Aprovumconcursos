"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { taticoEntrarAction, taticoEstadoAction, taticoResponderAction, taticoRevisaoAction, taticoSairFilaAction } from "./actions";
import type { TaticoEstado, TaticoQuestao, TaticoRevisao, TaticoStats } from "@/server/services/tatico";
import "./tatico.css";

type Partida = Extract<TaticoEstado, { estado: "partida" }>;
const LETRAS = ["A", "B", "C", "D"] as const;
const TG_X = [591, 765, 938, 1108];
const OPT_POS = [{ l: 442, t: 168, h: 104 }, { l: 846, t: 168, h: 104 }, { l: 442, t: 282, h: 90 }, { l: 846, t: 282, h: 90 }];
const W = 1672, H = 941;

const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const fs = (txt: string, base: number, min: number, soft: number) => Math.max(min, base - Math.max(0, txt.length - soft) * 0.07);

function useEscala(portrait: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  // retrato: recorta a faixa central (alvos + braço) e a pergunta vira DOM
  const faixa = portrait ? { x: 420, y: 400, w: 830, h: 541 } : { x: 0, y: 0, w: W, h: H };
  const k = w / faixa.w;
  return { ref, k, faixa, boxH: faixa.h * k };
}

export function Cena({ s, at, nivel, noFx, portrait, onShoot, shot }: { s: Partida; at: number; nivel: { level: number; into: number }; noFx: boolean; portrait: boolean; onShoot: (i: number) => void; shot: { i: number; n: number; hit: boolean | null } | null }) {
  const { ref, k, faixa, boxH } = useEscala(portrait);
  const [now, setNow] = useState(0);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);
  const ms = Math.max(0, s.msRestantes - Math.max(0, now - at));
  const q = s.question; const rev = s.phase === "revelar" || s.phase === "fim";
  const bloqueado = s.phase !== "responder" || s.me.answered || !!shot;
  const mira = shot ? (TG_X[shot.i]! - 840) / 55 : 0;
  const cls = (l: string, base: string) => {
    if (rev && q?.correct) { if (l === q.correct) return `${base} ok`; if (l === s.me.choice) return `${base} no`; return `${base} dim`; }
    if (s.me.choice === l || (shot && LETRAS[shot.i] === l)) return `${base} sel`;
    return base;
  };
  const tgCls = (l: string) => {
    if (rev && q?.correct) return l === q.correct ? "ok" : l === s.me.choice ? "no" : "";
    return "";
  };
  return (
    <div className={`tt-wrap ${noFx ? "tt-fx-off" : ""}`}>
      <div ref={ref} className="tt-box" style={{ height: boxH || undefined }} data-testid="tatico-cena">
        <div className="tt-stage" style={{ transform: `scale(${k}) translate(${-faixa.x}px,${-faixa.y}px)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tt-bg" src="/tatico/estande.webp" alt="" draggable={false} />
          {s.phase === "responder" && q?.tiebreak && <div className="tt-sd" />}
          {/* HUD */}
          {!portrait && (
            <>
              <div className="tt-panel tt-hud-l">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tatico/caveira.webp" alt="" />
                <div><div className="tt-lbl">PONTUAÇÃO</div><div className="tt-big">{s.me.hits}<small>ACERTOS</small></div></div>
              </div>
              <div className="tt-panel tt-seq"><div className="tt-lbl">SEQUÊNCIA</div><div className="tt-big">{s.me.streak}x</div></div>
              <div className={`tt-panel red tt-timer ${s.phase === "responder" && ms < 6000 ? "low" : ""}`} data-testid="tatico-timer">
                <svg width="46" height="52" viewBox="0 0 24 28" fill="none" stroke="#e5202e" strokeWidth="2"><circle cx="12" cy="16" r="9" /><path d="M12 16V10M9 2h6M12 2v5M20 6l2 2" /></svg>
                <div className="tt-big">{s.phase === "responder" ? mmss(ms) : "--:--"}</div>
              </div>
              <div className="tt-panel tt-vs"><span>VS {s.opp.name}</span><em>{s.me.hits} x {s.opp.hits}</em></div>
              {q && (
                <>
                  <div className="tt-panel red tt-q">QUESTÃO <b>{String(Math.min(q.pos, s.total)).padStart(2, "0")}/{String(s.total).padStart(2, "0")}</b>{q.tiebreak ? " · MORTE SÚBITA" : ""}</div>
                  <div className="tt-panel tt-enun" style={{ fontSize: fs(q.statement, 22, 12, 90) }}>{q.statement}</div>
                  {q.options.map((o, i) => (
                    <button key={o.label} disabled={bloqueado} className={cls(o.label, "tt-panel tt-opt")} style={{ left: OPT_POS[i]!.l, top: OPT_POS[i]!.t, height: OPT_POS[i]!.h, fontSize: fs(o.text, 19, 11, 70) }} onClick={() => onShoot(i)} data-testid={`tatico-op-${o.label}`}>
                      <span className="lt">{o.label}</span><span className="tx">{o.text}</span>
                    </button>
                  ))}
                </>
              )}
              <div className="tt-panel tt-xp">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tatico/soldado.webp" alt="" />
                <div className="tt-lbl" style={{ color: "#fff" }}>NÍVEL {nivel.level}</div>
                <div className="bar"><i style={{ width: `${nivel.into * 10}%` }} /></div>
                <div style={{ fontSize: 18, marginTop: 4 }}><b>{nivel.into}</b> / 10 QUESTÕES</div>
              </div>
              <div className="tt-panel tt-ammo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tatico/glock.webp" alt="" />
                <div><div className="tt-lbl">GLOCK G17</div><div className="n">{Math.max(0, s.total - Math.max(0, s.idx - (rev || s.me.answered ? 0 : 1)))}<small> / {s.total}</small></div></div>
              </div>
            </>
          )}
          {/* alvos */}
          {q && LETRAS.map((l, i) => (
            <button key={l} disabled={bloqueado} aria-label={`Atirar no alvo ${l}`} className={`tt-tg ${tgCls(l)} ${shot?.i === i && shot.hit === false ? "swing" : ""}`} style={{ left: TG_X[i]! - 56, backgroundImage: `url(/tatico/alvo${i}.webp)` }} onClick={() => onShoot(i)}>
              <span className="lt">{l}</span>
              {shot?.i === i && (<><i className="tt-hole" style={{ left: 56, top: 72 }} key={`h${shot.n}`} /><i className="tt-spark" style={{ left: 56, top: 72 }} key={`s${shot.n}`} /></>)}
            </button>
          ))}
          {/* braço + efeitos */}
          <div key={shot?.n ?? 0} className={`tt-arm ${shot ? "fire" : "idle"}`} style={{ ["--aim" as string]: `${mira}deg`, transform: `rotate(${mira}deg) translateY(${shot ? 0 : -6}px)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tatico/braco.webp" alt="" draggable={false} />
          </div>
          {shot && !noFx && (
            <div key={`fx${shot.n}`}>
              <i className="tt-flash" style={{ left: 840 + mira * 6, top: 590 }} />
              <i className="tt-shell" style={{ left: 870, top: 600 }} />
              <i className="tt-smoke" style={{ left: 840 + mira * 6, top: 585 }} />
            </div>
          )}
          {rev && q?.correct && !portrait && (
            <div className="tt-panel red tt-reveal"><b>Gabarito: {q.correct}.</b> {(q.explanations?.[q.correct] || q.justification || "").toString().slice(0, 260)}</div>
          )}
          {s.phase === "responder" && s.me.answered && !rev && <div className="tt-wait">AGUARDANDO O ADVERSÁRIO…</div>}
          {s.phase === "contagem" && <div className="tt-cd"><span key={Math.ceil(ms / 1000)}>{Math.max(1, Math.ceil(ms / 1000) - 5) > 3 ? "PREPARAR" : Math.max(1, Math.ceil(ms / 1000))}</span></div>}
        </div>
      </div>
      {portrait && q && (
        <div className="tt-m-q" style={{ margin: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, color: "#e5202e" }}>
            <span>QUESTÃO {String(Math.min(q.pos, s.total)).padStart(2, "0")}/{s.total}{q.tiebreak ? " · MORTE SÚBITA" : ""}</span>
            <span data-testid="tatico-timer">{s.phase === "responder" ? mmss(ms) : "--:--"}</span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.35, margin: "8px 0 4px", color: "#fff" }}>{q.statement}</p>
          <div style={{ fontSize: 12, color: "#bbb" }}>VS {s.opp.name} · {s.me.hits} x {s.opp.hits} · sequência {s.me.streak}x</div>
          {q.options.map((o, i) => (
            <button key={o.label} disabled={bloqueado} className={cls(o.label, "tt-m-opt")} onClick={() => onShoot(i)}><span className="lt">{o.label}</span><span>{o.text}</span></button>
          ))}
          {rev && q.correct && <p style={{ fontSize: 13, marginTop: 8, color: "#ddd" }}><b style={{ color: "#28d46a" }}>Gabarito: {q.correct}.</b> {(q.explanations?.[q.correct] || q.justification || "").toString().slice(0, 300)}</p>}
        </div>
      )}
    </div>
  );
}

export function TaticoView({ inicial, nivel, stats }: { inicial: { usados: number; limite: number }; nivel: { level: number; into: number }; stats: TaticoStats }) {
  const [s, setSraw] = useState<TaticoEstado>({ estado: "ocioso", ...inicial });
  const [at, setAt] = useState(0);
  const setS = useCallback((v: TaticoEstado) => { setAt(Date.now()); setSraw(v); }, []);
  const [erro, setErro] = useState<string | null>(null);
  const [shot, setShot] = useState<{ i: number; n: number; hit: boolean | null } | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [noFx, setNoFx] = useState(false);
  const [rev, setRev] = useState<TaticoRevisao>(null);
  const pos = useRef<number>(-1);
  const busy = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)"); const f = () => setPortrait(mq.matches); f(); mq.addEventListener("change", f);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência lida só no cliente
    setNoFx(localStorage.getItem("tt-fx") === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => mq.removeEventListener("change", f);
  }, []);

  // sondagem: o servidor é a fonte de verdade do tempo, das fases e do placar
  const ativo = s.estado === "fila" || s.estado === "partida";
  const fim = s.estado === "partida" && s.phase === "fim";
  useEffect(() => {
    if (!ativo || fim) return;
    const t = setInterval(async () => {
      if (busy.current) return; busy.current = true;
      const r = await taticoEstadoAction(s.estado === "partida" ? s.match : undefined); busy.current = false;
      if (r.ok) setS(r.s);
    }, 1000);
    return () => clearInterval(t);
  }, [ativo, fim, s, setS]);

  const q: TaticoQuestao | null = s.estado === "partida" ? s.question : null;
  useEffect(() => { if (q && q.pos !== pos.current) { pos.current = q.pos; setShot(null); } }, [q]);
  useEffect(() => { if (fim && s.estado === "partida") taticoRevisaoAction(s.match).then(setRev); }, [fim, s]);
  useEffect(() => {
    if (s.estado !== "fila") return;
    const sair = () => { void taticoSairFilaAction(); };
    window.addEventListener("pagehide", sair); return () => window.removeEventListener("pagehide", sair);
  }, [s.estado]);

  const entrar = useCallback(async () => {
    setErro(null); const r = await taticoEntrarAction();
    if (!r.ok) setErro(r.error); else setS(r.s);
  }, [setS]);
  const atirar = useCallback(async (i: number) => {
    if (s.estado !== "partida" || s.phase !== "responder" || s.me.answered || shot) return;
    const n = Date.now(); setShot({ i, n, hit: null });
    const r = await taticoResponderAction(s.match, LETRAS[i]!);
    if (!r.ok && r.erro !== "ja_respondeu") { setShot(null); setErro(r.erro === "fora_do_tempo" ? "O tempo desta questão acabou." : "Não foi possível registrar o disparo."); return; }
    setShot({ i, n, hit: r.acertou ?? null });
    const e = await taticoEstadoAction(s.match); if (e.ok) setS(e.s);
  }, [s, shot, setS]);

  /* ---------- telas ---------- */
  if (s.estado === "partida" && !fim) {
    return (
      <div>
        <Cena s={s} at={at} nivel={nivel} noFx={noFx} portrait={portrait} onShoot={atirar} shot={shot} />
        {erro && <p role="alert" className="mt-2 text-[13px] text-[#B42318]">{erro}</p>}
        <button className="mt-2 text-[12px] text-tinta-suave underline" onClick={() => { const v = !noFx; setNoFx(v); localStorage.setItem("tt-fx", v ? "off" : "on"); }}>{noFx ? "Ativar efeitos visuais" : "Reduzir efeitos visuais"}</button>
      </div>
    );
  }
  if (fim && s.estado === "partida") return <Resultado s={s} rev={rev} onNova={() => { setS({ estado: "ocioso", usados: s.usados, limite: 3 }); setRev(null); pos.current = -1; }} />;
  return (
    <Lobby s={s} stats={stats} erro={erro} onEntrar={entrar} onSair={async () => { await taticoSairFilaAction(); setS({ estado: "ocioso", usados: inicial.usados, limite: inicial.limite }); }} />
  );
}

function Lobby({ s, stats, erro, onEntrar, onSair }: { s: TaticoEstado; stats: TaticoStats; erro: string | null; onEntrar: () => void; onSair: () => void }) {
  const usados = "usados" in s && typeof s.usados === "number" ? s.usados : 0;
  const esgotado = s.estado === "limite" || usados >= 3;
  const wr = stats && stats.partidas ? Math.round((100 * stats.vitorias) / stats.partidas) : 0;
  return (
    <div className="mx-auto max-w-3xl" data-testid="tatico-lobby">
      <div className="tt-wrap" style={{ padding: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tatico/estande-sm.webp" alt="" style={{ width: "100%", display: "block", opacity: 0.55 }} />
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 16, background: "linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.8))", color: "#fff" }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: ".2em", color: "#e5202e", fontWeight: 800 }}>MODO JOGO · 1 x 1</p>
            <h1 style={{ fontSize: "clamp(26px,6vw,44px)", fontWeight: 900, fontStyle: "italic", lineHeight: 1.05 }}>DESAFIO TÁTICO</h1>
            <p style={{ fontSize: 14, margin: "8px auto 14px", maxWidth: 420, color: "#ddd" }}>10 questões reais contra outro aluno, ao vivo. Vitória +200 XP · derrota −100 XP. Empate vai para a morte súbita.</p>
            {s.estado === "fila" ? (
              <>
                <p role="status" style={{ fontWeight: 800 }}>Procurando adversário…</p>
                <p style={{ fontSize: 12, color: "#bbb" }}>A busca expira em 90 s sem gastar sua tentativa.</p>
                <button onClick={onSair} className="mt-3 rounded-[10px] border border-white/40 px-4 py-2 text-[14px]">Cancelar</button>
              </>
            ) : esgotado ? (
              <p style={{ fontWeight: 800, color: "#ffd24a" }}>Você usou os 3 desafios de hoje. Volte amanhã.</p>
            ) : s.estado === "sem_questoes" ? (
              <p style={{ fontWeight: 800, color: "#ffd24a" }}>Ainda não há questões suficientes para o desafio.</p>
            ) : (
              <button onClick={onEntrar} data-testid="tatico-entrar" className="rounded-[10px] bg-[#c9141f] px-6 py-3 text-[16px] font-extrabold text-white shadow-[0_0_24px_rgba(229,32,46,.6)] active:scale-[.97]">ENTRAR NO ESTANDE</button>
            )}
            <p style={{ fontSize: 13, marginTop: 10, color: "#ccc" }}>Desafios hoje: <b>{Math.min(3, usados)}/3</b></p>
            {erro && <p role="alert" style={{ color: "#ff8a93", fontSize: 13 }}>{erro}</p>}
          </div>
        </div>
      </div>
      {stats && stats.partidas > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="tatico-stats">
          {[["Partidas", stats.partidas], ["Vitórias", `${stats.vitorias} (${wr}%)`], ["Derrotas", stats.derrotas], ["Melhor sequência", stats.melhorSequencia], ["XP ganho", `+${stats.xpGanho}`], ["XP perdido", `−${stats.xpPerdido}`], ["Acertos", stats.acertos], ["Erros", stats.erros]].map(([a, b]) => (
            <div key={String(a)} className="rounded-[12px] border border-[#E6E7EB] bg-white p-3"><p className="text-[12px] text-tinta-suave">{a}</p><p className="text-[18px] font-extrabold">{b}</p></div>
          ))}
        </div>
      )}
      {stats && stats.recentes.length > 0 && (
        <ul className="mt-4 space-y-1" aria-label="Histórico">
          {stats.recentes.map((h) => (
            <li key={h.match} className="flex items-center justify-between rounded-[10px] border border-[#E6E7EB] bg-white px-3 py-2 text-[14px]">
              <span className={h.venceu ? "font-bold text-[#067647]" : "font-bold text-[#B42318]"}>{h.venceu ? "Vitória" : "Derrota"}{h.desempate ? " · morte súbita" : ""}</span>
              <span className="text-tinta-suave">{h.acertos} acertos · {h.erros} erros · {new Date(h.quando).toLocaleDateString("pt-BR")}</span>
            </li>
          ))}
        </ul>
      )}
      {stats && stats.assuntos.length > 0 && (
        <div className="mt-4 rounded-[12px] border border-[#E6E7EB] bg-white p-3">
          <p className="text-[13px] font-bold">Assuntos para reforçar</p>
          <ul className="mt-1 text-[14px]">{stats.assuntos.slice(0, 4).map((a) => <li key={a.assunto}>{a.assunto}: {a.taxa}% ({a.acertos}/{a.total})</li>)}</ul>
        </div>
      )}
      <Link href="/quiz" className="mt-4 inline-block text-[14px] underline">← Voltar ao Modo Jogo</Link>
    </div>
  );
}

function Resultado({ s, rev, onNova }: { s: Partida; rev: TaticoRevisao; onNova: () => void }) {
  const win = s.winner === true;
  return (
    <div className="mx-auto max-w-3xl" data-testid="tatico-resultado">
      <div className="rounded-[16px] p-6 text-center text-white" style={{ background: win ? "linear-gradient(160deg,#052e16,#000)" : "linear-gradient(160deg,#3b0a0e,#000)", border: `2px solid ${win ? "#28d46a" : "#e5202e"}` }}>
        <p style={{ fontSize: 12, letterSpacing: ".2em", opacity: 0.8 }}>{s.decidedBy === "morte_subita" ? "DECIDIDO NA MORTE SÚBITA" : s.decidedBy === "abandono" ? "ADVERSÁRIO ABANDONOU" : "RESULTADO FINAL"}</p>
        <h2 style={{ fontSize: "clamp(34px,9vw,64px)", fontWeight: 900, fontStyle: "italic" }}>{win ? "VITÓRIA" : "DERROTA"}</h2>
        <p style={{ fontSize: 22, fontWeight: 800 }}>{s.me.hits} x {s.opp.hits} <span style={{ opacity: 0.7, fontSize: 14 }}>vs {s.opp.name}</span></p>
        <p style={{ fontSize: 26, fontWeight: 900, color: win ? "#28d46a" : "#ff6b78" }}>{s.xp == null ? "" : s.xp > 0 ? `+${s.xp} XP` : s.xp === 0 ? "0 XP (você já estava no zero)" : `${s.xp} XP`}</p>
        <p style={{ fontSize: 13, opacity: 0.8 }}>Acertos {s.me.hits} · Erros {s.me.miss} · Melhor sequência {s.me.bestStreak}x</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button onClick={onNova} className="rounded-[10px] bg-[#c9141f] px-5 py-2 font-bold">Novo desafio</button>
          <Link href="/quiz" className="rounded-[10px] border border-white/40 px-5 py-2">Ranking</Link>
        </div>
      </div>
      <h3 className="mt-5 text-[16px] font-extrabold">Revisão das questões</h3>
      {!rev ? <p className="text-[14px] text-tinta-suave">Carregando revisão…</p> : (
        <ol className="mt-2 space-y-2">
          {rev.itens.map((it) => (
            <li key={it.pos} className="rounded-[12px] border border-[#E6E7EB] bg-white p-3 text-[14px]">
              <p className="font-bold">{it.tiebreak ? "Desempate" : `Questão ${it.pos}`} · <span className={it.acertou ? "text-[#067647]" : "text-[#B42318]"}>{it.acertou ? "acertou" : it.choice ? "errou" : "sem resposta"}</span></p>
              <p className="mt-1">{it.statement}</p>
              <p className="mt-1 text-tinta-suave">Sua resposta: {it.choice ?? "—"} · Gabarito: <b>{it.correct}</b></p>
              {it.justification && <p className="mt-1 text-[13px] text-tinta-suave">{it.justification}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
