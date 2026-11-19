"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SoldierAudio } from "@/components/knowledge-map/soldier-audio";
import { breathAt } from "@/components/knowledge-map/breath";
import { EVENTO_DESAFIO } from "@/components/tatico/desafio-watcher";
import { Carregando, EsperaEstande } from "./carregando";
import { Lobby } from "./lobby";
import { taticoStatsAction, taticoEncerrarTreinoAction, taticoEstadoAction, taticoMirarAction, taticoResponderAction, taticoRevisaoAction, taticoSairFilaAction } from "./actions";
import type { TaticoEstado, TaticoQuestao, TaticoRevisao, TaticoStats } from "@/server/services/tatico";
import "./tatico.css";

type Partida = Extract<TaticoEstado, { estado: "partida" }>;
const LETRAS = ["A", "B", "C", "D"] as const;
const TG_X = [591, 765, 938, 1108];
const OPT_POS = [{ l: 442, t: 168, h: 104 }, { l: 846, t: 168, h: 104 }, { l: 442, t: 282, h: 90 }, { l: 846, t: 282, h: 90 }];
const W = 1672, H = 941;

function entrarTelaCheia() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement) void el.requestFullscreen?.({ navigationUI: "hide" }).catch(() => undefined);
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (window.matchMedia("(pointer: coarse)").matches) void o?.lock?.("landscape").catch(() => undefined);
  } catch { /* sem suporte: o modo fixo em CSS já ocupa a janela */ }
}
function sairTelaCheia() {
  try { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); screen.orientation?.unlock?.(); } catch { /* sem efeito */ }
}

const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const fs = (txt: string, base: number, min: number, soft: number, k = 0.07) => Math.max(min, base - Math.max(0, txt.length - soft) * k);

