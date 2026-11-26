"use client";

import { descreverQuadro } from "@/domain/mentor/catalogo-lousa";
import { comandoDitado, fimDitado, frasesDe, linhaDitado, novoDitado, type EstadoDitado } from "@/domain/mentor/ditado";
import { esquemasDe, fimTempo, novoCtx, type Ctx as EsquemaCtx } from "@/domain/mentor/esquemas";
import { travaDeAssunto } from "@/domain/mentor/trava";
import { comandoDaFalaDoMentor, interpretarComando, perguntaDoMentor, type Comando } from "@/domain/mentor/navegacao";
import { ehConversa, linhaSchema, tituloDaFala, linhaDeFala, linhaTitulo, pedeLousa, pedeFechar, pedidoDeCalculo, linhaDeNumero, tituloDe, type LinhaLousa, type Lousa } from "@/domain/mentor/lousa";
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
/** O que um botão próprio precisa saber da conversa por voz. */
/** Resposta da tela a um pedido de navegação por voz: `aviso` vai para o Mentor (ex.: não achei a aula); `depois` abre a página quando ele terminar de falar. */
export type ResultadoComando = { aviso?: string; depois?: () => void } | null;

export type EstadoVoz = { fase: Fase; msg: string | null; speaking: boolean; left: number; unlimited: boolean };

