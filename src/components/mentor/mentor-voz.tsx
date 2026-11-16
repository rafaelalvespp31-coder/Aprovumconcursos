"use client";

import { anunciaLousa, linhaSchema, pedeLousa, type LinhaLousa, type Lousa } from "@/domain/mentor/lousa";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import type { Bands } from "./voz-orbe";
import { isFarewell } from "@/domain/mentor/voice";
import { detectPitch } from "@/domain/mentor/pitch";
import { VozView, type Fase } from "./voz-view";
import { VozOrbSolo } from "./voz-orb-solo";
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
export function MentorVoz({ base = "", getStudy, autoStart = false, orbOnly = false, orbSize = 96, onClose, onSpeaking, onLevel, onLousa }: { /** Entrega a função que lê a energia do áudio (volume/graves/médios/agudos). */ onLevel?: (nivel: () => Bands) => void; /** Avisa quando o Mentor começa/para de falar (ex.: borda do card chiando). */ onSpeaking?: (falando: boolean) => void; base?: string; /** Contexto da aula lido no instante em que a conversa começa. */ getStudy?: () => (StudyContext & { lessonId?: string }) | null; /** Começa sozinho assim que o saldo de voz carrega (aberto por um clique do aluno). */ autoStart?: boolean; /** Só a orbe animada, sem cartão nem textos (toque nela para encerrar). */ orbOnly?: boolean; /** Diâmetro da orbe no modo orbOnly. */ orbSize?: number; onClose?: () => void; /** Recebe a lousa (passos e desenho) quando o aluno pede uma conta, exemplo ou esquema. */ onLousa?: (l: Lousa | "pendente" | null, sync?: () => { c: number; fim: boolean }, vivo?: { quandos: number[]; agora: () => number }) => void }) {
  const [fase, setFase] = useState<Fase>("carregando");
  const [left, setLeft] = useState(0);
  const [limit, setLimit] = useState(180);
  const [unlimited, setUnlimited] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => { onSpeaking?.(speaking); }, [speaking, onSpeaking]);
  const onLevelRef = useRef(onLevel);
  useEffect(() => { onLevelRef.current = onLevel; });
  const [msg, setMsg] = useState<string | null>(null);
  const onLousaRef = useRef(onLousa);
  useEffect(() => { onLousaRef.current = onLousa; });
  const falaTurno = useRef("");
  const debLousa = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Roteiro em andamento: eventos (instante de reprodução → caracteres falados) para o quadro seguir a voz. */
  const roteiro = useRef<{ total: number; chars: number; ev: { t: number; c: number }[]; fim: boolean; tFim: number; pend: string[]; n: number; fechado: boolean; contando: boolean } | null>(null);
  const modeloTurno = useRef(false); // o Mentor está gerando uma resposta (não dá para mandar o próximo trecho agora)
  const lousaOcupada = useRef(false); // há uma lousa sendo montada/narrada: não abre outra
  const lousaAtual = useRef<{ titulo: string; linhas: LinhaLousa[] } | null>(null);
  /** Manda ao Mentor o próximo trecho do roteiro (só com ele livre; o primeiro trecho espera 2 falas para começar redondo). */
  const enviarParte = () => {
    const ro = roteiro.current;
    if (!ro || ro.fim || ro.pend.length === 0 || modeloTurno.current) return;
    
    const primeiro = ro.n === 0;
    const falas = ro.pend.splice(0);
    const texto = `${falas.map((f, i) => `${ro.n + i + 1}. ${f}`).join("\n")}`;
    ro.n += falas.length;
    ro.contando = true;
    const msg = primeiro
      ? `[ROTEIRO DA LOUSA] O quadro está sendo escrito na tela. Fale agora em voz alta, na ordem, sem pular nada e sem chamar função alguma, estas falas:\n${texto}`
      : `[ROTEIRO DA LOUSA — CONTINUAÇÃO] Continue de onde parou, sem repetir as anteriores:\n${texto}`;
    const enviar = () => { try { ref.current.session?.sendRealtimeInput({ text: msg }); } catch { /* sessão fechando */ } };
    modeloTurno.current = true;
    enviar();
    if (primeiro) { // vigia: se o Mentor não falar, reenvia uma vez; se ainda calar, o quadro escreve sozinho
      setTimeout(() => {
        const r1 = roteiro.current;
        if (r1 && r1.chars === 0 && !r1.fim) { enviar(); setTimeout(() => { const r2 = roteiro.current; if (r2 && r2.chars === 0 && !r2.fim) { roteiro.current = null; const a = lousaAtual.current; if (a) onLousaRef.current?.({ mostrar: true, titulo: a.titulo, linhas: [...a.linhas], desenho: [] }, undefined); } }, 6000); }
      }, 6000);
    }
  };
  const publicar = () => {
    const a = lousaAtual.current;
    if (!a) return;
    const ro = roteiro.current;
    onLousaRef.current?.({ mostrar: true, titulo: a.titulo, linhas: [...a.linhas], desenho: [] }, ro && ro.total > 0 ? progresso : undefined);
  };
  /** Recebe o quadro em fluxo (NDJSON): cada linha entra no quadro e no roteiro assim que o modelo a escreve. */
  const lerFluxo = async () => {
    const r = ref.current;
    let res: Response;
    try {
      res = await fetch("/api/mentor/lousa?stream=1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pedido: r.turn || falaTurno.current, study: getStudy?.() ?? undefined }) });
    } catch { res = new Response(null, { status: 500 }); }
    if (!res.ok || !res.body) { lousaOcupada.current = false; onLousaRef.current?.(null); return; }
    const acc = { titulo: "", linhas: [] as LinhaLousa[] };
    lousaAtual.current = acc;
    roteiro.current = { total: 0, chars: 0, ev: [], fim: false, tFim: 0, pend: [], n: 0, fechado: false, contando: false };
    const dec = new TextDecoder();
    const reader = res.body.getReader();
    let buf = "";
    let mostrou = false;
    const tratar = (linha: string) => {
      let o: Record<string, unknown>;
      try { o = JSON.parse(linha) as Record<string, unknown>; } catch { return; }
      const ro = roteiro.current;
      if (!ro) return;
      if ("mostrar" in o) { if (o.mostrar !== true) { roteiro.current = null; lousaAtual.current = null; lousaOcupada.current = false; onLousaRef.current?.(null); } else acc.titulo = typeof o.titulo === "string" ? o.titulo : ""; return; }
      if (o.fim) { ro.fechado = true; if (ro.total === 0 && acc.linhas.length > 0) { roteiro.current = null; lousaOcupada.current = false; publicar(); } else enviarParte(); return; }
      const ok = linhaSchema.safeParse(o);
      if (!ok.success) return;
      acc.linhas.push(ok.data);
      if (ok.data.fala) { ro.total += ok.data.fala.length; ro.pend.push(ok.data.fala); }
      mostrou = true;
      publicar();
      enviarParte();
    };
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) tratar(l); }
      }
      if (buf.trim()) tratar(buf.trim());
    } catch { /* fluxo caiu: segue com o que chegou */ }
    const ro = roteiro.current;
    if (ro && !ro.fechado) { ro.fechado = true; enviarParte(); }
    if (!mostrou && !roteiro.current) lousaOcupada.current = false;
    if (!mostrou && roteiro.current) { roteiro.current = null; lousaOcupada.current = false; onLousaRef.current?.(null); }
  };
  const dispararLousa = () => {
    if (debLousa.current) { clearTimeout(debLousa.current); debLousa.current = null; }
    if (lousaOcupada.current || !onLousaRef.current) return;
    lousaOcupada.current = true;
    onLousaRef.current("pendente");
    void lerFluxo();
  };
  const progresso = () => {
    const ro = roteiro.current; const ctx = ref.current.ctx;
    if (!ro || !ctx) return { c: 0, fim: false };
    const now = ctx.currentTime;
    if (ro.fim && now >= ro.tFim) return { c: ro.total, fim: true };
    let c0 = 0, t0 = -Infinity;
    for (const e of ro.ev) {
      const ini = Math.max(t0, e.t - (e.c - c0) / 13); // fala ~13 letras/s
      if (now < ini) return { c: c0, fim: false };
      if (now < e.t) return { c: c0 + ((e.c - c0) * (now - ini)) / Math.max(0.05, e.t - ini), fim: false };
      c0 = e.c; t0 = e.t;
    }
    return { c: Math.min(ro.total, c0), fim: false };
  };

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
  useEffect(() => { onLevelRef.current?.(nivel); }, [nivel]);

  const carregar = useCallback(async (force = false) => {
    try {
      const r = await fetch("/api/mentor/voz", { cache: "no-store" });
      const j = (await r.json()) as { status?: Status; error?: string };
      if (!r.ok || !j.status) throw new Error(j.error ?? "erro");
      const s = j.status;
      setLimit(s.limit);
      setLeft(s.left);
      setUnlimited(!!s.unlimited);
      const next: Fase = !s.available ? (s.reason === "plano" ? "plano" : "indisponivel") : s.left <= 0 ? "esgotado" : "pronto";
      setFase((f) => (force || f === "carregando" ? next : f));
    } catch {
      setMsg("Não foi possível carregar o Mentor por voz.");
      setFase((f) => (force || f === "carregando" ? "erro" : f));
    }
  }, []);

  useEffect(() => {
    void fetch("/voz-worklet.js").catch(() => undefined); // aquece o cache: a conversa começa mais rápido
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

  /** Fila de reprodução com colchão (jitter buffer): junta blocos pequenos e agenda sem folga entre eles. */
  const pend = useRef<{ f: Float32Array[]; n: number; timer: ReturnType<typeof setTimeout> | null }>({ f: [], n: 0, timer: null });
  const LEAD = 0.14; // colchão ao (re)começar a falar
  const flushFala = () => {
    const r = ref.current;
    const q = pend.current;
    if (q.timer) { clearTimeout(q.timer); q.timer = null; }
    const ctx = r.ctx;
    if (!ctx || q.n === 0) { q.f = []; q.n = 0; return; }
    const all = new Float32Array(q.n);
    let o = 0;
    for (const c of q.f) { all.set(c, o); o += c.length; }
    q.f = []; q.n = 0;
    const buf = ctx.createBuffer(1, all.length, OUT_RATE);
    buf.copyToChannel(all, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(r.aOut ?? ctx.destination);
    if (r.aF0) src.connect(r.aF0);
    const agora = ctx.currentTime;
    let at = r.next;
    if (at < agora + 0.01) { // fila vazia (começo da fala ou falta de áudio): recompõe o colchão em vez de tocar emendando
      at = agora + LEAD;
      const m = Math.min(all.length, 96); // rampa curtíssima: sem estalo no início
      for (let i = 0; i < m; i++) all[i] = all[i]! * (i / m);
      buf.copyToChannel(all, 0);
    }
    src.start(at);
    r.next = at + buf.duration;
    r.sources.add(src);
    setSpeaking(true);
    src.onended = () => {
      r.sources.delete(src);
      if (r.sources.size === 0) setSpeaking(false);
    };
  };
  const tocar = (b64: string) => {
    const r = ref.current;
    if (!r.ctx) return;
    const pcm = new Int16Array(fromB64(b64));
    const f = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f[i] = pcm[i]! / 0x8000;
    const q = pend.current;
    q.f.push(f); q.n += f.length;
    if (q.n >= OUT_RATE * 0.12) flushFala(); // ~120 ms por bloco
    else if (!q.timer) q.timer = setTimeout(flushFala, 45);
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
      if (pend.current.timer) clearTimeout(pend.current.timer);
      pend.current = { f: [], n: 0, timer: null };
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
    if (starts) modeloTurno.current = true;
    if (starts && !r.bye && isFarewell(r.turn)) {
      r.bye = true;
      r.byeTimer = setTimeout(() => void encerrar("usuario"), 15000); // rede de segurança
    }
    // Lousa: abre na hora (quando o aluno pede uma conta/exemplo/desenho ou o Mentor diz que vai anotar) e
    // monta o conteúdo em paralelo à fala; o quadro já aparece escrevendo e recebe o texto quando chega.
    if (replied) falaTurno.current += replied;
    if ((starts || replied) && (pedeLousa(r.turn) || anunciaLousa(falaTurno.current))) dispararLousa();
    if (said && onLousaRef.current && pedeLousa(r.turn)) { // dispara assim que o aluno termina o pedido, sem esperar o Mentor começar
      if (debLousa.current) clearTimeout(debLousa.current);
      debLousa.current = setTimeout(dispararLousa, 350);
    }
    if (replied) r.replied.push(replied);
    const ro = roteiro.current;
    const contar = !!(replied && ro && ro.contando && !ro.fim);
    if (contar) ro!.chars = Math.min(ro!.total, ro!.chars + replied!.length);
    if (m.serverContent?.turnComplete) {
      falaTurno.current = "";
      modeloTurno.current = false;
      if (ro && ro.contando && !ro.fim) {
        if (ro.fechado && ro.pend.length === 0) { ro.fim = true; ro.tFim = Math.max(r.next, r.ctx?.currentTime ?? 0); lousaOcupada.current = false; } // última fala dita: o quadro se completa no fim do áudio
        else enviarParte(); // ainda há trechos chegando: manda o próximo assim que o Mentor fica livre
      } else if (ro && !ro.contando) enviarParte(); // terminou o aviso curto: começa a narração
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
    if (contar && ro && r.ctx) ro.ev.push({ t: Math.max(r.next, r.ctx.currentTime), c: ro.chars });
  };

  const iniciar = async () => {
    setMsg(null);
    setFase("conectando");
    const r = ref.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("mic");
      // Microfone e liberação da conversa andam juntos (responde mais rápido). Se o microfone falhar,
      // a reserva de tempo é devolvida na hora (seconds: 0).
      const startReq = fetch("/api/mentor/voz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", study: getStudy?.() ?? undefined }) });
      const [micR, resR] = await Promise.allSettled([
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }),
        startReq,
      ]);
      const parse = async () => (resR.status === "fulfilled" ? ((await resR.value.json().catch(() => ({}))) as { session?: { token: string; model: string; voice: string; left: number; limit: number; unlimited?: boolean }; error?: string; code?: string }) : {});
      const j = await parse();
      if (micR.status === "rejected") {
        if (j.session) void fetch("/api/mentor/voz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end", seconds: 0 }) }).catch(() => undefined);
        throw micR.reason;
      }
      const stream = micR.value;
      r.stream = stream;
      if (resR.status !== "fulfilled" || !resR.value.ok || !j.session) {
        stream.getTracks().forEach((t) => t.stop());
        r.stream = null;
        setMsg(j.error ?? "Não foi possível iniciar agora.");
        if (j.code === "plan_limit") void carregar(true);
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
      roteiro.current = null; lousaOcupada.current = false; modeloTurno.current = false;

      // 24 kHz = a taxa da voz do Mentor: os blocos encaixam sem reamostrar um a um (sem estalos nem "engasgos")
      let ctx: AudioContext;
      try { ctx = new AudioContext({ sampleRate: OUT_RATE, latencyHint: "playback" }); } catch { ctx = new AudioContext(); }
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
    if (!autoStart || autoFeito.current) return;
    autoFeito.current = true;
    void iniciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  if (orbOnly) return <VozOrbSolo size={orbSize} fase={fase} speaking={speaking} msg={msg} level={nivel} onStart={() => void iniciar()} onClose={() => onClose?.()} />;
  return <VozView fase={fase} left={left} limit={limit} unlimited={unlimited} speaking={speaking} msg={msg} level={nivel} base={base} onStart={() => void iniciar()} onStop={() => void encerrar("usuario")} />;
}
