"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Eraser, Pen, Trash2, Undo2, Wand2, X } from "lucide-react";
import { apagar, CORES, interpretar, mesmaForma, type Cor, type Item, type Medidor } from "@/domain/mentor/quadro-motor";
import type { Ponto, Traco } from "@/domain/mentor/quadro-modelos";
import "./quadro-branco.css";

const FONTE = '"Courier Prime", "Courier New", Courier, ui-monospace, monospace';
const BORRACHA = 16;
const ESPERA_MS = 600;
const CHAVE = "aprovum:quadro:v1";
const CANETAS: { cor: Cor; nome: string }[] = [{ cor: "preto", nome: "Caneta preta" }, { cor: "azul", nome: "Caneta azul" }, { cor: "vermelho", nome: "Caneta vermelha" }];

/** Mede cada caractere na fonte de máquina (subida, descida e largura por 1 de tamanho), com memória. */
function medidorDeFonte(): Medidor {
  const memo = new Map<string, { asc: number; desc: number; w: number }>();
  return (ch) => {
    const k = memo.get(ch);
    if (k) return k;
    const c = document.createElement("canvas").getContext("2d");
    if (c) c.font = `700 100px ${FONTE}`;
    const m = c?.measureText(ch);
    const r = m ? { asc: Math.max(0.1, m.actualBoundingBoxAscent / 100), desc: Math.max(0, m.actualBoundingBoxDescent / 100), w: Math.max(0.2, m.width / 100) } : { asc: 0.62, desc: 0, w: 0.6 };
    memo.set(ch, r);
    return r;
  };
}

interface Props {
  onClose: () => void;
  /** Abre a lista de explicações do Mentor já salvas (fecha o quadro). */
  onExplicacoes?: () => void;
}