export function MentorVoz({ navegacao, base = "", getStudy, autoStart = false, orbOnly = false, orbSize = 96, onClose, onSpeaking, onLevel, onLousa, onEstado, semTela = false, boasVindas = false, professor }: { /** Professora ("a") ou Professor ("o") Aprovum: define a voz da conversa. */ professor?: "a" | "o"; /** Abertura da tela inicial: o Mentor fala uma única mensagem personalizada e escuta (o servidor monta o conteúdo). */ boasVindas?: boolean; /** Tela inicial: o Mentor abre menus, páginas, concursos e aulas pelo que o aluno pede falando. Devolve o que fazer depois. */ navegacao?: (c: Comando) => Promise<ResultadoComando>; /** Avisa a fase, a mensagem e o saldo de voz a cada mudança (para um botão próprio). */ onEstado?: (e: EstadoVoz) => void; /** Só a lógica (áudio, saldo, conexão): não desenha nada. */ semTela?: boolean; /** Entrega a função que lê a energia do áudio (volume/graves/médios/agudos). */ onLevel?: (nivel: () => Bands) => void; /** Avisa quando o Mentor começa/para de falar (ex.: borda do card chiando). */ onSpeaking?: (falando: boolean) => void; base?: string; /** Contexto da aula lido no instante em que a conversa começa. */ getStudy?: () => (StudyContext & { lessonId?: string }) | null; /** Começa sozinho assim que o saldo de voz carrega (aberto por um clique do aluno). */ autoStart?: boolean; /** Só a orbe animada, sem cartão nem textos (toque nela para encerrar). */ orbOnly?: boolean; /** Diâmetro da orbe no modo orbOnly. */ orbSize?: number; onClose?: () => void; /** Recebe a lousa (passos e desenho) quando o aluno pede uma conta, exemplo ou esquema. */ onLousa?: (l: Lousa | "pendente" | "fechar" | null, sync?: () => { c: number; fim: boolean }, vivo?: { quandos: number[]; agora: () => number }) => void }) {
  const [fase, setFase] = useState<Fase>("carregando");
  const [left, setLeft] = useState(0);
  const [limit, setLimit] = useState(180);
  const [unlimited, setUnlimited] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => { onSpeaking?.(speaking); }, [speaking, onSpeaking]);
  const onEstadoRef = useRef(onEstado);
  useEffect(() => { onEstadoRef.current = onEstado; });
  const onLevelRef = useRef(onLevel);
  useEffect(() => { onLevelRef.current = onLevel; });
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { onEstadoRef.current?.({ fase, msg, speaking, left, unlimited }); }, [fase, msg, speaking, left, unlimited]);
  const onLousaRef = useRef(onLousa);
  useEffect(() => { onLousaRef.current = onLousa; });
  const falaTurno = useRef("");
  const navegacaoRef = useRef(navegacao);
  useEffect(() => { navegacaoRef.current = navegacao; });
  const cmdTurno = useRef(false); // já tratei o pedido de navegação deste turno do aluno
  const perguntou = useRef({ concurso: false, aula: false }); // a última fala do Mentor perguntou qual concurso / qual aula
  const debCmd = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ofertaQuadro = useRef(false); // o Mentor terminou a explicação oferecendo exemplificar no quadro
  const pedidoAnterior = useRef(""); // a pergunta do aluno que ele acabou de explicar
  const debLousa = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Roteiro em andamento: eventos (instante de reprodução → caracteres falados) para o quadro seguir a voz. */
  const roteiro = useRef<{ total: number; chars: number; ev: { t: number; c: number }[]; fim: boolean; tFim: number; pend: string[]; n: number; fechado: boolean; contando: boolean } | null>(null);
  const modeloTurno = useRef(false); // o Mentor está gerando uma resposta (não dá para mandar o próximo trecho agora)
  const lousaOcupada = useRef(false); // há uma lousa sendo montada/narrada: não abre outra
  const lousaAtual = useRef<{ titulo: string; linhas: LinhaLousa[]; quandos: number[]; vivo: { quandos: number[]; agora: () => number } } | null>(null);
  /**
   * Lousa ao vivo por TRANSCRIÇÃO: nada de chamada extra ao servidor nem função. A lousa abre no pedido e cada frase que o
   * Mentor fala vira uma linha escrita, no instante em que o áudio daquela frase toca.
   */
  type IA = { abort: AbortController; linhas: LinhaLousa[]; titulo: string; fim: boolean; usando: boolean };
  type Trans = { fechada?: boolean; soNum?: boolean; ia?: IA; modo: "texto" | "ditado" | "ia"; dit?: EstadoDitado; esq: EsquemaCtx; flush: ReturnType<typeof setTimeout> | null; buf: string; linhas: LinhaLousa[]; quandos: number[]; titulo: string; pulou: boolean; t0: number; msTexto: number | null; msTraco: number | null; modo0: "texto" | "ditado"; timer: ReturnType<typeof setTimeout> | null };
  const trans = useRef<Trans | null>(null);
  const agoraS = () => performance.now() / 1000;
  const publicarTrans = () => {
    const m = trans.current;
    if (!m) return;
    if (m.msTraco === null && m.linhas.length > 0) m.msTraco = Math.round(performance.now() - m.t0);
    onLousaRef.current?.({ mostrar: true, titulo: m.titulo, linhas: [...m.linhas], desenho: [] }, undefined, { quandos: [...m.quandos], agora: agoraS });
  };
  const PEDE_DESENHO = /desenh|esquema|diagrama|linha do tempo|mapa mental|ilustr|rabisc|calcul|\bconta\b|mmc|mdc|regra de tr|fluxo|passo a passo|exemplo|resolv|equa[cç]|porcentag|fra[cç][aã]o|divis[aã]o|multiplica|soma|subtra/i;
  const telaLarga = () => typeof window !== "undefined" && window.innerWidth >= 760;
  const fimTrans = () => {
    const m = trans.current;
    if (!m) return;
    if (m.timer) clearTimeout(m.timer);
    if (m.ia?.usando && !m.ia.fim && performance.now() - m.t0 < 45000) { m.timer = setTimeout(fimTrans, 1500); return; } // a IA ainda está escrevendo
    m.ia?.abort.abort();
    trans.current = null;
    lousaOcupada.current = false;
    if (m.msTexto !== null || m.msTraco !== null) void fetch("/api/mentor/lousa/tempo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modo: m.modo0, largo: telaLarga(), ms_texto: m.msTexto, ms_traco: m.msTraco, ms_fim: Math.min(300000, Math.round(performance.now() - m.t0)) }) }).catch(() => undefined);
    if (m.modo !== "ia" && (m.linhas.length >= 4 || (m.dit && m.dit.itens.length >= 6))) void fetch("/api/mentor/lousa/salvas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lousa: { mostrar: true, titulo: m.titulo, linhas: m.linhas, desenho: [] } }) }).catch(() => undefined);
  };
  /** Uma frase falada → linha do quadro (ou nada, se for abertura/fechamento/pergunta). */
  const novaLinha = (frase: string) => {
    const m = trans.current;
    if (!m || ehConversa(frase)) return;
    const l = linhaDeFala(frase, m.linhas.length === 0, m.linhas.length);
    if (!l) return;
    if (m.soNum && !linhaDeNumero(l)) return; // matemática: a explicação em palavras fica só na voz
    if (!m.titulo) {
      m.titulo = tituloDaFala(frase) ?? tituloDe(r0Turno.current);
      m.linhas.push(linhaTitulo(m.titulo));
      m.quandos.push(agoraS());
    }
    // começa quando o áudio dessa frase começa a tocar (o texto chega antes do som)
    const r = ref.current;
    const adiante = r.ctx ? Math.max(0, r.next - r.ctx.currentTime) : 0;
    const dur = Math.min(adiante, frase.length / 13);
    const quando = Math.max(agoraS() + Math.max(0, adiante - dur), (m.quandos[m.quandos.length - 1] ?? 0) + 0.15);
    m.linhas.push(l);
    m.quandos.push(quando);
    for (const d of esquemasDe(frase, m.esq)) { m.linhas.push(d); m.quandos.push(quando + 0.25); } // esquema do exemplo (tabela, conta armada, linha do tempo…)
    if (m.timer) { clearTimeout(m.timer); m.timer = null; }
    publicarTrans();
  };
  /** Diagrama ditado: cada comando falado ("Título:", "Caixa:", "Item:"…) vira traços no instante em que o áudio chega nele. */
  const ouvirDitado = (m: Trans, fimDoTurno: boolean) => {
    const { frases, resto } = frasesDe(m.buf);
    m.buf = resto;
    if (fimDoTurno && resto.trim()) { frases.push(resto); m.buf = ""; }
    const r = ref.current;
    let mudou = false;
    for (const fr of frases) {
      if (!m.titulo) { const tf = tituloDaFala(fr); if (tf) m.titulo = tf; }
      const adiante = r.ctx ? Math.max(0, r.next - r.ctx.currentTime) : 0;
      if (comandoDitado(m.dit!, fr, Math.min(10, Math.max(0, adiante - fr.length / 13)))) mudou = true;
    }
    if (fimDoTurno && fimDitado(m.dit!)) mudou = true;
    if (m.flush) clearTimeout(m.flush);
    m.flush = setTimeout(() => { const g = trans.current; if (g?.modo === "ditado" && g.buf.trim().length >= 14 && /^(t[ií]tulo|subt|linha do tempo|marco|caixa|item|ponto|t[oó]pico|exemplo|destaque|aten|cuidado|resumo|seta|tabela|linha|cruzar|conta|passo|resposta|mmc|mdc|arma|divis|frase|sujeito|predicado|camada|cadeia|coluna|pessoa|objeto)/i.test(g.buf.trim())) { comandoDitado(g.dit!, g.buf, 0); g.buf = ""; g.linhas = [linhaDitado(g.dit!)]; publicarTrans(); } }, 1500);
    if (mudou) {
      if (!m.titulo) m.titulo = tituloDe(r0Turno.current);
      if (m.timer) { clearTimeout(m.timer); m.timer = null; }
      m.linhas = [linhaDitado(m.dit!)];
      m.quandos = [m.quandos[0] ?? agoraS()];
      publicarTrans();
    }
    if (fimDoTurno) { if (m.timer) clearTimeout(m.timer); m.timer = setTimeout(fimTrans, 2500); }
  };
  /** Terminada a explicação (fim do turno), o que o Mentor disser depois não vai mais para a lousa. */
  const ouvirFala = (texto: string, fimDoTurno: boolean) => {
    const m = trans.current;
    if (!m || m.fechada) return;
    ouvirFalaAberta(m, texto, fimDoTurno);
    if (fimDoTurno) m.fechada = true;
  };
  const ouvirFalaAberta = (m: Trans, texto: string, fimDoTurno: boolean) => {
    if (m.modo === "ia") { if (fimDoTurno) { if (m.timer) clearTimeout(m.timer); m.timer = setTimeout(fimTrans, 2500); } return; }
    if (m.msTexto === null && texto.trim()) m.msTexto = Math.round(performance.now() - m.t0);
    m.buf += texto;
    // o Mentor começou a ditar ("Título: …"): passa para o modo desenho, mesmo que o pedido não tenha dito "desenhe"
    if (m.modo === "texto" && (/\d[^.!?]{0,40}\b(vezes|dividido|igual a|mais|menos)\b[^.!?]{0,30}\d|\b(mmc|mdc)\b|dividir por \d|\b(1[0-9]{3}|20[0-9]{2})\b/i.test(m.buf) || /(?:^|[.!?]\s+)(?:t[ií]tulo|tabela|conta|mmc|mdc|armada|divis[aã]o|linha do tempo|caixa|frase|camada|cadeia|coluna)\s*[:,]/i.test(m.buf))) { m.modo = "ditado"; m.linhas = []; m.quandos = []; m.dit = novoDitado(telaLarga()); }
    if (m.modo === "ditado") { ouvirDitado(m, fimDoTurno); return; }
    const partes = m.buf.split(/(?<=[.!?:;])\s+/);
    m.buf = partes.pop() ?? "";
    for (const p of partes) novaLinha(p);
    // sem pontuação: se o Mentor parou um instante, escreve o que já falou (não deixa a lousa esperando)
    if (m.flush) clearTimeout(m.flush);
    m.flush = setTimeout(() => { const g = trans.current; if (g && g.buf.trim().length >= 18) { novaLinha(g.buf); g.buf = ""; } }, 700);
    if (m.buf.length > 90) { const i = m.buf.lastIndexOf(","); if (i > 30) { novaLinha(m.buf.slice(0, i)); m.buf = m.buf.slice(i + 1).trim(); } }
    if (fimDoTurno) {
      if (m.buf.trim()) novaLinha(m.buf);
      m.buf = "";
      for (const d of fimTempo(m.esq)) { m.linhas.push(d); m.quandos.push(agoraS() + 0.3); publicarTrans(); }
      if (m.timer) clearTimeout(m.timer);
      m.timer = setTimeout(fimTrans, 2500);
    }
  };
  /** Em paralelo ao quadro local: a IA monta o quadro certo (português revisado, esquema desenhado) em fluxo; ao chegar, ele assume. */
  const localTemVisual = (m: Trans) => !!m.dit && (!!m.dit.mmc || m.dit.linhasTab.length > 0 || m.dit.marcos > 0 || m.dit.caixas >= 2 || m.dit.camadas > 0 || !!m.dit.frase || Object.keys(m.dit.cenas).length > 0);
  const iniciarIA = (m: Trans, pedido: string) => {
    if (!pedido.trim()) return;
    const ia: IA = { abort: new AbortController(), linhas: [], titulo: "", fim: false, usando: false };
    m.ia = ia;
    void (async () => {
      try {
        const res = await fetch("/api/mentor/lousa?stream=1", { method: "POST", signal: ia.abort.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pedido: pedido.slice(0, 500), study: getStudy?.() ?? undefined }) });
        if (!res.ok || !res.body) { ia.fim = true; return; }
        const rd = res.body.getReader(); const dec = new TextDecoder(); let resto = "";
        for (;;) {
          const { value, done } = await rd.read();
          if (done) break;
          resto += dec.decode(value, { stream: true });
          const partes = resto.split("\n"); resto = partes.pop() ?? "";
          for (const bruta of partes) {
            let o: Record<string, unknown>;
            try { o = JSON.parse(bruta) as Record<string, unknown>; } catch { continue; }
            if (trans.current !== m) { ia.abort.abort(); return; }
            if (o.mostrar === false) { ia.fim = true; return; }
            if (o.fim) { ia.fim = true; continue; }
            if ("mostrar" in o) { ia.titulo = typeof o.titulo === "string" ? o.titulo : ""; continue; }
            const ok = linhaSchema.safeParse(o); // cada linha é validada sozinha: uma quebrada não derruba o quadro
            if (!ok.success) continue;
            if (m.soNum && !linhaDeNumero(ok.data)) continue; // matemática: sem frases explicativas
            ia.linhas.push(ok.data);
            if (!ia.usando) {
              if (localTemVisual(m) || (ia.linhas.length < 3 && !ia.linhas.some((l) => l.tipo === "desenho"))) continue; // espera ter o que mostrar
              ia.usando = true; m.modo = "ia"; m.linhas = []; m.quandos = []; m.titulo = ia.titulo || m.titulo;
              if (m.flush) clearTimeout(m.flush);
              for (const l of ia.linhas) { m.linhas.push(l); m.quandos.push(agoraS() + 0.15 * m.quandos.length); }
            } else { m.linhas.push(ok.data); m.quandos.push(Math.max(agoraS(), (m.quandos[m.quandos.length - 1] ?? 0) + 0.25)); }
            if (m.timer) { clearTimeout(m.timer); m.timer = null; }
            publicarTrans();
          }
        }
        ia.fim = true;
      } catch { ia.fim = true; }
    })();
  };
  /** Aula aberta: o quadro pronto (tabela/comparação/casos da aula catalogada) sai do banco e vai direto para o desenho, sem esperar voz nem IA. */
  const buscarCatalogo = (m: Trans, pedido: string): Promise<boolean> => {
    const lessonId = getStudy?.()?.lessonId;
    if (!lessonId) return Promise.resolve(false);
    return fetch(`/api/mentor/lousa/aula?lessonId=${encodeURIComponent(lessonId)}&pedido=${encodeURIComponent(pedido.slice(0, 300))}&largo=${telaLarga() ? 1 : 0}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { quadro?: { titulo: string; roteiro: string[] } | null } | null) => {
        const q = j?.quadro;
        if (!q || trans.current !== m || m.modo === "ia" || localTemVisual(m)) return false;
        m.ia?.abort.abort();
        const dit = novoDitado(telaLarga());
        q.roteiro.forEach((c, i) => comandoDitado(dit, c, i * 0.45)); // cada comando entra no seu tempo: o quadro é escrito aos poucos, como um professor
        m.dit = dit; m.modo = "ia"; m.ia = { abort: new AbortController(), linhas: [], titulo: q.titulo, fim: true, usando: true };
        if (m.flush) clearTimeout(m.flush);
        m.titulo = q.titulo; m.linhas = [linhaDitado(dit)]; m.quandos = [agoraS()];
        if (m.timer) { clearTimeout(m.timer); m.timer = null; }
        publicarTrans();
        // o Mentor descreve em voz o que está no quadro: é o exemplo DA AULA, não outro
        try { ref.current.session?.sendRealtimeInput({ text: `[AVISO DO APLICATIVO] O quadro já está aparecendo para o aluno com o exemplo que está DENTRO DA AULA. Descreva em voz alta, em ordem e com suas palavras, exatamente o que está escrito e desenhado no quadro, citando o exemplo da aula. Não troque por outro exemplo e não invente dados que não estão nele. Conteúdo do quadro: ${descreverQuadro(q.titulo, q.roteiro)}` }); } catch { /* sessão encerrada */ }
        return true;
      }).catch(() => false);
  };
  const ctxAula = useRef<{ lessonId: string; atual: string; outras: string[] } | null>(null); // aula aberta e as outras da trilha (trava de assunto)
  const carregarCtxAula = () => {
    const lessonId = getStudy?.()?.lessonId;
    if (!lessonId || ctxAula.current?.lessonId === lessonId) return;
    fetch(`/api/mentor/lousa/aula?lessonId=${encodeURIComponent(lessonId)}&contexto=1`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { atual?: string; outras?: string[] } | null) => { if (j?.atual) ctxAula.current = { lessonId, atual: j.atual, outras: j.outras ?? [] }; })
      .catch(() => undefined);
  };
  /** O aluno pediu o quadro de um assunto que é de OUTRA aula: não abre; o Mentor explica que ainda não chegou nessa aula. */
  const travouAssunto = (pedido: string): boolean => {
    const c = ctxAula.current;
    if (!c) return false;
    const outra = travaDeAssunto(pedido, c.atual, c.outras);
    if (!outra) return false;
    bloqueioLousa.current = true; // até o fim deste turno nada abre nem escreve
    try { ref.current.session?.sendRealtimeInput({ text: `[AVISO DO APLICATIVO] O aluno pediu um assunto que é da aula "${outra}", que ainda não chegou; agora vocês estão na aula "${c.atual}". Não ensine nem desenhe esse assunto agora. Diga com gentileza, em uma ou duas frases, que isso será visto na aula "${outra}", que quando chegar nela você explica com exemplo e no quadro, e ofereça continuar a aula atual.` }); } catch { /* sessão já encerrada */ }
    return true;
  };
  const r0Turno = useRef("");
  const bloqueioLousa = useRef(false); // "fecha a lousa": até o fim deste turno nada abre nem escreve
  /** O aluno mandou fechar: fecha a lousa e para de escrever na hora. */
  const fecharPorVoz = () => {
    bloqueioLousa.current = true;
    if (debLousa.current) { clearTimeout(debLousa.current); debLousa.current = null; }
    const m = trans.current;
    if (m) { if (m.timer) clearTimeout(m.timer); if (m.flush) clearTimeout(m.flush); m.ia?.abort.abort(); }
    trans.current = null;
    lousaOcupada.current = false;
    onLousaRef.current?.("fechar");
  };
  const dispararLousa = () => {
    if (debLousa.current) { clearTimeout(debLousa.current); debLousa.current = null; }
    if (lousaOcupada.current || !onLousaRef.current) return;
    if (travouAssunto(ref.current.turn || falaTurno.current)) return;
    lousaOcupada.current = true;
    r0Turno.current = ref.current.turn || falaTurno.current;
    onLousaRef.current("pendente"); // abre já: a caneta desenha o card enquanto o Mentor começa a falar
    trans.current = { modo: PEDE_DESENHO.test(ref.current.turn || falaTurno.current) ? "ditado" : "texto", dit: novoDitado(telaLarga()), esq: novoCtx(ref.current.turn || falaTurno.current), flush: null, buf: "", linhas: [], quandos: [], titulo: "", pulou: false, t0: performance.now(), msTexto: null, msTraco: null, modo0: PEDE_DESENHO.test(ref.current.turn || falaTurno.current) ? "ditado" : "texto", timer: setTimeout(() => { if (trans.current && trans.current.linhas.length === 0) { onLousaRef.current?.(null); fimTrans(); } }, 25000) };
    // o aluno já disse o que quer ("MMC de 12 e 18"): o primeiro traço sai agora, sem esperar a fala do Mentor
    const g = trans.current;
    if (g) { g.soNum = pedidoDeCalculo(ref.current.turn || falaTurno.current); if (g.dit && g.soNum) g.dit.mat = true; }
    if (g && g.modo === "ditado" && g.dit) {
      const pedido = ref.current.turn || falaTurno.current;
      const tit = tituloDe(pedido);
      if (comandoDitado(g.dit, pedido, 0)) { g.titulo = tit; g.linhas = [linhaDitado(g.dit)]; g.quandos = [agoraS()]; publicarTrans(); }
    }
    if (trans.current) {
      const m0 = trans.current, ped = ref.current.turn || falaTurno.current;
      // 1º o exemplo que a PRÓPRIA AULA já traz (sai do banco na hora, sem atraso nem erro); a fala do Mentor continua escrevendo se não houver nada na aula sobre o pedido
      void buscarCatalogo(m0, ped).then((achou) => {
        if (achou) return;
        setTimeout(() => {
          if (trans.current !== m0 || m0.modo === "ia" || m0.linhas.length > 0 || (m0.dit && m0.dit.itens.length > 0)) return;
          iniciarIA(m0, ped);
        }, 7000);
      });
      // o Mentor só avisa que vai mostrar no quadro se, passado um tempo, realmente não apareceu nada nele
      setTimeout(() => {
        const g3 = trans.current;
        if (g3 !== m0 || m0.linhas.length > 0 || (m0.dit && m0.dit.itens.length > 0)) return;
        try { ref.current.session?.sendRealtimeInput({ text: "[AVISO DO APLICATIVO] O quadro ainda não apareceu para o aluno. Diga agora UMA frase curta avisando que vai mostrar no quadro e continue a explicação." }); } catch { /* sessão já encerrada */ }
      }, 12000);
    }
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
      if (debCmd.current) clearTimeout(debCmd.current);
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
    if (r.ctx.state === "suspended") void r.ctx.resume().catch(() => undefined); // celular pode suspender no meio da conversa
    const pcm = new Int16Array(fromB64(b64));
    const f = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f[i] = pcm[i]! / 0x8000;
    const q = pend.current;
    q.f.push(f); q.n += f.length;
    if (q.n >= OUT_RATE * 0.12) flushFala(); // ~120 ms por bloco
    else if (!q.timer) q.timer = setTimeout(flushFala, 45);
  };

  /** Navegação por voz: abre NA HORA (o Mentor confirma em uma frase, mas a página não espera ele terminar). */
  const tratarComando = async (cmd: Comando) => {
    let res: ResultadoComando = null;
    try { res = (await navegacaoRef.current?.(cmd)) ?? null; } catch { res = null; }
    if (!res) return;
    if (res.aviso) { try { ref.current.session?.sendRealtimeInput({ text: res.aviso }); } catch { /* sessão já encerrada */ } }
    if (res.depois) res.depois();
  };
  /** Lê o que o aluno falou até agora e abre, uma vez por turno. */
  const lerPedido = () => {
    const r = ref.current;
    if (!navegacaoRef.current || cmdTurno.current || !r.turn) return;
    const cmd = interpretarComando(r.turn, { perguntouConcurso: perguntou.current.concurso, perguntouAula: perguntou.current.aula });
    if (cmd) { cmdTurno.current = true; void tratarComando(cmd); }
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
    // Pedido de navegação (menu, página, concurso ou aula): lido assim que o aluno para de falar (~0,45 s), sem esperar o Mentor.
    if (said && navegacaoRef.current) {
      if (debCmd.current) clearTimeout(debCmd.current);
      debCmd.current = setTimeout(lerPedido, 450);
    }
    if (starts || m.serverContent?.turnComplete) lerPedido();
    // rede de segurança: se a transcrição do aluno falhou, "Já abro a aula de X" dito pelo Mentor também abre
    if (replied && navegacaoRef.current && !cmdTurno.current) {
      const cm = comandoDaFalaDoMentor(`${falaTurno.current}${replied}`);
      if (cm) { cmdTurno.current = true; void tratarComando(cm); }
    }
    if (starts && !r.bye && isFarewell(r.turn)) {
      r.bye = true;
      r.byeTimer = setTimeout(() => void encerrar("usuario"), 15000); // rede de segurança
    }
    // Lousa: abre na hora (quando o aluno pede uma conta/exemplo/desenho ou o Mentor diz que vai anotar) e
    // monta o conteúdo em paralelo à fala; o quadro já aparece escrevendo e recebe o texto quando chega.
    if (replied) falaTurno.current += replied;
    if (said && ofertaQuadro.current && /^\W*(sim|pode|quero|claro|manda|por favor|vamos|bora|ok|beleza|aceito|com certeza|isso)\b/i.test(r.turn.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()) && !pedeLousa(r.turn)) {
      r.turn = `${pedidoAnterior.current} no quadro`; // "sim" à oferta = pedido do mesmo assunto no quadro
      ofertaQuadro.current = false;
    }
    if (said && pedeFechar(r.turn)) fecharPorVoz();
    if (!bloqueioLousa.current && (starts || replied) && pedeLousa(r.turn)) dispararLousa(); // só abre quando o ALUNO pede para desenhar/escrever; o que o Mentor diz nunca abre o quadro
    if (said && onLousaRef.current && !bloqueioLousa.current && pedeLousa(r.turn)) { // dispara assim que o aluno termina o pedido, sem esperar o Mentor começar
      if (debLousa.current) clearTimeout(debLousa.current);
      debLousa.current = setTimeout(dispararLousa, 120);
    }
    if (replied) { r.replied.push(replied); ouvirFala(replied, false); }
    const ro = roteiro.current;
    const contar = !!(replied && ro && ro.contando && !ro.fim);
    if (contar) ro!.chars = Math.min(ro!.total, ro!.chars + replied!.length);
    if (m.serverContent?.turnComplete) {
      ouvirFala("", true);
      ofertaQuadro.current = /(quadro|lousa)[^?]*\?\W*$/i.test(falaTurno.current.trim());
      perguntou.current = perguntaDoMentor(falaTurno.current);
      cmdTurno.current = false;
      if (r.turn && !pedeLousa(r.turn)) pedidoAnterior.current = r.turn;
      falaTurno.current = "";
      modeloTurno.current = false;
      if (r.bye) {
        const falta = r.ctx ? Math.max(0, r.next - r.ctx.currentTime) : 0;
        if (r.byeTimer) clearTimeout(r.byeTimer);
        r.byeTimer = setTimeout(() => void encerrar("usuario"), Math.min(8000, falta * 1000 + 500));
      }
      r.turn = r.bye ? r.turn : "";
      bloqueioLousa.current = false;
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
    // O áudio só toca se o AudioContext for criado/liberado DENTRO do clique do aluno: depois das esperas
    // (token e microfone) o navegador, sobretudo no celular, o deixa "suspended" e o Mentor fica mudo.
    let pre: AudioContext | null = null;
    try { pre = new AudioContext({ sampleRate: OUT_RATE, latencyHint: "playback" }); } catch {
      try { pre = new AudioContext(); } catch { pre = null; }
    }
    void pre?.resume().catch(() => undefined);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("mic");
      // Microfone e liberação da conversa andam juntos (responde mais rápido). Se o microfone falhar,
      // a reserva de tempo é devolvida na hora (seconds: 0).
      carregarCtxAula();
      const startReq = fetch("/api/mentor/voz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", study: getStudy?.() ?? undefined, ...(boasVindas ? { modo: "boas-vindas" } : {}), ...(professor ? { professor } : {}) }) });
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
      if (pre) ctx = pre;
      else { try { ctx = new AudioContext({ sampleRate: OUT_RATE, latencyHint: "playback" }); } catch { ctx = new AudioContext(); } }
      r.ctx = ctx;
      if (ctx.state !== "running") await ctx.resume().catch(() => undefined);
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
        session.sendRealtimeInput({ text: boasVindas ? "Comece agora com a ABERTURA DESTA CONVERSA descrita nas suas instruções: uma única mensagem de 20 a 40 palavras e depois silêncio, escutando o aluno." : "Cumprimente o aluno logo de início com uma saudação curta e marcante, escolhendo uma destas: \"Fala, Caveira!\" ou \"Olá, futuro policial!\". Depois pergunte, em uma frase, qual é a dúvida de estudo dele." });
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
      if (pre && r.ctx !== pre) void pre.close().catch(() => undefined); // contexto criado antes e nunca usado
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

  if (semTela) return null;
  if (orbOnly) return <VozOrbSolo size={orbSize} fase={fase} speaking={speaking} msg={msg} level={nivel} onStart={() => void iniciar()} onClose={() => onClose?.()} />;
  return <VozView fase={fase} left={left} limit={limit} unlimited={unlimited} speaking={speaking} msg={msg} level={nivel} base={base} onStart={() => void iniciar()} onStop={() => void encerrar("usuario")} />;
}
