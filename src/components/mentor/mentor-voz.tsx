"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import type { Bands } from "./voz-orbe";
import { isFarewell } from "@/domain/mentor/voice";
import { detectPitch } from "@/domain/mentor/pitch";
import { VozView, type Fase } from "./voz-view";
import type { StudyContext } from "@/domain/mentor/study-context";

type Status = { available: boolean; reason?: "plano" | "indisponivel"; limit: number; left: number; unlimited?: boolean };

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
export function MentorVoz({ base = "", getStudy, autoStart = false }: { base?: string; /** Contexto da aula lido no instante em que a conversa começa. */ getStudy?: () => StudyContext | null; /** Começa sozinho assim que o saldo de voz carrega (aberto por um clique do aluno). */ autoStart?: boolean }) {
  const [fase, setFase] = useState<Fase>("carregando");
  const [left, setLeft] = useState(0);
  const [limit, setLimit] = useState(180);
  const [unlimited, setUnlimited] = useState(false);
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
    /** Transcrição da conversa (guardada como memória do Mentor). */
    said: string[];
    replied: string[];
    timer: ReturnType<typeof setInterval> | null;
    active: boolean;
    aOut: AnalyserNode | null;
    aIn: AnalyserNode | null;
    /** Janela maior só da voz do Mentor, para estimar o tom (f0). */
    aF0: AnalyserNode | null;
    f0buf: Float32Array<ArrayBuffer> | null;
    buf: Uint8Array<ArrayBuffer> | null;
    /** Fala do aluno neste turno e despedida detectada (encerra depois que o Mentor responder). */
    turn: string;
    bye: boolean;
    byeTimer: ReturnType<typeof setTimeout> | null;
  }>({ session: null, ctx: null, stream: null, node: null, sources: new Set(), next: 0, startedAt: 0, leftAtStart: 0, said: [], replied: [], timer: null, active: false, aOut: null, aIn: null, aF0: null, f0buf: null, buf: null, turn: "", bye: false, byeTimer: null });

  /** Energia do áudio de verdade (voz do Mentor e microfone): volume e faixas grave, média e aguda. */
  const nivel = useCallback((): Bands => {
    const r = ref.current;
    const read = (an: AnalyserNode | null, gain: number): Bands => {
      if (!an) return { vol: 0, low: 0, mid: 0, high: 0 };
      if (!r.buf || r.buf.length !== an.frequencyBinCount) r.buf = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(r.buf);
      const avg = (from: number, to: number) => {
        let sum = 0;
        for (let i = from; i < to; i++) sum += r.buf![i]!;
        return sum / (to - from) / 255;
      };
      const c = (v: number) => Math.min(1, v * gain);
      return { vol: c(avg(0, 64) * 3.2), low: c(avg(0, 6) * 2.4), mid: c(avg(6, 24) * 3.2), high: c(avg(24, 64) * 5) };
    };
    const o = read(r.aOut, 1);
    const m = read(r.aIn, 0.55);
    // Porta de ruído: silêncio de verdade deixa o orbe em repouso.
    const gate = (v: number) => (v < 0.035 ? 0 : v);
    // Tom da voz do Mentor (f0) e se há voz de fato; a caveira usa para acompanhar a entonação.
    let f0 = 0;
    let voiced = 0;
    if (r.aF0 && r.ctx && o.vol > 0.035) {
      if (!r.f0buf || r.f0buf.length !== r.aF0.fftSize) r.f0buf = new Float32Array(r.aF0.fftSize);
      r.aF0.getFloatTimeDomainData(r.f0buf);
      const p = detectPitch(r.f0buf, r.ctx.sampleRate);
      f0 = p.f0;
      voiced = p.voiced;
    }
    return { f0, voiced, vol: gate(Math.max(o.vol, m.vol)), low: gate(Math.max(o.low, m.low)), mid: gate(Math.max(o.mid, m.mid)), high: gate(Math.max(o.high, m.high)), me: gate(o.vol), mic: gate(m.vol) };
  }, []);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/mentor/voz", { cache: "no-store" });
      const j = (await r.json()) as { status?: Status; error?: string };
      if (!r.ok || !j.status) throw new Error(j.error ?? "erro");
      const s = j.status;
      setLimit(s.limit);
      setLeft(s.left);
      setUnlimited(!!s.unlimited);
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
    if (r.byeTimer) clearTimeout(r.byeTimer);
    r.byeTimer = null;
    r.bye = false;
    r.turn = "";
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
    r.session = r.ctx = r.stream = r.node = r.aOut = r.aIn = r.aF0 = null;
    setSpeaking(false);
    let restante = Math.max(0, r.leftAtStart - seconds);
    try {
      const res = await fetch("/api/mentor/voz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end", seconds, transcript: { student: r.said.join(" ").slice(-1800), mentor: r.replied.join(" ").slice(-1800) } }), keepalive: true });
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
    src.connect(r.aOut ?? ctx.destination);
    if (r.aF0) src.connect(r.aF0);
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
    const said = m.serverContent?.inputTranscription?.text;
    if (said) {
      r.said.push(said);
      r.turn = `${r.turn}${said}`;
    }
    const replied = m.serverContent?.outputTranscription?.text;
    // Despedida: quando o Mentor começa a responder, a fala do aluno já terminou; se ela for uma
    // despedida, deixa o Mentor se despedir e encerra a conversa em seguida.
    const starts = !!replied || (m.serverContent?.modelTurn?.parts ?? []).some((p) => p.inlineData?.data);
    if (starts && !r.bye && isFarewell(r.turn)) {
      r.bye = true;
      r.byeTimer = setTimeout(() => void encerrar("usuario"), 15000); // rede de segurança
    }
    if (replied) r.replied.push(replied);
    if (m.serverContent?.turnComplete) {
      if (r.bye) {
        const falta = r.ctx ? Math.max(0, r.next - r.ctx.currentTime) : 0;
        if (r.byeTimer) clearTimeout(r.byeTimer);
        r.byeTimer = setTimeout(() => void encerrar("usuario"), Math.min(8000, falta * 1000 + 500));
      }
      r.turn = r.bye ? r.turn : "";
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
      const res = await fetch("/api/mentor/voz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", study: getStudy?.() ?? undefined }) });
      const j = (await res.json()) as { session?: { token: string; model: string; voice: string; left: number; limit: number; unlimited?: boolean }; error?: string; code?: string };
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
      r.said = [];
      r.replied = [];
      r.turn = "";
      r.bye = false;
      r.next = 0;

      const ctx = new AudioContext();
      r.ctx = ctx;
      const aOut = ctx.createAnalyser();
      aOut.fftSize = 256;
      aOut.smoothingTimeConstant = 0.25; // acompanha a sílaba, sem atraso
      aOut.connect(ctx.destination);
      r.aOut = aOut;
      const aIn = ctx.createAnalyser();
      aIn.fftSize = 256;
      aIn.smoothingTimeConstant = 0.4;
      r.aIn = aIn;
      const aF0 = ctx.createAnalyser();
      aF0.fftSize = 2048; // ~42 ms a 48 kHz: cobre o tom mais grave da voz (cerca de 70 Hz)
      aF0.smoothingTimeConstant = 0;
      r.aF0 = aF0;
      await ctx.audioWorklet.addModule("/voz-worklet.js");
      const ai = new GoogleGenAI({ apiKey: s.token, httpOptions: { apiVersion: "v1alpha" } });
      const session = await ai.live.connect({
        model: s.model,
        config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {}, speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } } } },
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
      const mic = ctx.createMediaStreamSource(stream);
      mic.connect(node);
      mic.connect(aIn);
      try {
        session.sendRealtimeInput({ text: "Cumprimente o aluno logo de início com uma saudação curta e marcante, escolhendo uma destas: \"Fala, Caveira!\" ou \"Olá, futuro policial!\". Depois pergunte, em uma frase, qual é a dúvida de estudo dele." });
      } catch {
        /* sem saudação: o aluno fala primeiro */
      }

      setLeft(s.left);
      setLimit(s.limit);
      setUnlimited(!!s.unlimited);
      setFase("ao-vivo");
      r.timer = setInterval(() => {
        const rest = r.leftAtStart - Math.floor((Date.now() - r.startedAt) / 1000);
        if (s.unlimited) return; // admin: sem limite de tempo
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

  // Aberto por um clique do aluno (bolinha da aula): começa assim que o saldo carrega, uma vez só.
  const autoFeito = useRef(false);
  useEffect(() => {
    if (!autoStart || autoFeito.current || fase !== "pronto") return;
    autoFeito.current = true;
    void iniciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, fase]);

  return <VozView fase={fase} left={left} limit={limit} unlimited={unlimited} speaking={speaking} msg={msg} level={nivel} base={base} onStart={() => void iniciar()} onStop={() => void encerrar("usuario")} />;
}