/** Quadro branco de treino: o aluno escreve à mão e o quadro limpa tudo em letra de máquina. */
export function QuadroBranco({ onClose, onExplicacoes }: Props) {
  const area = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const itens = useRef<Item[]>([]);
  const desfazer = useRef<string[]>([]);
  const pendente = useRef<Traco[]>([]); // traços do símbolo que está sendo escrito
  const atual = useRef<Traco | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const borrando = useRef(false);
  const mira = useRef<{ x: number; y: number } | null>(null);
  const dpr = useRef(1);
  const ultimoSubir = useRef(0);
  const candidato = useRef(false); // o traço em escrita pode continuar o símbolo anterior
  const [caneta, setCaneta] = useState<Cor>("preto");
  const [ferramenta, setFerramenta] = useState<"caneta" | "borracha">("caneta");
  const [auto, setAuto] = useState(true);
  const [estado, setEstado] = useState({ vazio: true, pode: false });
  const [confirmaLimpar, setConfirmaLimpar] = useState(false);
  const cfg = useRef({ caneta, ferramenta, auto });
  useEffect(() => { cfg.current = { caneta, ferramenta, auto }; }, [caneta, ferramenta, auto]);

  const medidor = useMemo<Medidor>(() => medidorDeFonte(), []);

  const desenhar = useCallback(() => {
    const cv = tela.current; const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const d = dpr.current;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const risca = (t: Traco, w: number, cor: string) => {
      if (t.length < 2) { if (t[0]) { ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(t[0][0], t[0][1], w / 2, 0, Math.PI * 2); ctx.fill(); } return; }
      ctx.strokeStyle = cor; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(t[0]![0], t[0]![1]);
      for (let i = 1; i < t.length - 1; i++) { const m: Ponto = [(t[i]![0] + t[i + 1]![0]) / 2, (t[i]![1] + t[i + 1]![1]) / 2]; ctx.quadraticCurveTo(t[i]![0], t[i]![1], m[0], m[1]); }
      ctx.lineTo(t[t.length - 1]![0], t[t.length - 1]![1]); ctx.stroke();
    };
    for (const it of itens.current) {
      if (it.t === "tr") for (const s of it.segs) risca(s, it.w, CORES[it.cor]);
      else { ctx.fillStyle = CORES[it.cor]; ctx.font = `700 ${it.size}px ${FONTE}`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(it.ch, it.cx, it.base); }
    }
    // traços ainda não "limpos" (o aluno acabou de escrever)
    const cor = CORES[cfg.current.caneta];
    for (const t of pendente.current) risca(t, 3.2, cor);
    if (atual.current) risca(atual.current, 3.2, cor);
    if (cfg.current.ferramenta === "borracha" && mira.current) {
      ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(mira.current.x, mira.current.y, BORRACHA, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }, []);

  const guardar = useCallback(() => {
    try { localStorage.setItem(CHAVE, JSON.stringify(itens.current)); } catch { /* sem armazenamento: segue sem salvar */ }
  }, []);
  const marcar = useCallback(() => {
    desfazer.current.push(JSON.stringify(itens.current));
    if (desfazer.current.length > 40) desfazer.current.shift();
  }, []);
  const refletir = useCallback(() => setEstado({ vazio: itens.current.length === 0 && pendente.current.length === 0 && !atual.current, pode: desfazer.current.length > 0 || pendente.current.length > 0 }), []);
  const mudou = useCallback(() => { refletir(); guardar(); desenhar(); }, [desenhar, guardar, refletir]);

  /** Fecha o símbolo em escrita: reconhece e troca pelos traços limpos / caractere de máquina. */
  const fechar = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const g = pendente.current;
    if (!g.length) return;
    pendente.current = [];
    marcar();
    if (cfg.current.auto) {
      itens.current = [...itens.current, ...interpretar(g, cfg.current.caneta, medidor, itens.current).itens];
    } else {
      itens.current = [...itens.current, ...interpretar(g, cfg.current.caneta, () => ({ asc: 0.6, desc: 0, w: 0.6 }), []).itens.filter((i) => i.t === "tr")];
    }
    mudou();
  }, [marcar, medidor, mudou]);

  // tamanho do canvas + restauração do que o aluno já tinha escrito
  useEffect(() => {
    const a = area.current, cv = tela.current;
    if (!a || !cv) return;
    const ajustar = () => {
      const r = a.getBoundingClientRect();
      dpr.current = Math.min(3, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr.current); cv.height = Math.round(r.height * dpr.current);
      cv.style.width = `${r.width}px`; cv.style.height = `${r.height}px`;
      desenhar();
    };
    try { const s = localStorage.getItem(CHAVE); if (s) { const j = JSON.parse(s) as Item[]; if (Array.isArray(j)) itens.current = j; } } catch { /* ignora */ }
    ajustar();
    const raf = requestAnimationFrame(refletir);
    const ro = new ResizeObserver(ajustar); ro.observe(a);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); if (timer.current) clearTimeout(timer.current); };
  }, [desenhar, refletir]);

  // Esc fecha
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const pos = (e: React.PointerEvent): Ponto => { const r = tela.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  const apaga = (x: number, y: number) => {
    const r = apagar(itens.current, x, y, BORRACHA);
    if (r.mudou) { itens.current = r.itens; refletir(); }
  };

  const descer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    if (cfg.current.ferramenta === "borracha") {
      fechar(); marcar(); borrando.current = true; mira.current = { x, y }; apaga(x, y); desenhar(); return;
    }
    // novo traço: se for longe do símbolo em escrita, o anterior já está pronto
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (pendente.current.length) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const t of pendente.current) for (const p of t) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const h = Math.max(y1 - y0, x1 - x0, 20);
      const dt = performance.now() - ultimoSubir.current;
      const perto = x >= x0 - h * 0.8 && x <= x1 + h * 0.8 && y >= y0 - h * 0.9 && y <= y1 + h * 0.9;
      // começou colado e logo depois: talvez seja o mesmo símbolo (=, +, 4, x…); só dá para saber quando o traço terminar
      if (perto && dt < 800) candidato.current = true; else fechar();
    }
    if (!pendente.current.length) candidato.current = false;
    atual.current = [[x, y]];
    refletir();
    desenhar();
  };
  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eventos = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [];
    const r = tela.current!.getBoundingClientRect();
    const pts: Ponto[] = (eventos.length ? eventos : [e.nativeEvent]).map((p) => [p.clientX - r.left, p.clientY - r.top]);
    if (cfg.current.ferramenta === "borracha") {
      const ultimo = pts[pts.length - 1]!; mira.current = { x: ultimo[0], y: ultimo[1] };
      if (borrando.current) for (const p of pts) apaga(p[0], p[1]);
      desenhar(); return;
    }
    if (!atual.current) return;
    for (const p of pts) { const u = atual.current[atual.current.length - 1]!; if (Math.hypot(p[0] - u[0], p[1] - u[1]) >= 1.5) atual.current.push(p); }
    desenhar();
  };
  const subir = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* já solto */ }
    if (borrando.current) { borrando.current = false; mudou(); return; }
    const t = atual.current; atual.current = null;
    if (!t) return;
    if (t.length < 2) t.push([t[0]![0] + 0.01, t[0]![1]]);
    if (pendente.current.length && candidato.current && !mesmaForma(pendente.current, t)) fechar(); // eram dois símbolos: o anterior já está pronto
    candidato.current = false;
    pendente.current = [...pendente.current, t];
    ultimoSubir.current = performance.now();
    refletir();
    desenhar();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fechar, ESPERA_MS);
  };
  const sair = () => { if (cfg.current.ferramenta === "borracha") { mira.current = null; desenhar(); } };

  const desfazerUltimo = () => {
    if (pendente.current.length || atual.current) { pendente.current = []; atual.current = null; if (timer.current) clearTimeout(timer.current); refletir(); desenhar(); return; }
    const s = desfazer.current.pop();
    if (s === undefined) return;
    try { itens.current = JSON.parse(s) as Item[]; } catch { return; }
    mudou();
  };
  const limparTudo = () => {
    if (!confirmaLimpar) { setConfirmaLimpar(true); setTimeout(() => setConfirmaLimpar(false), 3000); return; }
    fechar(); marcar(); itens.current = []; pendente.current = []; setConfirmaLimpar(false); mudou();
  };

  const { vazio, pode: podeDesfazer } = estado;

  return (
    <div className="qb" role="dialog" aria-modal="true" aria-label="Lousa de treino" data-testid="quadro-branco">
      <header className="qb-topo">
        <h2>Lousa</h2>
        {onExplicacoes && <button type="button" className="qb-link" onClick={onExplicacoes} data-testid="quadro-explicacoes"><BookOpen size={16} aria-hidden /> Explicações do Mentor</button>}
        <button type="button" className="qb-x" onClick={onClose} aria-label="Fechar lousa"><X size={22} aria-hidden /></button>
      </header>
      <div className="qb-barra" role="toolbar" aria-label="Ferramentas da lousa">
        <div className="qb-grupo" role="radiogroup" aria-label="Canetas">
          {CANETAS.map((c) => (
            <button key={c.cor} type="button" role="radio" aria-checked={ferramenta === "caneta" && caneta === c.cor} aria-label={c.nome} data-testid={`caneta-${c.cor}`}
              className={`qb-ferr qb-caneta${ferramenta === "caneta" && caneta === c.cor ? " is-on" : ""}`} style={{ color: CORES[c.cor] }}
              onClick={() => { setCaneta(c.cor); setFerramenta("caneta"); }}>
              <Pen size={22} aria-hidden strokeWidth={2.4} />
              <i style={{ background: CORES[c.cor] }} aria-hidden />
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={ferramenta === "borracha"} aria-label="Apagador" data-testid="apagador" className={`qb-ferr${ferramenta === "borracha" ? " is-on" : ""}`} onClick={() => { fechar(); setFerramenta("borracha"); }}>
          <Eraser size={22} aria-hidden /><span>Apagador</span>
        </button>
        <span className="qb-sep" aria-hidden />
        <button type="button" aria-label="Desfazer" className="qb-ferr" onClick={desfazerUltimo} disabled={!podeDesfazer}><Undo2 size={22} aria-hidden /><span>Desfazer</span></button>
        <button type="button" aria-label={confirmaLimpar ? "Confirmar: apagar tudo" : "Apagar tudo"} data-testid="apagar-tudo" className={`qb-ferr${confirmaLimpar ? " is-perigo" : ""}`} onClick={limparTudo} disabled={vazio}><Trash2 size={22} aria-hidden /><span>{confirmaLimpar ? "Confirmar?" : "Apagar tudo"}</span></button>
        <button type="button" aria-pressed={auto} aria-label="Letra de máquina automática" data-testid="auto-corrigir" className={`qb-ferr qb-auto${auto ? " is-on" : ""}`} onClick={() => { fechar(); setAuto((v) => !v); }}><Wand2 size={22} aria-hidden /><span>{auto ? "Auto ligado" : "Auto desligado"}</span></button>
      </div>
      <div className="qb-area" ref={area}>
        {vazio && <p className="qb-dica">Escreva um número, uma letra ou um sinal.<br />Eu deixo tudo com <b>letra de máquina</b>.</p>}
        <canvas ref={tela} className={ferramenta === "borracha" ? "is-borracha" : ""} role="img" aria-label="Quadro branco para escrever à mão"
          onPointerDown={descer} onPointerMove={mover} onPointerUp={subir} onPointerCancel={subir} onPointerLeave={sair} data-testid="quadro-canvas" />
      </div>
    </div>
  );
}
