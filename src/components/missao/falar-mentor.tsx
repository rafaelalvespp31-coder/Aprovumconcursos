"use client";

import { useEffect, useRef, useState, type PointerEvent as PE, type RefObject } from "react";
import { Loader2, Mic, PhoneOff } from "lucide-react";
import { MentorVoz, type EstadoVoz } from "@/components/mentor/mentor-voz";
import type { Bands, Conexao } from "@/components/mentor/skull-orb-fx";

const AVISO: Partial<Record<EstadoVoz["fase"], string>> = {
  plano: "Mentor por voz: planos pagos",
  esgotado: "Seus 3 minutos de hoje acabaram",
  indisponivel: "Voz indisponível agora",
};

export type FaseMentor = "repouso" | "processando" | "escutando" | "respondendo" | "erro";

/**
 * Botão "Falar com o Mentor". Ao tocar, abre a conversa por voz de sempre (sem tela própria): a energia real do áudio
 * vai para o fogo do Mentor por `onNivel`, e `onConn` diz em que fase a conversa está. Tocar de novo encerra.
 */
export function FalarComMentor({ ativo, onAtivo, onNivel, onConn, onFase }: { ativo: boolean; onAtivo: (v: boolean) => void; onNivel: (fn: (() => Bands) | null) => void; onConn: (c: Conexao) => void; /** Estado real da conversa, para a cena reagir (repouso, escutando, processando, respondendo, erro). */ onFase?: (f: FaseMentor) => void }) {
  const [e, setE] = useState<EstadoVoz | null>(null);
  // a mesma fonte de áudio real que alimenta a esfera também desenha as ondas ao lado do botão
  const fonteRef = useRef<(() => Bands) | null>(null);
  const caixaRef = useRef<HTMLSpanElement | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const fase = ativo ? e?.fase ?? "carregando" : "pronto";
  const aoVivo = fase === "ao-vivo";
  const conectando = ativo && (fase === "carregando" || fase === "conectando");

  const estado = (x: EstadoVoz) => {
    setE(x);
    onFase?.(x.fase === "ao-vivo" ? (x.speaking ? "respondendo" : "escutando") : x.fase === "erro" || x.fase === "indisponivel" ? "erro" : x.fase === "carregando" || x.fase === "conectando" ? "processando" : "repouso");
    onConn(x.fase === "ao-vivo" ? "live" : x.fase === "conectando" ? "connecting" : x.fase === "erro" ? "error" : "live");
    // plano gratuito, saldo esgotado ou falha: a sessão não abre, então o botão volta a ficar livre
    if (x.fase === "plano" || x.fase === "esgotado" || x.fase === "indisponivel" || x.fase === "erro" || x.fase === "encerrada") {
      setAviso(x.msg ?? AVISO[x.fase] ?? null);
      onNivel(null); fonteRef.current = null;
      queueMicrotask(() => onAtivo(false));
    }
  };

  return (
    <div className="hm-falar-caixa">
      {ativo && (
        <MentorVoz
          semTela
          autoStart
          boasVindas
          onEstado={estado}
          onLevel={(fn) => { fonteRef.current = fn; onNivel(fn); }}
        />
      )}
      <div className="hm-falar-linha">
        <OndaVoz lado="e" fonte={fonteRef} ativo={aoVivo} />
        <button
          type="button"
          className="hm-falar"
          data-estado={aoVivo ? "ao-vivo" : conectando ? "conectando" : "parado"}
          aria-pressed={aoVivo}
          disabled={conectando}
          onPointerMove={(ev: PE<HTMLButtonElement>) => {
            const r = ev.currentTarget.getBoundingClientRect();
            ev.currentTarget.style.setProperty("--mx", `${ev.clientX - r.left}px`);
            ev.currentTarget.style.setProperty("--my", `${ev.clientY - r.top}px`);
          }}
          onPointerDown={(ev: PE<HTMLButtonElement>) => {
            // onda de toque que nasce no ponto exato do dedo
            const alvo = caixaRef.current; if (!alvo) return;
            const r = ev.currentTarget.getBoundingClientRect();
            const t = document.createElement("i"); t.className = "hm-toque";
            t.style.setProperty("--x", `${ev.clientX - r.left}px`); t.style.setProperty("--y", `${ev.clientY - r.top}px`);
            t.addEventListener("animationend", () => t.remove()); alvo.appendChild(t);
          }}
          onClick={() => {
            if (ativo) {
              onNivel(null); fonteRef.current = null;
              onConn("live");
              onFase?.("repouso");
              onAtivo(false);
            } else {
              setE(null);
              setAviso(null);
              onAtivo(true);
            }
          }}
        >
          <span className="hm-falar-borda" aria-hidden />
          <span className="hm-falar-face" aria-hidden ref={caixaRef} />
          <span className="hm-falar-conteudo">
            {conectando ? <Loader2 size={18} className="hm-gira" aria-hidden /> : aoVivo ? <PhoneOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}
            <span className="hm-falar-texto">{conectando ? "Conectando" : aoVivo ? "Encerrar" : "Falar com o Mentor"}</span>
          </span>
        </button>
        <OndaVoz lado="d" fonte={fonteRef} ativo={aoVivo} />
      </div>
      <p className="hm-falar-info" role="status" aria-live="polite">
        {aoVivo ? (e?.speaking ? "Mentor falando" : "Mentor ouvindo") : ativo ? null : aviso}
      </p>
    </div>
  );
}

