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
 * Onda de voz ao lado do botão: linhas senoidais em camadas (estilo assistente de voz) desenhadas num canvas.
 * A amplitude segue o áudio real (voz do Mentor e microfone do aluno); em repouso é só uma respiração discreta.
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
    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();
    const ro = new ResizeObserver(medir); ro.observe(cv);
    const io = new IntersectionObserver(([en]) => { visivel = !!en?.isIntersecting; }); io.observe(cv);
    // camadas: [frequência, velocidade, amplitude relativa, espessura, alfa, branco]
    const camadas: [number, number, number, number, number, boolean][] = [
      [1.7, 2.3, 0.6, 3.4, 0.18, false], [2.3, -3.1, 0.8, 2.2, 0.35, false], [3.1, 4.2, 1, 1.5, 0.95, true],
    ];
    const desenhar = (t: number) => {
      const dt = Math.min(0.05, (t - ultimo) / 1000 || 0.016); ultimo = t;
      const b = ativoRef.current ? fonte.current?.() : null;
      const alvo = b ? Math.min(1, Math.max(b.me ?? b.vol ?? 0, (b.mic ?? 0) * 1.1)) : 0;
      nivel += (alvo - nivel) * (1 - Math.exp(-dt * (alvo > nivel ? 14 : 6)));
      fase += dt * (0.8 + nivel * 2.4);
      ctx.clearRect(0, 0, w, h);
      const meio = h / 2;
      const base = ativoRef.current ? 0.09 : 0.14 + 0.05 * Math.sin(t / 900);
      const amp = (base + nivel * 0.95) * (h * 0.46);
      for (const [f, v, k, esp, alfa, branco] of camadas) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 1.5) {
          const u = x / w;                                   // 0 = lado do botão, 1 = ponta externa
          const lado_u = lado === "e" ? 1 - u : u;           // 0 junto ao botão, 1 na ponta
          const env = Math.pow(Math.sin(Math.PI * Math.min(1, (1 - lado_u) * 0.92 + 0.04)), 1.1) * (1 - lado_u * 0.35);
          const y = meio + Math.sin(lado_u * Math.PI * 2 * f - fase * v) * amp * k * env + Math.sin(lado_u * 9 + fase * 1.7 * k) * amp * 0.12 * env * nivel;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineWidth = esp; ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.strokeStyle = branco ? `rgba(255,236,232,${alfa})` : `rgba(255,48,56,${alfa})`;
        ctx.stroke();
      }
    };
    const laco = (t: number) => { raf = requestAnimationFrame(laco); if (visivel && !document.hidden) desenhar(t); };
    if (reduzir) desenhar(0); else raf = requestAnimationFrame(laco);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [lado, fonte]);
  return <canvas ref={ref} className="hm-onda-voz" data-lado={lado} aria-hidden />;
}