function useEscala(portrait: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setDim({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el); setDim({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  // retrato: recorta a faixa central (alvos + braço) e a pergunta vira DOM; paisagem: o palco inteiro, centralizado, ocupando a tela
  const faixa = portrait ? { x: 520, y: 392, w: 660, h: 549 } : { x: 0, y: 0, w: W, h: H };
  const k = portrait ? dim.w / faixa.w : Math.min(dim.w / faixa.w, dim.h / faixa.h);
  const offX = portrait ? 0 : (dim.w - faixa.w * k) / 2;
  const offY = portrait ? 0 : (dim.h - faixa.h * k) / 2;
  return { ref, k, faixa, offX, offY, boxH: portrait ? faixa.h * k : undefined };
}

function Cena({ s, at, nivel, noFx, portrait, onShoot, onAim, shot, breathClock, oppShot, espectro, aimOpp }: { aimOpp?: number | null; onAim?: (i: number) => void; espectro?: { i: number; n: number } | null; oppShot?: number; breathClock?: (nowMs: number) => number | null; s: Partida; at: number; nivel: { level: number; into: number }; noFx: boolean; portrait: boolean; onShoot: (i: number) => void; shot: { i: number; n: number; hit: boolean | null } | null }) {
  const { ref, k, faixa, offX, offY, boxH } = useEscala(portrait);
  const [now, setNow] = useState(0);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);
  // Respiração: a cena inteira (fundo, alvos e braço) se move junto, como a câmera de quem respira; o braço
  // ainda "infla" um pouco a partir da base (nunca descola). Mesma curva do "novo estudo", guiada pelo áudio.
  const worldEl = useRef<HTMLDivElement>(null);
  const armEl = useRef<HTMLDivElement>(null);
  const clock = useRef(breathClock);
  const fxOff = useRef(noFx);
  useEffect(() => { clock.current = breathClock; fxOff.current = noFx; }, [breathClock, noFx]);
  useEffect(() => {
    let raf = 0;
    const loop = (ts: number) => {
      const w = worldEl.current; const a = armEl.current;
      if (w && a) {
        if (fxOff.current) { w.style.transform = ""; a.style.transform = ""; }
        else {
          const { chest, kick } = breathAt(clock.current?.(ts) ?? ts / 1000);
          const drift = Math.sin(ts / 2400);
          w.style.transform = `translate3d(${(drift * 1.4).toFixed(2)}px, ${(-chest * 3.6 + kick * 2.6).toFixed(2)}px, 0) rotate(${(drift * 0.0007).toFixed(5)}rad) scale(${(1.014 + chest * 0.011).toFixed(5)})`;
          a.style.transform = `scale(${(1 + chest * 0.004).toFixed(5)}, ${(1 + chest * 0.013 + kick * 0.007).toFixed(5)})`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const ms = Math.max(0, s.msRestantes - Math.max(0, now - at));
  const q = s.question; const rev = s.phase === "revelar" || s.phase === "fim";
  const meuTurno = s.meuTurno ?? true;
  const bloqueado = s.phase !== "responder" || !meuTurno || s.me.answered || !!shot;
  // quem assiste vê o disparo do outro: o braço mira e atira no alvo escolhido, com clarão, furo e som
  const ativo: { i: number; n: number; hit: boolean | null } | null = shot ?? (espectro ? { ...espectro, hit: null } : null);
  const alvoI = ativo ? ativo.i : aimOpp ?? null;
  const mira = alvoI !== null ? (TG_X[alvoI]! - 840) / 55 : 0;
  const materia = (q?.subject ?? "").includes("_") ? (q?.subject ?? "").replace(/_/g, " ").replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : (q?.subject ?? "");
  const cls = (l: string, base: string) => {
    if (rev && q?.correct) { const o = q.oppChoice === l ? " opp" : ""; if (l === q.correct) return `${base} ok${o}`; if (l === s.me.choice) return `${base} no${o}`; return `${base} dim${o}`; }
    if (s.me.choice === l || (shot && LETRAS[shot.i] === l)) return `${base} sel`;
    return q?.oppChoice === l ? `${base} opp` : base;
  };
  // Tela pequena (celular): o palco reduz tudo e o texto vira ilegível. Nesse caso a pergunta e as respostas
  // saem do palco e viram texto real (tamanho fixo e legível) sobre a faixa de cima do estande.
  const dom = k > 0 && k < 0.62;
  const tgCls = (l: string) => {
    const o = (q?.oppChoice === l ? " opp" : "") + (aimOpp !== null && aimOpp !== undefined && LETRAS[aimOpp] === l && !rev ? " aim" : "");
    if (rev && q?.correct) return (l === q.correct ? "ok" : l === s.me.choice ? "no" : "") + o;
    return o;
  };
  return (
    <div className={`tt-wrap tt-wrap-full ${noFx ? "tt-fx-off" : ""}`}>
      <div className="tt-fundo" aria-hidden />
      <div ref={ref} className="tt-box" style={portrait ? { height: boxH || undefined, flex: "none" } : { flex: 1, minHeight: 0 }} data-testid="tatico-cena">
        <div className="tt-stage" style={{ transform: `translate(${offX}px,${offY}px) scale(${k}) translate(${-faixa.x}px,${-faixa.y}px)` }}>
          <div ref={worldEl} className="tt-world">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tt-bg" src="/tatico/estande.webp" alt="" draggable={false} />
          {/* alvos */}
          {q && LETRAS.map((l, i) => (
            <button key={l} disabled={bloqueado} onPointerEnter={() => onAim?.(i)} onPointerDown={() => onAim?.(i)} aria-label={`Atirar no alvo ${l}`} className={`tt-tg ${tgCls(l)} ${ativo?.i === i && ativo.hit === false ? "swing" : ""}`} style={{ left: TG_X[i]! - 56, backgroundImage: `url(/tatico/alvo${i}.webp)` }} onClick={() => onShoot(i)}>
              <span className="lt">{l}</span>
              {q?.oppChoice === l && <span className="adv">ADV.</span>}
              {ativo?.i === i && (<><i className="tt-hole" style={{ left: 56, top: 72 }} key={`h${ativo.n}`} /><i className="tt-spark" style={{ left: 56, top: 72 }} key={`s${ativo.n}`} /></>)}
            </button>
          ))}
          {/* braço + efeitos */}
          <div ref={armEl} className="tt-breath"><div key={ativo?.n ?? 0} className={`tt-arm ${ativo ? "fire" : ""}`} style={{ ["--aim" as string]: `${mira}deg`, transform: `rotate(${mira}deg) translateY(-6px)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tatico/braco.webp" alt="" draggable={false} />
          </div></div>
          {ativo && !noFx && (
            <div key={`fx${ativo.n}`}>
              <i className="tt-flash" style={{ left: 840 + mira * 6, top: 590 }} />
              <i className="tt-shell" style={{ left: 870, top: 600 }} />
              <i className="tt-smoke" style={{ left: 840 + mira * 6, top: 585 }} />
            </div>
          )}
          </div>
          {s.phase === "responder" && q?.tiebreak && <div className="tt-sd" />}
          {/* HUD */}
          {!portrait && (
            <>
              <div className="tt-panel tt-hud-l">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tatico/caveira.webp" alt="" />
                <div><div className="tt-lbl">PONTUAÇÃO</div><div className="tt-big">{s.me.hits * 100}<small>XP</small></div></div>
              </div>
              <div className="tt-panel tt-seq"><div className="tt-lbl">SEQUÊNCIA</div><div className="tt-big">{s.me.streak}x</div></div>
              <div className={`tt-panel red tt-timer ${s.phase === "responder" && ms < 6000 ? "low" : ""}`} data-testid="tatico-timer">
                <svg width="46" height="52" viewBox="0 0 24 28" fill="none" stroke="#e5202e" strokeWidth="2"><circle cx="12" cy="16" r="9" /><path d="M12 16V10M9 2h6M12 2v5M20 6l2 2" /></svg>
                <div className="tt-big">{s.phase === "responder" ? mmss(ms) : "--:--"}</div>
              </div>
              <div className="tt-panel tt-vs" data-testid="tatico-adversario">
                <span className="nm">VS {s.opp.name}</span><em>{s.me.hits} x {s.opp.hits}</em>
                <span className={`st ${s.opp.answered || meuTurno ? "ok" : ""}`}>{s.phase !== "responder" ? "" : meuTurno ? "● SUA VEZ" : s.opp.answered ? "● ATIROU" : "● MIRANDO…"}</span>
              </div>
              {q && (
                <>
                  <div className="tt-panel tt-mat" data-testid="tatico-materia"><span><em>MATÉRIA</em> {materia || "—"}</span><span className="sep" /><span><em>TÓPICO</em> {q.topic || "—"}</span></div>
                  <div className="tt-panel tt-q">QUESTÃO <b>{String(Math.min(q.pos, s.total)).padStart(2, "0")}/{String(s.total).padStart(2, "0")}</b>{q.tiebreak ? " · MORTE SÚBITA" : ""}</div>
                  {!dom && <div className="tt-panel tt-enun" style={{ fontSize: fs(q.statement, 26, 13, 80) }}>{q.statement}</div>}
                  {!dom && q.options.map((o, i) => (
                    <button key={o.label} disabled={bloqueado} onPointerEnter={() => onAim?.(i)} className={cls(o.label, "tt-panel tt-opt")} style={{ left: OPT_POS[i]!.l, top: OPT_POS[i]!.t, height: OPT_POS[i]!.h, fontSize: fs(o.text, 23, 14, 50, 0.055) }} onClick={() => onShoot(i)} data-testid={`tatico-op-${o.label}`}>
                      <span className="lt">{o.label}</span><span className="tx">{o.text}</span>
                    </button>
                  ))}
                </>
              )}
              <div className="tt-panel tt-xp">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tatico/soldado.webp" alt="" />
                <div className="info">
                  <div className="tt-lbl" style={{ color: "#fff", fontSize: 24 }}>NÍVEL {nivel.level}</div>
                  <div className="bar"><i style={{ width: `${nivel.into * 10}%` }} /></div>
                  <div className="lt2"><b>{nivel.into * 100}</b> / 1.000 XP</div>
                </div>
              </div>
              <div className="tt-panel tt-ammo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tatico/glock.webp" alt="" />
                <div><div className="tt-lbl">GLOCK G17</div><div className="n">{Math.max(0, s.total - Math.max(0, s.idx - (rev || s.me.answered ? 0 : 1)))}<small> / {s.total}</small></div></div>
                <svg className="cart" viewBox="0 0 22 44" fill="none" stroke="#ddd" strokeWidth="2" aria-hidden><path d="M5 18c0-6 2-12 6-16 4 4 6 10 6 16v22H5z" /><path d="M5 34h12" /></svg>
              </div>
            </>
          )}
          {rev && q?.correct && !portrait && !dom && (
            <div className="tt-panel red tt-reveal"><b>Gabarito: {q.correct}.</b> {(q.explanations?.[q.correct] || q.justification || "").toString().slice(0, 260)}</div>
          )}
          {!!oppShot && <div key={`op${oppShot}`} className="tt-oppflash" />}
          {s.phase === "responder" && !s.me.answered && !s.solo && !dom && (
            <div className={`tt-wait ${meuTurno ? "vez" : ""}`} data-testid="tatico-vez">{meuTurno ? "SUA VEZ — ATIRE!" : s.opp.answered ? `${s.opp.name} ATIROU` : `VEZ DE ${s.opp.name.toUpperCase()} — ACOMPANHE`}</div>
          )}
          {s.phase === "contagem" && <div className="tt-cd"><span key={Math.ceil(ms / 1000)}>{Math.max(1, Math.ceil(ms / 1000) - 5) > 3 ? "PREPARAR" : Math.max(1, Math.ceil(ms / 1000))}</span></div>}
        </div>
        {dom && q && (
          <div className="tt-dom" style={{ top: offY + 104 * k, maxHeight: Math.max(90, (424 - 104) * k - 4) }} data-testid="tatico-dom">
            <div className="tt-dom-cab">
              <span>{String(Math.min(q.pos, s.total)).padStart(2, "0")}/{String(s.total).padStart(2, "0")} · {(materia || "—").toUpperCase()}</span>
              <b className={meuTurno ? "vez" : ""}>{s.phase !== "responder" ? "" : s.solo ? "ATIRE!" : meuTurno ? "SUA VEZ — ATIRE!" : s.opp.answered ? `${s.opp.name.toUpperCase()} ATIROU` : `VEZ DE ${s.opp.name.toUpperCase()}`}</b>
            </div>
            <p className="tt-dom-q">{q.statement}</p>
            <div className="tt-dom-ops">
              {q.options.map((o, i) => (
                <button key={o.label} disabled={bloqueado} onPointerDown={() => onAim?.(i)} className={cls(o.label, "tt-dom-op")} onClick={() => onShoot(i)} data-testid={`tatico-op-${o.label}`}>
                  <span className="lt">{o.label}</span><span className="tx">{o.text}</span>
                </button>
              ))}
            </div>
            {rev && q.correct && <p className="tt-dom-rev"><b>Gabarito: {q.correct}.</b> {(q.explanations?.[q.correct] || q.justification || "").toString().slice(0, 260)}</p>}
          </div>
        )}
      </div>
      {portrait && q && (
        <div className="tt-m-q" style={{ margin: 8, flex: 1, overflowY: "auto", minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, color: "#e5202e" }}>
            <span>QUESTÃO {String(Math.min(q.pos, s.total)).padStart(2, "0")}/{s.total}{q.tiebreak ? " · MORTE SÚBITA" : ""}</span>
            <span data-testid="tatico-timer">{s.phase === "responder" ? mmss(ms) : "--:--"}</span>
          </div>
          <p style={{ fontSize: 11, letterSpacing: ".06em", color: "#ffd24a", margin: "6px 0 0", fontWeight: 700 }} data-testid="tatico-materia-m">{(materia || "—").toUpperCase()} · {q.topic || "—"}</p>
          <p style={{ fontSize: 15, lineHeight: 1.35, margin: "6px 0 4px", color: "#fff" }}>{q.statement}</p>
          <div style={{ fontSize: 12, color: "#bbb" }}>VS {s.opp.name} · {s.me.hits} x {s.opp.hits} · sequência {s.me.streak}x{s.phase === "responder" ? (meuTurno ? " · sua vez" : s.opp.answered ? " · adversário atirou" : " · vez do adversário") : ""}</div>
          {q.options.map((o, i) => (
            <button key={o.label} disabled={bloqueado} className={cls(o.label, "tt-m-opt")} onClick={() => onShoot(i)}><span className="lt">{o.label}</span><span>{o.text}</span></button>
          ))}
          {rev && q.correct && <p style={{ fontSize: 13, marginTop: 8, color: "#ddd" }}><b style={{ color: "#28d46a" }}>Gabarito: {q.correct}.</b> {(q.explanations?.[q.correct] || q.justification || "").toString().slice(0, 300)}</p>}
        </div>
      )}
    </div>
  );
}

const semAssinatura = () => () => {};

/**
 * As telas do desafio (lobby, estande, resultado) são camadas de tela cheia. Elas saem do layout do app e vão para o
 * <body>, para que o zoom, as transições e o overflow do conteúdo da página não cortem nem travem a rolagem.
 */
export function TaticoView(props: { retomar: boolean; inicial: TaticoEstado; nivel: { level: number; into: number } }) {
  const montado = useSyncExternalStore(semAssinatura, () => true, () => false);
  if (!montado) return null;
  return createPortal(<TaticoViewInterno {...props} />, document.body);
}

function TaticoViewInterno({ inicial, nivel, retomar }: { retomar: boolean; inicial: TaticoEstado; nivel: { level: number; into: number } }) {
  const [s, setSraw] = useState<TaticoEstado>(inicial);
  // Já tem partida/fila ativa ao abrir (ex.: acabou de aceitar um desafio)? Passa pela tela de carregamento e cai no estande.
  // Pelo card do Modo Jogo sempre cai na página de desafiar alguém; só vai direto ao estande quando o desafio acabou de ser aceito
  // (?jogo=1). Partida que ficou em andamento aparece como aviso "voltar à partida" no lobby.
  const [entrou, setEntrou] = useState(retomar && inicial.estado === "partida");
  const [carregando, setCarregando] = useState(retomar && inicial.estado === "partida");
  const [esperaServidor, setEsperaServidor] = useState(false);
  const [stats, setStats] = useState<TaticoStats>(null);
  const usadosIni = "usados" in inicial && typeof inicial.usados === "number" ? inicial.usados : 0;
  const [at, setAt] = useState(0);
  const setS = useCallback((v: TaticoEstado) => { setAt(Date.now()); setSraw(v); }, []);
  const [erro, setErro] = useState<string | null>(null);
  const [shot, setShot] = useState<{ i: number; n: number; hit: boolean | null } | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [noFx, setNoFx] = useState(false);
  const [rev, setRev] = useState<TaticoRevisao>(null);
  const [audio] = useState(() => new SoldierAudio({ shotSrc: "/audio/disparo-glock.mp3", shotGain: 0.9 }));
  const [som, setSom] = useState(true);
  const router = useRouter();
  const [oppShot, setOppShot] = useState(0);
  const ultimaMira = useRef<{ pos: number; i: number; t: number } | null>(null);
  const [espectro, setEspectro] = useState<{ i: number; n: number; pos: number } | null>(null);
  // Imersão: some tudo que é flutuante do app (Mentor, ajuda, cookies) enquanto o Desafio Tático está aberto.
  useEffect(() => { document.body.classList.add("tt-imersivo"); return () => document.body.classList.remove("tt-imersivo"); }, []);
  useEffect(() => { let vivo = true; taticoStatsAction().then((r) => { if (vivo) setStats(r); }); return () => { vivo = false; }; }, []);
  const pos = useRef<number>(-1);
  const busy = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px) and (orientation: portrait)"); const f = () => setPortrait(mq.matches); f(); mq.addEventListener("change", f);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência lida só no cliente
    setSom(localStorage.getItem("tt-som") !== "off");
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
    }, s.estado === "partida" && s.phase === "responder" ? (s.meuTurno === false && !s.solo ? 300 : 700) : 1000);
    return () => clearInterval(t);
  }, [ativo, fim, s, setS]);

  // Um aluno atira por vez; o outro assiste em tempo real: assim que o servidor registra a escolha de quem atirou,
  // o braço mira no alvo escolhido e dispara (clarão, furo e som) também aqui.
  const oppLetra = s.estado === "partida" ? s.question?.oppChoice ?? null : null;
  const oppPos = s.estado === "partida" ? s.question?.pos ?? 0 : 0;
  useEffect(() => {
    if (!oppLetra || !oppPos) return;
    const i = LETRAS.indexOf(oppLetra as (typeof LETRAS)[number]);
    if (i < 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reação ao evento do adversário vindo do servidor
    setEspectro((cur) => (cur && cur.pos === oppPos ? cur : { i, n: Date.now(), pos: oppPos }));
    setOppShot(Date.now());
    if (som) { audio.start(); audio.shot(); }
  }, [oppLetra, oppPos, som, audio]);
  // Desafio aceito (por mim ou por quem eu desafiei): vai direto para a partida, já com as questões.
  useEffect(() => {
    const h = async (e: Event) => {
      const d = (e as CustomEvent<{ status: string }>).detail;
      if (d?.status === "aceito") { setEntrou(true); setCarregando(true); setEsperaServidor(true); const r = await taticoEstadoAction(); if (r.ok) setS(r.s); setEsperaServidor(false); }
    };
    window.addEventListener(EVENTO_DESAFIO, h); return () => window.removeEventListener(EVENTO_DESAFIO, h);
  }, [setS]);
  const q: TaticoQuestao | null = s.estado === "partida" ? s.question : null;
  useEffect(() => { if (q && q.pos !== pos.current) { pos.current = q.pos; setShot(null); setEspectro(null); } }, [q]);
  useEffect(() => { if (fim && s.estado === "partida") taticoRevisaoAction(s.match).then(setRev); }, [fim, s]);
  useEffect(() => {
    if (s.estado !== "fila") return;
    const sair = () => { void taticoSairFilaAction(); };
    window.addEventListener("pagehide", sair); return () => window.removeEventListener("pagehide", sair);
  }, [s.estado]);

  useEffect(() => {
    const vis = () => (document.hidden ? audio.hide() : audio.show());
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); audio.dispose(); };
  }, [audio]);
  useEffect(() => { if (fim || s.estado === "ocioso") { audio.stop(); sairTelaCheia(); } }, [fim, s.estado, audio]);

  const encerrarTreino = useCallback(async () => {
    if (!window.confirm("Encerrar o treino? Ele será finalizado e você volta à página de desafios.")) return;
    audio.stop(); sairTelaCheia();
    const r = await taticoEncerrarTreinoAction();
    setEntrou(false); setCarregando(false); setRev(null); pos.current = -1; setShot(null); setEspectro(null);
    if (r.ok) setS(r.s); else setErro(r.error);
  }, [audio, setS]);
  // Quem está atirando avisa o rival onde está mirando (o rival vê o braço se mexer antes do tiro).
  const mirar = useCallback((i: number) => {
    if (s.estado !== "partida" || s.phase !== "responder" || s.me.answered || s.solo || s.meuTurno === false || !s.question) return;
    const u = ultimaMira.current; const now = Date.now();
    if (u && u.pos === s.question.pos && u.i === i && now - u.t < 2500) return;
    ultimaMira.current = { pos: s.question.pos, i, t: now };
    void taticoMirarAction(s.match, LETRAS[i]!);
  }, [s]);
  const atirar = useCallback(async (i: number) => {
    if (s.estado !== "partida" || s.phase !== "responder" || s.me.answered || shot) return;
    // Som e clarão saem juntos, no mesmo instante do clique (antes de ir ao servidor).
    if (som) { audio.start(); audio.shot(); }
    const n = Date.now(); setShot({ i, n, hit: null });
    const r = await taticoResponderAction(s.match, LETRAS[i]!);
    if (!r.ok && r.erro !== "ja_respondeu") { setShot(null); setErro(r.erro === "fora_do_tempo" ? "O tempo desta questão acabou." : r.erro === "nao_e_sua_vez" ? "Agora é a vez do adversário." : "Não foi possível registrar o disparo."); return; }
    setShot({ i, n, hit: r.acertou ?? null });
    const e = await taticoEstadoAction(s.match); if (e.ok) setS(e.s);
  }, [s, shot, setS, som, audio]);

  /* ---------- telas ---------- */
  if (carregando) return <Carregando som={som} aguardando={esperaServidor} onPronto={() => setCarregando(false)} />;
  if (s.estado === "fila") return <EsperaEstande onSair={async () => { await taticoSairFilaAction(); setS({ estado: "ocioso", usados: usadosIni, limite: 3 }); sairTelaCheia(); }} />;
  if (s.estado === "partida" && !fim && entrou) {
    return (
      <div className="tt-full" data-testid="tatico-tela-cheia">
        {/* celular em pé: o estande inteiro (idêntico à arte de referência) gira 90° e ocupa a tela toda, como um jogo em paisagem */}
        <div className={portrait ? "tt-rot" : "tt-fill"}>
        <Cena aimOpp={s.question?.oppAim ? LETRAS.indexOf(s.question.oppAim as (typeof LETRAS)[number]) : null} onAim={mirar} espectro={espectro} oppShot={oppShot} breathClock={som && !noFx ? (now) => audio.breathTime(now) : undefined} s={s} at={at} nivel={nivel} noFx={noFx} portrait={false} onShoot={atirar} shot={shot} />
        {erro && <p role="alert" className="tt-toast">{erro}</p>}
        <div className="tt-ctl">
          <button data-testid="tatico-som" onClick={() => { const v = !som; setSom(v); localStorage.setItem("tt-som", v ? "on" : "off"); if (v) audio.start(); else audio.stop(); }}>{som ? "Som: ligado" : "Som: desligado"}</button>
          <button onClick={() => { const v = !noFx; setNoFx(v); localStorage.setItem("tt-fx", v ? "off" : "on"); }}>{noFx ? "Efeitos: reduzidos" : "Efeitos: completos"}</button>
          {s.solo && <button onClick={encerrarTreino} data-testid="tatico-encerrar-treino" style={{ borderColor: "#ffd24a", color: "#ffd24a" }}>Encerrar treino</button>}
          <button onClick={() => { if (window.confirm("Sair da partida? Ela continua valendo e você pode voltar enquanto estiver em andamento.")) { sairTelaCheia(); router.push("/quiz"); } }}>Sair</button>
        </div>
        </div>
      </div>
    );
  }
  if (fim && s.estado === "partida" && entrou) return <Resultado s={s} rev={rev} onNova={() => { setS({ estado: "ocioso", usados: s.usados, limite: 3 }); setRev(null); pos.current = -1; }} />;
  return (
    <Lobby s={s} stats={stats} erro={erro} onRetomar={() => { entrarTelaCheia(); setEntrou(true); setCarregando(true); }} onEncerrar={encerrarTreino} />
  );
}

function Resultado({ s, rev, onNova }: { s: Partida; rev: TaticoRevisao; onNova: () => void }) {
  const win = s.winner === true;
  return (
    <div className="tt-page" data-testid="tatico-resultado"><div className="tt-page-in">
      <div className="rounded-[16px] p-6 text-center text-white" style={{ background: win ? "linear-gradient(160deg,#052e16,#000)" : "linear-gradient(160deg,#3b0a0e,#000)", border: `2px solid ${win ? "#28d46a" : "#e5202e"}` }}>
        <p style={{ fontSize: 12, letterSpacing: ".2em", opacity: 0.8 }}>{s.decidedBy === "morte_subita" ? "DECIDIDO NA MORTE SÚBITA" : s.decidedBy === "abandono" ? "ADVERSÁRIO ABANDONOU" : "RESULTADO FINAL"}</p>
        <h2 style={{ fontSize: "clamp(34px,9vw,64px)", fontWeight: 900, fontStyle: "italic" }}>{win ? "VITÓRIA" : "DERROTA"}</h2>
        <p style={{ fontSize: 22, fontWeight: 800 }}>{s.me.hits} x {s.opp.hits} <span style={{ opacity: 0.7, fontSize: 14 }}>vs {s.opp.name}</span></p>
        <p style={{ fontSize: 26, fontWeight: 900, color: win ? "#28d46a" : "#ff6b78" }}>{s.solo ? "Treino: sem XP" : s.xp == null ? "" : s.xp > 0 ? `+${s.xp} XP` : s.xp === 0 ? "0 XP (você já estava no zero)" : `${s.xp} XP`}</p>
        <p style={{ fontSize: 13, opacity: 0.8 }}>Acertos {s.me.hits} · Erros {s.me.miss} · Melhor sequência {s.me.bestStreak}x</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button onClick={onNova} className="rounded-[10px] bg-[#c9141f] px-5 py-2 font-bold">Novo desafio</button>
          <Link href="/quiz" className="rounded-[10px] border border-white/40 px-5 py-2">Ranking</Link>
        </div>
      </div>
      <h3 className="mt-5 text-[16px] font-extrabold text-white">Revisão das questões</h3>
      {!rev ? <p className="text-[14px] text-white/70">Carregando revisão…</p> : (
        <ol className="mt-2 space-y-2">
          {rev.itens.map((it) => (
            <li key={it.pos} className="rounded-[12px] border border-[#E6E7EB] bg-white p-3 text-[14px] text-[#08090B]">
              <p className="font-bold">{it.tiebreak ? "Desempate" : `Questão ${it.pos}`} · <span className={it.acertou ? "text-[#067647]" : "text-[#B42318]"}>{it.acertou ? "acertou" : it.choice ? "errou" : "sem resposta"}</span></p>
              <p className="mt-1">{it.statement}</p>
              <p className="mt-1 text-tinta-suave">Sua resposta: {it.choice ?? "—"} · Gabarito: <b>{it.correct}</b></p>
              {it.justification && <p className="mt-1 text-[13px] text-tinta-suave">{it.justification}</p>}
            </li>
          ))}
        </ol>
      )}
    </div></div>
  );
}

/** Escolher qual aluno desafiar: online agora primeiro, busca por nome; mostra a espera pela resposta em tempo real. */