/**
 * Frequência de voz ao lado do botão, no estilo de espectro de rádio: muitas barras finas espelhadas que oscilam de forma
 * irregular (chiado), com marca de pico que cai devagar e um fio de portadora no centro. A energia segue o áudio real
 * (voz do Mentor e microfone do aluno); em repouso é só um chiado baixo e discreto.
 */
function OndaVoz({ lado, fonte, ativo }: { lado: "e" | "d"; fonte: RefObject<(() => Bands) | null>; ativo: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const ativoRef = useRef(ativo);
  useEffect(() => { ativoRef.current = ativo; }, [ativo]);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, ultimo = 0, nivel = 0, visivel = true;
    const MAX = 28;
    const altura = new Float32Array(MAX), alvoR = new Float32Array(MAX), pico = new Float32Array(MAX), relogio = new Float32Array(MAX);
    for (let i = 0; i < MAX; i++) { alvoR[i] = Math.random(); relogio[i] = Math.random() * 0.1; }
    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();
    const ro = new ResizeObserver(medir); ro.observe(cv);
    const io = new IntersectionObserver(([en]) => { visivel = !!en?.isIntersecting; }); io.observe(cv);
    const desenhar = (t: number) => {
      const dt = Math.min(0.05, (t - ultimo) / 1000 || 0.016); ultimo = t;
      const b = ativoRef.current ? fonte.current?.() : null;
      const alvo = b ? Math.min(1, Math.max(b.me ?? b.vol ?? 0, (b.mic ?? 0) * 1.1)) : 0;
      nivel += (alvo - nivel) * (1 - Math.exp(-dt * (alvo > nivel ? 18 : 7)));
      ctx.clearRect(0, 0, w, h);
      const n = Math.max(8, Math.min(MAX, Math.floor(w / 3.3)));
      const meio = h / 2, passo = w / n, larg = Math.max(1.4, passo * 0.5), maxMeia = h * 0.5 - 1;
      // fio de portadora central, que some nas pontas
      const fio = ctx.createLinearGradient(0, 0, w, 0);
      const forte = `rgba(255,86,92,${0.45 + 0.4 * nivel})`, fraco = "rgba(255,86,92,0)";
      if (lado === "e") { fio.addColorStop(0, fraco); fio.addColorStop(1, forte); } else { fio.addColorStop(0, forte); fio.addColorStop(1, fraco); }
      ctx.fillStyle = fio; ctx.fillRect(0, meio - 0.5, w, 1);
      ctx.lineCap = "butt"; ctx.lineWidth = larg;
      for (let i = 0; i < n; i++) {
        const d = i / (n - 1);                         // 0 = junto ao botão, 1 = ponta externa
        const x = lado === "e" ? w - passo * (i + 0.5) : passo * (i + 0.5);
        // chiado: cada barra sorteia um novo alvo a cada ~50–110 ms e corre para ele (movimento irregular de espectro)
        relogio[i] = (relogio[i] ?? 0) - dt;
        if ((relogio[i] ?? 0) <= 0) { alvoR[i] = Math.random(); relogio[i] = 0.05 + Math.random() * 0.06; }
        const ruido = alvoR[i] ?? 0;
        const env = Math.pow(1 - d, 0.9) * 0.78 + 0.22;
        const forma = 0.25 + 0.75 * ruido * ruido * (3 - 2 * ruido);  // realça picos, como espectro real
        const alvoBarra = ativoRef.current
          ? Math.min(1, 0.04 + nivel * forma * env * 1.35 + 0.03 * ruido)
          : 0.05 + 0.08 * ruido * env;
        const atual = altura[i] ?? 0;
        const nova = atual + (alvoBarra - atual) * (1 - Math.exp(-dt * (alvoBarra > atual ? 38 : 12)));
        altura[i] = nova;
        const meia = Math.max(0.8, nova * maxMeia);
        // marca de pico: sobe junto e desce devagar
        const p = Math.max(nova, (pico[i] ?? 0) - dt * 0.55); pico[i] = p;
        const q = 1 - d;                                // branco quente junto ao botão → vermelho na ponta
        const cor = `rgb(255,${Math.round(60 + 150 * q * q)},${Math.round(66 + 140 * q * q)})`;
        ctx.shadowColor = "rgba(255,37,45,0.9)"; ctx.shadowBlur = 3 + 9 * nivel;
        ctx.strokeStyle = cor; ctx.globalAlpha = 0.6 + 0.4 * env;
        ctx.beginPath(); ctx.moveTo(x, meio - meia); ctx.lineTo(x, meio + meia); ctx.stroke();
        if (p > nova + 0.02) {
          const pm = Math.max(0.8, p * maxMeia);
          ctx.shadowBlur = 0; ctx.globalAlpha = 0.9; ctx.fillStyle = "rgba(255,238,234,0.95)";
          ctx.fillRect(x - larg / 2, meio - pm - 1.6, larg, 1.4); ctx.fillRect(x - larg / 2, meio + pm + 0.2, larg, 1.4);
        }
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    };
    const laco = (t: number) => { raf = requestAnimationFrame(laco); if (visivel && !document.hidden) desenhar(t); };
    if (reduzir) desenhar(0); else raf = requestAnimationFrame(laco);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [lado, fonte]);
  return <canvas ref={ref} className="hm-onda-voz" data-lado={lado} aria-hidden />;
}
