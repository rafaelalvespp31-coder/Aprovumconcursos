"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { Lock, Mic, PhoneOff } from "lucide-react";
import { formatClock } from "@/domain/mentor/voice";

type Fase = "carregando" | "plano" | "indisponivel" | "esgotado" | "pronto" | "conectando" | "ao-vivo" | "encerrada" | "erro";
type Status = { available: boolean; reason?: "plano" | "indisponivel"; limit: number; left: number };

const OUT_RATE = 24000;

const toB64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (b64: string) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};

/**
 * Conversa por voz com o Mentor (Gemini Live), só para dúvidas de estudo. O navegador fala direto
 * com o Google usando um token de uso único criado pelo servidor; o servidor controla o limite
 * diário (3 min) e a instrução do Mentor.
 */
export function MentorVoz({ base = "" }: { base?: string }) {
  const [fase, setFase] = useState<Fase>("carregando");
  const [left, setLeft] = useState(0);
  const [limit, setLimit] = useState(180);
  const [speaking, setSpeaking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ref = useRef<{
    session: Session | null;
    ctx: AudioContext | null;
    stream: MediaStream | null;
    node: AudioWorkletNode | null;
    sources: Set<AudioBufferSourceNode>;
    next: number;
    startedAt: number;
    leftAtStart: number;
    timer: ReturnType<typeof setInterval> | null;
    active: boolean;
  }>({ session: null, ctx: null, stream: null, node: null, sources: new Set(), next: 0, startedAt: 0, leftAtStart: 0, timer: null, active: false });

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/mentor/voz", { cache: "no-store" });
      const j = (await r.json()) as { status?: Status; error?: string };
      if (!r.ok || !j.status) throw new Error(j.error ?? "erro");
      const s = j.status;
      setLimit(s.limit);
      setLeft(s.left);
      setFase(!s.available ? (s.reason === "plano" ? "plano" : "indisponivel") : s.left <= 0 ? "esgotado" : "pronto");
    } catch {
      setMsg("Não foi possível carregar o Mentor por voz.");
      setFase("erro");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial do saldo de voz
    void carregar();
  }, [carregar]);

  /** Para o áudio e a conexão e avisa o servidor quanto tempo foi falado. */
  const encerrar = useCallback(async (motivo: "usuario" | "tempo" | "queda" | "saida") => {
    const r = ref.current;
    if (!r.active) return;
    r.active = false;
    if (r.timer) clearInterval(r.timer);
    r.timer = null;
    const seconds = Math.ceil((Date.now() - r.startedAt) / 1000);
    try {
      r.session?.close();
    } catch {
      /* já fechada */
    }
    r.node?.disconnect();
    r.stream?.getTracks().forEach((t) => t.stop());
    r.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* já parou */
      }
    });
    r.sources.clear();
    void r.ctx?.close().catch(() => {});
    r.session = r.ctx = r.stream = r.node = null;
    setSpeaking(false);
    let restante = Math.max(0, r.leftAtStart - seconds);
    try {
      const res = await fetch("/api/mentor/voz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end", seconds }), keepalive: true });
      const j = (await res.json()) as { left?: number };
      if (typeof j.left === "number") restante = j.left;
    } catch {
      /* o servidor também mede pelo relógio dele */
    }
    if (motivo === "saida") return;
    setLeft(restante);
    setMsg(motivo === "tempo" ? "Seus 3 minutos de hoje acabaram. Voltam amanhã!" : motivo === "queda" ? "A conexão caiu. Você pode tentar de novo." : null);
    setFase(restante <= 0 ? "esgotado" : "encerrada");
  }, []);

  // Sair da aba/painel (ou fechar a página) encerra a conversa e fecha o microfone.
  useEffect(() => {
    const out = () => void encerrar("saida");
    window.addEventListener("pagehide", out);
    return () => {
      window.removeEventListener("pagehide", out);
      void encerrar("saida");
    };
  }, [encerrar]);

  const tocar = (b64: string) => {
    const r = ref.current;
    const ctx = r.ctx;
    if (!ctx) return;
    const pcm = new Int16Array(fromB64(b64));
    const f = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f[i] = pcm[i]! / 0x8000;
    const buf = ctx.createBuffer(1, f.length, OUT_RATE);
    buf.copyToChannel(f, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const at = Math.max(r.next, ctx.currentTime + 0.02);
    src.start(at);
    r.next = at + buf.duration;
    r.sources.add(src);
    setSpeaking(true);
    src.onended = () => {
      r.sources.delete(src);
      if (r.sources.size === 0) setSpeaking(false);
    };
  };

  const onMessage = (m: LiveServerMessage) => {
    const r = ref.current;
    if (m.serverContent?.interrupted) {
      r.sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* já parou */
        }
      });
      r.sources.clear();
      r.next = 0;
      setSpeaking(false);
    }
    for (const p of m.serverContent?.modelTurn?.parts ?? []) {
      if (p.inlineData?.data && (p.inlineData.mimeType ?? "").startsWith("audio/")) tocar(p.inlineData.data);
    }
  };

  const iniciar = async () => {
    setMsg(null);
    setFase("conectando");
    const r = ref.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("mic");
      // O microfone é pedido antes de gastar o tempo do dia.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      r.stream = stream;
      const res = await fetch("/api/mentor/voz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const j = (await res.json()) as { session?: { token: string; model: string; voice: string; left: number; limit: number }; error?: string; code?: string };
      if (!res.ok || !j.session) {
        stream.getTracks().forEach((t) => t.stop());
        r.stream = null;
        setMsg(j.error ?? "Não foi possível iniciar agora.");
        if (j.code === "plan_limit") void carregar();
        else setFase("pronto");
        return;
      }
      const s = j.session;
      r.active = true;
      r.startedAt = Date.now();
      r.leftAtStart = s.left;
      r.next = 0;

      const ctx = new AudioContext();
      r.ctx = ctx;
      await ctx.audioWorklet.addModule("/voz-worklet.js");
      const ai = new GoogleGenAI({ apiKey: s.token, httpOptions: { apiVersion: "v1alpha" } });
      const session = await ai.live.connect({
        model: s.model,
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } } } },
        callbacks: {
          onmessage: onMessage,
          onerror: () => void encerrar("queda"),
          onclose: () => void encerrar("queda"),
        },
      });
      if (!r.active) {
        session.close();
        return;
      }
      r.session = session;

      const node = new AudioWorkletNode(ctx, "pcm16k");
      r.node = node;
      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        try {
          r.session?.sendRealtimeInput({ audio: { data: toB64(e.data), mimeType: "audio/pcm;rate=16000" } });
        } catch {
          /* conexão fechando */
        }
      };
      ctx.createMediaStreamSource(stream).connect(node);
      try {
        session.sendRealtimeInput({ text: "Cumprimente o aluno em uma frase curta e pergunte qual é a dúvida de estudo dele." });
      } catch {
        /* sem saudação: o aluno fala primeiro */
      }

      setLeft(s.left);
      setLimit(s.limit);
      setFase("ao-vivo");
      r.timer = setInterval(() => {
        const rest = r.leftAtStart - Math.floor((Date.now() - r.startedAt) / 1000);
        setLeft(Math.max(0, rest));
        if (rest <= 0) void encerrar("tempo");
      }, 500);
    } catch (e) {
      r.stream?.getTracks().forEach((t) => t.stop());
      r.stream = null;
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      const noMic = e instanceof DOMException && e.name === "NotFoundError";
      const wasActive = r.active;
      if (wasActive) await encerrar("saida");
      setMsg(denied ? "Permita o uso do microfone no navegador para falar com o Mentor." : noMic ? "Nenhum microfone foi encontrado neste aparelho." : "Não foi possível conectar o Mentor por voz agora. Tente novamente.");
      setFase("pronto");
    }
  };

  const ao_vivo = fase === "ao-vivo";
  const pct = Math.max(0, Math.min(100, (left / limit) * 100));

  return (
    <div className="voz" data-testid="mentor-voz" data-fase={fase}>
      {fase === "carregando" && <p className="text-[13px] text-[#64666D]">Carregando…</p>}

      {fase === "plano" && (
        <div className="voz-bloco">
          <span className="voz-orbe is-trava" aria-hidden>
            <Lock className="h-7 w-7" />
          </span>
          <p className="voz-titulo">Mentor por voz</p>
          <p className="voz-texto">Tire dúvidas de estudo falando, em tempo real, com o Mentor. Disponível nos planos pagos: 3 minutos por dia.</p>
          <Link href={`${base}/plano`} className="pc-botao" data-testid="voz-ver-planos">
            Ver planos
          </Link>
        </div>
      )}

      {fase === "indisponivel" && (
        <div className="voz-bloco">
          <p className="voz-titulo">Mentor por voz indisponível</p>
          <p className="voz-texto">Este recurso ainda não está ativo. Tente mais tarde.</p>
        </div>
      )}

      {fase === "esgotado" && (
        <div className="voz-bloco">
          <p className="voz-titulo">Seus 3 minutos de hoje acabaram</p>
          <p className="voz-texto">{msg ?? "Eles voltam amanhã. Enquanto isso, use a aba Conversar para tirar dúvidas por texto."}</p>
        </div>
      )}

      {(fase === "pronto" || fase === "encerrada" || fase === "erro" || fase === "conectando" || ao_vivo) && (
        <div className="voz-bloco">
          <span className={`voz-orbe ${ao_vivo ? (speaking ? "is-fala" : "is-escuta") : ""}`} aria-hidden>
            <Mic className="h-8 w-8" />
          </span>
          <p className="voz-titulo" aria-live="polite">
            {fase === "conectando" ? "Conectando…" : ao_vivo ? (speaking ? "Mentor falando…" : "Pode falar, estou ouvindo") : "Fale com o Mentor"}
          </p>
          <p className="voz-texto">{ao_vivo ? "Pergunte sobre qualquer matéria do seu concurso. Se quiser, interrompa o Mentor falando." : "Só dúvidas de estudo. Sua conversa é por voz e dura até 3 minutos por dia."}</p>

          <div className="voz-tempo" role="timer" aria-label="Tempo de voz que resta hoje" data-testid="voz-tempo">
            <div className="voz-barra" aria-hidden>
              <span style={{ width: `${pct}%` }} data-aviso={ao_vivo && left <= 20 ? "1" : undefined} />
            </div>
            <span className="voz-relogio">{formatClock(left)} restantes hoje</span>
          </div>

          {ao_vivo ? (
            <button type="button" onClick={() => void encerrar("usuario")} className="voz-fim" data-testid="voz-encerrar">
              <PhoneOff className="h-4 w-4" aria-hidden /> Encerrar conversa
            </button>
          ) : (
            <button type="button" onClick={() => void iniciar()} disabled={fase === "conectando"} className="pc-botao" data-testid="voz-iniciar">
              <Mic className="h-4 w-4" aria-hidden /> {fase === "conectando" ? "Conectando…" : "Falar com o Mentor"}
            </button>
          )}
          {msg && (
            <p role="alert" className="voz-erro">
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
