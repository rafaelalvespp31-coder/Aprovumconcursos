"use client";

import { useEffect, useRef, useState } from "react";

/** Tudo que o estande usa: baixado e decodificado antes de abrir, para a partida começar sem engasgo. */
const IMAGENS = [
  "/tatico/estande.webp", "/tatico/braco.webp", "/tatico/alvo0.webp", "/tatico/alvo1.webp", "/tatico/alvo2.webp", "/tatico/alvo3.webp",
  "/tatico/caveira.webp", "/tatico/soldado.webp", "/tatico/glock.webp",
];
const AUDIOS = ["/audio/disparo-glock.mp3", "/audio/respiracao.m4a"];
const FONTES = ['italic 800 24px "Barlow Condensed"', 'italic 700 24px "Barlow Condensed"', '500 24px "Barlow Semi Condensed"', '600 24px "Barlow Semi Condensed"'];
const TOTAL = IMAGENS.length + AUDIOS.length + FONTES.length;
const MIN_MS = 1700;

/**
 * Tela de carregamento (vídeo do APROVUM) com barra de progresso REAL: avança conforme os arquivos do estande
 * ficam prontos. Ao chegar em 100% (e com a resposta do servidor em mãos) cai direto no estande.
 */
export function Carregando({ som, aguardando, onPronto }: { som: boolean; aguardando: boolean; onPronto: () => void }) {
  const [pct, setPct] = useState(0);
  const feitos = useRef(0);
  const alvo = useRef(0);
  const t0 = useRef(0);
  const fim = useRef(false);
  const espera = useRef(aguardando);
  const cb = useRef(onPronto);
  const vid = useRef<HTMLVideoElement>(null);
  useEffect(() => { espera.current = aguardando; cb.current = onPronto; }, [aguardando, onPronto]);

  useEffect(() => {
    t0.current = performance.now();
    const ok = () => { feitos.current += 1; alvo.current = feitos.current / TOTAL; };
    for (const src of IMAGENS) { const i = new Image(); i.decoding = "async"; i.onload = i.onerror = () => { (i.decode?.() ?? Promise.resolve()).catch(() => undefined).finally(ok); }; i.src = src; }
    for (const src of AUDIOS) fetch(src).then((r) => r.arrayBuffer()).catch(() => undefined).finally(ok);
    for (const f of FONTES) (document.fonts?.load(f) ?? Promise.resolve()).catch(() => undefined).finally(ok);
    let raf = 0; let p = 0;
    const loop = (ts: number) => {
      const decorrido = ts - t0.current;
      const teto = Math.min(1, decorrido / MIN_MS);                 // nunca "pula" para 100% antes do tempo mínimo
      const meta = Math.min(alvo.current, teto);
      p += (meta - p) * 0.14 + (meta > p ? 0.0015 : 0);
      if (p > meta) p = meta;
      setPct(p);
      if (p >= 0.995 && !espera.current && !fim.current) { fim.current = true; setTimeout(() => cb.current(), 220); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // vídeo: com som se o aluno deixou o som ligado (o clique em "Entrar" libera o áudio); senão, mudo
  useEffect(() => {
    const v = vid.current; if (!v) return;
    v.muted = !som; v.volume = 0.8;
    v.play().catch(() => { v.muted = true; v.play().catch(() => undefined); });
  }, [som]);

  const n = Math.round(pct * 100);
  return (
    <div className="tt-load" role="progressbar" aria-label="Carregando o estande" aria-valuemin={0} aria-valuemax={100} aria-valuenow={n} data-testid="tatico-carregando">
      <video ref={vid} src="/tatico/carregando.mp4" poster="/tatico/carregando.jpg" autoPlay loop playsInline preload="auto" muted />
      <div className="tt-load-grad" />
      <div className="tt-load-bar">
        <div className="tt-load-top"><span>CARREGANDO ESTANDE</span><b>{n}%</b></div>
        <div className="tt-load-trilho"><i style={{ width: `${n}%` }} /></div>
        <p>{n < 40 ? "Preparando armamento…" : n < 80 ? "Posicionando alvos…" : "Estande pronto"}</p>
      </div>
    </div>
  );
}

/** Estande vazio enquanto o servidor procura um adversário: o aluno já está dentro do cenário. */
export function EsperaEstande({ onSair }: { onSair: () => void }) {
  return (
    <div className="tt-full" data-testid="tatico-espera">
      <div className="tt-espera-bg" />
      <div className="tt-espera">
        <p className="k">DESAFIO TÁTICO</p>
        <h2>PROCURANDO ADVERSÁRIO…</h2>
        <div className="tt-load-trilho ind"><i /></div>
        <p className="d">A partida começa assim que outro aluno entrar. A busca expira em 90 s sem gastar sua tentativa.</p>
        <button onClick={onSair}>Cancelar</button>
      </div>
    </div>
  );
}
