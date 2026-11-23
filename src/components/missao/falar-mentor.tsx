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
 * Frequência de voz ao lado do botão: barras arredondadas espelhadas (equalizador) que saem do botão e afinam para fora,
 * com um fio de luz no centro. A altura segue o áudio real (voz do Mentor e microfone do aluno); em repouso é só uma
 * respiração discreta que viaja pelas barras.
 */
function OndaVoz({ lado, fonte, ativo }: { lado: "e" | "d"; fonte: RefObject<(() => Bands) | null>; ativo: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const ativoRef = useRef(ativo);
  useEffect(() => { ativoRef.current = ativo; }, [ativo]);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, ultimo = 0, nivel = 0, fase = 0, visivel = true;
    const N = 13;                                   // barras por lado (no máximo)
    const alturas = new Float32Array(N);            // 0..1, suavizadas por barra
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
      nivel += (alvo - nivel) * (1 - Math.exp(-dt * (alvo > nivel ? 16 : 6)));
      fase += dt * (1.2 + nivel * 5);
      ctx.clearRect(0, 0, w, h);
      const n = Math.max(5, Math.min(N, Math.floor(w / 6.5)));   // menos barras (mais grossas) quando sobra pouca largura
      const meio = h / 2, passo = w / n, larg = Math.max(2.2, passo * 0.6);
      const maxMeia = h * 0.5 - larg / 2;
      // fio de luz central que some nas pontas
      const fio = ctx.createLinearGradient(0, 0, w, 0);
      const forte = "rgba(255,70,78,0.55)", fraco = "rgba(255,70,78,0)";
      if (lado === "e") { fio.addColorStop(0, fraco); fio.addColorStop(1, forte); } else { fio.addColorStop(0, forte); fio.addColorStop(1, fraco); }
      ctx.fillStyle = fio; ctx.fillRect(0, meio - 0.5, w, 1);
      for (let i = 0; i < n; i++) {
        const d = i / (n - 1);                        // 0 = junto ao botão, 1 = ponta externa
        const x = lado === "e" ? w - passo * (i + 0.5) : passo * (i + 0.5);
        const env = Math.pow(1 - d, 0.75) * 0.82 + 0.18;
        // "espectro": várias senoides defasadas por barra, dando alturas diferentes e vivas
        const viva = 0.5 + 0.5 * Math.sin(i * 1.7 - fase * 2.1) * Math.sin(i * 0.63 + fase * 1.3 + 1.1);
        const respira = 0.5 + 0.5 * Math.sin(t / 650 - d * 3.2);
        const alvoBarra = ativoRef.current
          ? Math.min(1, 0.07 + nivel * (0.3 + 0.7 * Math.abs(viva)) * env * 1.25)
          : 0.08 + 0.2 * respira * env;
        const atual = alturas[i] ?? 0;
        const nova = atual + (alvoBarra - atual) * (1 - Math.exp(-dt * (alvoBarra > atual ? 26 : 10)));
        alturas[i] = nova;
        const meia = Math.max(larg / 2, nova * maxMeia);
        const q = 1 - d;                              // cor: branco quente junto ao botão → vermelho na ponta
        const g = ctx.createLinearGradient(0, meio - meia, 0, meio + meia);
        const topo = `rgba(255,${Math.round(70 + 170 * q * q)},${Math.round(76 + 160 * q * q)},${0.55 + 0.4 * env})`;
        g.addColorStop(0, topo); g.addColorStop(0.5, `rgba(255,${Math.round(90 + 150 * q)},${Math.round(96 + 140 * q)},${0.95})`); g.addColorStop(1, topo);
        ctx.strokeStyle = g; ctx.lineWidth = larg; ctx.lineCap = "round";
        ctx.shadowColor = "rgba(255,37,45,0.85)"; ctx.shadowBlur = 4 + 10 * nivel;
        ctx.beginPath(); ctx.moveTo(x, meio - meia + larg / 2); ctx.lineTo(x, meio + meia - larg / 2); ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };
    const laco = (t: number) => { raf = requestAnimationFrame(laco); if (visivel && !document.hidden) desenhar(t); };
    if (reduzir) desenhar(0); else raf = requestAnimationFrame(laco);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [lado, fonte]);
  return <canvas ref={ref} className="hm-onda-voz" data-lado={lado} aria-hidden />;
}
