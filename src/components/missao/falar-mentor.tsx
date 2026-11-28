"use client";

import { useEffect, useRef, useState, type PointerEvent as PE, type RefObject } from "react";
import { ChevronRight, Loader2, Mic, PhoneOff } from "lucide-react";
import { MentorVoz, type EstadoVoz, type ResultadoComando } from "@/components/mentor/mentor-voz";
import type { Comando } from "@/domain/mentor/navegacao";
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
export function FalarComMentor({ navegacao, ativo, onAtivo, onNivel, onConn, onFase }: { /** O Mentor abre menus, páginas, concursos e aulas pelo que o aluno pede falando. */ navegacao?: (c: Comando) => Promise<ResultadoComando>; ativo: boolean; onAtivo: (v: boolean) => void; onNivel: (fn: (() => Bands) | null) => void; onConn: (c: Conexao) => void; /** Estado real da conversa, para a cena reagir (repouso, escutando, processando, respondendo, erro). */ onFase?: (f: FaseMentor) => void }) {
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
          navegacao={navegacao}
          onEstado={estado}
          onLevel={(fn) => { fonteRef.current = fn; onNivel(fn); }}
        />
      )}
      <div className="hm-falar-linha">
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
            <span className="hm-falar-mic" aria-hidden>
              {conectando ? <Loader2 className="hm-gira" /> : aoVivo ? <PhoneOff /> : <Mic />}
            </span>
            <span className="hm-falar-col">
              <span className="hm-falar-texto">{conectando ? "Conectando" : aoVivo ? "Encerrar conversa" : "Falar com o Mentor IA"}</span>
              <span className="hm-falar-sub">{aoVivo ? (e?.speaking ? "Mentor falando…" : "Mentor ouvindo…") : "Tire suas dúvidas, peça orientações e evolua ainda mais."}</span>
            </span>
            {/* com a conversa aberta, a frequência real da voz do Mentor aparece no lugar da seta */}
            {aoVivo ? <OndaVoz lado="d" fonte={fonteRef} ativo={aoVivo} /> : <ChevronRight className="hm-falar-seta" aria-hidden />}
          </span>
        </button>
      </div>
      <p className="hm-falar-info" role="status" aria-live="polite">
        {aoVivo ? null : ativo ? null : aviso}
      </p>
    </div>
  );
}

/**
 * Frequência de voz ao lado do botão: linhas de sinal distorcidas (estilo osciloscópio de rádio). Enquanto o Mentor não fala
 * é só um fio reto; quando ele fala, as linhas se distorcem e tremem de forma irregular, com a energia do áudio real da voz
 * do Mentor (o microfone do aluno não mexe nela).
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
    const K = 20;                                          // pontos de controle do ruído por linha
    // linhas: [frequência da portadora, velocidade, peso do ruído, espessura, alfa, branca, deslocamento de fase]
    const linhas: [number, number, number, number, number, boolean, number][] = [
      [5.2, 7.5, 0.85, 1.2, 0.95, true, 0], [3.4, -5.1, 0.7, 1.8, 0.55, false, 1.9], [7.8, 9.3, 1, 1.1, 0.4, false, 4.1],
    ];
    const pts = linhas.map(() => new Float32Array(K)), alvos = linhas.map(() => new Float32Array(K)), tempo = linhas.map(() => 0);
    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();
    const ro = new ResizeObserver(medir); ro.observe(cv);
    const io = new IntersectionObserver(([en]) => { visivel = !!en?.isIntersecting; }); io.observe(cv);
    const suave = (x: number) => x * x * (3 - 2 * x);
    const desenhar = (t: number) => {
      const dt = Math.min(0.05, (t - ultimo) / 1000 || 0.016); ultimo = t;
      const b = ativoRef.current ? fonte.current?.() : null;
      // só a voz do Mentor mexe na linha; parado, o nível cai rápido até o fio ficar reto
      const alvo = b ? Math.min(1, Math.max(0, b.me ?? 0)) : 0;
      nivel += (alvo - nivel) * (1 - Math.exp(-dt * (alvo > nivel ? 22 : 9)));
      fase += dt * (1 + nivel * 6);
      ctx.clearRect(0, 0, w, h);
      const meio = h / 2, ampMax = h * 0.47;
      const amp = nivel < 0.01 ? 0 : Math.min(1, nivel * 1.7) * ampMax;
      linhas.forEach(([f, v, ruidoPeso, esp, alfa, branca, deslocamento], li) => {
        const P = pts[li]!, A = alvos[li]!;
        tempo[li] = (tempo[li] ?? 0) - dt;
        if ((tempo[li] ?? 0) <= 0) { for (let i = 0; i < K; i++) A[i] = Math.random() * 2 - 1; tempo[li] = 0.04 + Math.random() * 0.05; }
        for (let i = 0; i < K; i++) P[i] = (P[i] ?? 0) + ((A[i] ?? 0) - (P[i] ?? 0)) * (1 - Math.exp(-dt * 30));
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        const cor = branca ? "255,240,236" : "255,48,56";
        if (lado === "e") { grad.addColorStop(0, `rgba(${cor},0)`); grad.addColorStop(0.35, `rgba(${cor},${alfa})`); grad.addColorStop(1, `rgba(${cor},${alfa})`); }
        else { grad.addColorStop(0, `rgba(${cor},${alfa})`); grad.addColorStop(0.65, `rgba(${cor},${alfa})`); grad.addColorStop(1, `rgba(${cor},0)`); }
        ctx.strokeStyle = grad; ctx.lineWidth = esp; ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.shadowColor = "rgba(255,37,45,0.95)"; ctx.shadowBlur = branca ? 5 + 7 * nivel : 7 + 9 * nivel;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 1) {
          const u = x / w;
          const lu = lado === "e" ? 1 - u : u;               // 0 = junto ao botão, 1 = ponta externa
          // envelope: a distorção nasce no botão e vai se apagando para fora
          const env = Math.pow(1 - lu, 0.7) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, lu * 0.9 + 0.1)));
          // ruído de valor com suavização cosseno entre pontos de controle
          const pos = Math.min(K - 1.001, u * (K - 1)), i0 = Math.floor(pos), fr = suave(pos - i0);
          const ruido = (P[i0] ?? 0) * (1 - fr) + (P[i0 + 1] ?? 0) * fr;
          const sinal = Math.sin(lu * Math.PI * 2 * f - fase * v + deslocamento) * (0.6 + 0.4 * Math.sin(lu * 11 + fase * 1.7 + deslocamento));
          const y = meio + amp * env * (ruidoPeso * 0.85 * ruido + (1 - ruidoPeso * 0.35) * 0.55 * sinal);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    };
    const laco = (t: number) => { raf = requestAnimationFrame(laco); if (visivel && !document.hidden) desenhar(t); };
    if (reduzir) desenhar(0); else raf = requestAnimationFrame(laco);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [lado, fonte]);
  return <canvas ref={ref} className="hm-onda-voz" data-lado={lado} aria-hidden />;
}
