"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Eraser, Keyboard, Pen, Trash2, Undo2, Wand2, X } from "lucide-react";
import { apagar, CORES, ehSinalVetor, glifoEm, interpretar, mesmaForma, promoverUns, sinalNormalizado, type Cor, type Item, type Medidor } from "@/domain/mentor/quadro-motor";
import { casaCerta, casaCompleta, colocarNaCasa, ehLogica, exercicioAleatorio, lerExercicio, montarEsqueleto, ROTULOS, textoDaCasa, textoDoExercicio, tiposDoAssunto, TIPOS_TEXTO, type Esqueleto, type Exercicio, type TipoEsqueleto } from "@/domain/mentor/quadro-esqueleto";
import type { Ponto, Traco } from "@/domain/mentor/quadro-modelos";
import { perfilDaAula, type ContextoAula } from "@/domain/mentor/quadro-perfil";
import "./quadro-branco.css";

const FONTE = '"Courier Prime", "Courier New", Courier, ui-monospace, monospace';
const BORRACHA = 16;
const ESPERA_MS = 600;
const CHAVE = "aprovum:quadro:v2";
type Tecla = { ch: string; rot?: string; k?: "apagar" | "prox" | "linha" };
const t = (cs: string, rots: Record<string, string> = {}): Tecla[] => [...cs].map((ch) => ({ ch, rot: rots[ch] }));
/** Teclado em abas: números, sinais e letras. Cada matéria mostra o que usa. */
const ABAS_MAT: { id: string; nome: string; teclas: Tecla[] }[] = [
  { id: "num", nome: "Números", teclas: t("7894561230,") },
  { id: "sin", nome: "Sinais", teclas: t("+-×÷=/()%√^:.", { "-": "−" }) },
  { id: "let", nome: "Letras", teclas: t("xyzabcnmk") },
];
const ABAS_LOG: { id: string; nome: string; teclas: Tecla[] }[] = [
  { id: "let", nome: "Letras", teclas: t("pqrstVF") },
  { id: "sin", nome: "Símbolos", teclas: t("~∧∨→↔⊻()=,;") },
  { id: "num", nome: "Números", teclas: t("7894561230,") },
];
const CONTROLES: Tecla[] = [{ ch: "⌫", k: "apagar", rot: "⌫" }, { ch: "›", k: "prox", rot: "→" }, { ch: "↵", k: "linha" }];
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
  /** Aula aberta: a lousa se adapta ao assunto (símbolos esperados) e guarda o quadro daquela aula. */
  aula?: ContextoAula & { id?: string | null };
  onClose: () => void;
  /** Abre a lista de explicações do Mentor já salvas (fecha o quadro). */
  onExplicacoes?: () => void;
}

/** Quadro branco de treino: o aluno escreve à mão e o quadro limpa tudo em letra de máquina. */
export function QuadroBranco({ aula, onClose, onExplicacoes }: Props) {
  const perfil = useMemo(() => perfilDaAula(aula), [aula]);
  const chave = `${CHAVE}:${aula?.id ?? "geral"}`;
  const refTam = useRef<number | undefined>(undefined); // tamanho da primeira escrita: vale para tudo
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
  const [estado, setEstado] = useState<{ vazio: boolean; pode: boolean; g: number | null }>({ vazio: true, pode: false, g: null });
  const [confirmaLimpar, setConfirmaLimpar] = useState(false);
  // teclado: números para tocar (em vez de desenhar) + esqueleto da conta já montado
  const tipos = useMemo<TipoEsqueleto[]>(() => (perfil.modo !== "calculo" ? [] : tiposDoAssunto(aula?.aula ?? "", aula?.materia)), [perfil, aula?.aula, aula?.materia]);
  const [digitar, setDigitar] = useState(perfil.modo === "calculo");
  const [esq, setEsq] = useState<Esqueleto | null>(null);
  const [numsTxt, setNumsTxt] = useState("");
  const [msgObj, setMsgObj] = useState<{ t: "ok" | "erro" | "info"; s: string } | null>(null);
  const setMsg = useCallback((s: string, t: "ok" | "erro" | "info" = "info") => setMsgObj(s ? { t, s } : null), []);
  const [passoUi, setPassoUi] = useState(0);
  const passo = useRef(0);
  const esqRef = useRef<Esqueleto | null>(null);
  const cur = useRef<{ g: number | null; x: number; base: number }>({ g: null, x: 24, base: 90 });
  const conf = useRef<(boolean | null)[] | null>(null);
  const cfg = useRef({ caneta, ferramenta, auto, perfil, digitar });
  useEffect(() => { cfg.current = { caneta, ferramenta, auto, perfil, digitar }; }, [caneta, ferramenta, auto, perfil, digitar]);

  const medidor = useMemo<Medidor>(() => medidorDeFonte(), []);
  const logica = !!esq && ehLogica(esq.tipo);
  const casaAtual = esq && estado.g != null && passoUi < esq.passos.length ? esq.casas[estado.g] : undefined;
  const opcoesAtuais = casaAtual?.opcoes ?? [];
  const abas = logica ? ABAS_LOG : ABAS_MAT;
  const [abaSel, setAbaSel] = useState<{ passo: number; id: string } | null>(null);
  // a aba acompanha o que o passo pede (número, sinal ou letra); o aluno pode trocar à vontade dentro do passo
  const primeiro = casaAtual && !casaAtual.opcoes ? casaAtual.esperado[0] ?? "" : "";
  const idAuto = /[0-9,]/.test(primeiro) ? "num" : /[a-zA-Z]/.test(primeiro) ? "let" : primeiro ? "sin" : abas[0]!.id;
  const aba = abas.find((x) => x.id === (abaSel && abaSel.passo === passoUi ? abaSel.id : idAuto)) ?? abas[0]!;

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
    const e = esqRef.current;
    if (e && cfg.current.digitar) { // casas do passo atual (e dos anteriores): faixa azul clara + sublinhado pontilhado; as dos próximos passos aparecem só quando chegar a vez
      const ativas = e.casas.filter((c) => c.passo <= passo.current);
      ctx.fillStyle = "rgba(29,78,216,.07)";
      for (const c of ativas) if (c.passo === passo.current) ctx.fillRect(c.x0 - 3, c.y0, c.x1 - c.x0 + 6, c.y1 - c.y0);
      ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]);
      for (const c of ativas) { ctx.beginPath(); ctx.moveTo(c.x0, c.base + 6); ctx.lineTo(c.x1, c.base + 6); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    const dosPassos = e && cfg.current.digitar ? e.fixosPasso?.filter((f) => f.passo <= passo.current).flatMap((f) => f.itens) ?? [] : [];
    for (const it of [...(e?.fixos ?? []), ...dosPassos, ...itens.current]) {
      if (it.t === "tr") for (const s of it.segs) risca(s, it.w, CORES[it.cor]);
      else if (ehSinalVetor(it.ch) && !/[0-9]/.test(it.ch)) { for (const v of sinalNormalizado(it.ch, it.cx, it.base - medidor(it.ch).asc * it.size * 0.5, medidor("0").asc * it.size, it.cor)) if (v.t === "tr") for (const sg of v.segs) risca(sg, v.w, CORES[v.cor]); }
      else { ctx.fillStyle = CORES[it.cor]; ctx.font = `700 ${it.size}px ${FONTE}`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(it.ch, it.cx, it.base); }
    }
    if (e) {
      conf.current?.forEach((ok, i) => { const c = e.casas[i]; if (!c || ok === null) return; ctx.strokeStyle = ok ? "#16a34a" : "#dc2626"; ctx.lineWidth = 2.2; ctx.strokeRect(c.x0 - 3, c.y0, c.x1 - c.x0 + 6, c.y1 - c.y0); });
      const c = cur.current.g != null ? e.casas[cur.current.g] : undefined;
      if (cfg.current.digitar && c) { ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(c.x0 - 3, c.y0, c.x1 - c.x0 + 6, c.y1 - c.y0); ctx.setLineDash([]); }
    }
    if (cfg.current.digitar && (!e || cur.current.g == null)) { const t = refTam.current ?? 36; ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cur.current.x, cur.current.base - t * 0.75); ctx.lineTo(cur.current.x, cur.current.base + 4); ctx.stroke(); }
    // traços ainda não "limpos" (o aluno acabou de escrever)
    const cor = CORES[cfg.current.caneta];
    for (const t of pendente.current) risca(t, 3.2, cor);
    if (atual.current) risca(atual.current, 3.2, cor);
    if (cfg.current.ferramenta === "borracha" && mira.current) {
      ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(mira.current.x, mira.current.y, BORRACHA, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }, [medidor]);

  const guardar = useCallback(() => {
    try { localStorage.setItem(chave, JSON.stringify({ itens: itens.current, ref: refTam.current, esq: esqRef.current, passo: passo.current })); } catch { /* sem armazenamento: segue sem salvar */ }
  }, [chave]);
  const marcar = useCallback(() => {
    desfazer.current.push(JSON.stringify(itens.current));
    if (desfazer.current.length > 40) desfazer.current.shift();
  }, []);
  const refletir = useCallback(() => setEstado((a) => { const n = { vazio: itens.current.length === 0 && pendente.current.length === 0 && !atual.current, pode: desfazer.current.length > 0 || pendente.current.length > 0, g: cur.current.g }; return a.vazio === n.vazio && a.pode === n.pode && a.g === n.g ? a : n; }), []);
  const mudou = useCallback(() => { refletir(); guardar(); desenhar(); }, [desenhar, guardar, refletir]);

  /** Fecha o símbolo em escrita: reconhece e troca pelos traços limpos / caractere de máquina. */
  const fechar = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const g = pendente.current;
    if (!g.length) return;
    pendente.current = [];
    marcar();
    if (cfg.current.auto) {
      const r = interpretar(g, cfg.current.caneta, medidor, itens.current, { ref: refTam.current, perfil: cfg.current.perfil });
      if (r.ref && !refTam.current) refTam.current = r.ref;
      itens.current = promoverUns([...itens.current, ...r.itens], r.itens, medidor, refTam.current);
    } else {
      itens.current = [...itens.current, ...interpretar(g, cfg.current.caneta, () => ({ asc: 0.6, desc: 0, w: 0.6 }), []).itens.filter((i) => i.t === "tr")];
    }
    mudou();
  }, [marcar, medidor, mudou]);

  // ---------- teclado e esqueleto ----------
  const largura = () => area.current?.clientWidth ?? 360;
  const altura = () => area.current?.clientHeight ?? 600;
  const aplicarEsq = useCallback((e: Esqueleto | null, limpar: boolean) => {
    esqRef.current = e; setEsq(e);
    if (e) { setNumsTxt(textoDoExercicio(e)); refTam.current = e.size; cur.current = { g: e.passos[0]?.casas[0] ?? null, x: 24, base: e.size * 1.3 }; }
    passo.current = 0; setPassoUi(0);
    conf.current = null; setMsg("");
    if (limpar) { itens.current = []; pendente.current = []; }
    mudou();
  }, [mudou, setMsg]);
  const novoEsq = useCallback((tipo: TipoEsqueleto, ex?: Exercicio) => {
    marcar();
    aplicarEsq(montarEsqueleto(tipo, ex ?? exercicioAleatorio(tipo), largura(), medidor, altura()), true);
  }, [aplicarEsq, marcar, medidor]);

  const tamanho = () => {
    if (!refTam.current) refTam.current = esqRef.current?.size ?? Math.max(28, Math.min(44, Math.floor(largura() / 12)));
    return refTam.current;
  };
  /** Passo atual terminado? Confere, explica e (se acertou) passa para o próximo. */
  const verificarPasso = useCallback((forcar = false) => {
    const e = esqRef.current; if (!e) return;
    const ps = e.passos[passo.current]; if (!ps) return;
    const cs = ps.casas.map((i) => e.casas[i]!);
    if (!forcar && !cs.every((c) => casaCompleta(itens.current, c))) return;
    const certas = cs.map((c) => casaCerta(itens.current, c));
    conf.current = e.casas.map((c) => (c.passo === passo.current ? casaCerta(itens.current, c) : null)); // verde/vermelho só nas casas deste passo
    if (certas.every(Boolean)) {
      const ultimo = passo.current >= e.passos.length - 1;
      setMsg(ultimo ? `${ps.porque} Conta concluída! ${e.resposta}` : ps.porque, "ok");
      if (!ultimo) {
        passo.current += 1; setPassoUi(passo.current);
        cur.current = { ...cur.current, g: e.passos[passo.current]!.casas[0] ?? null };
      } else { passo.current = e.passos.length; setPassoUi(passo.current); }
    } else {
      setMsg(`Quase! ${ps.dica} Toque na casa vermelha e corrija.`, "erro");
    }
    desenhar(); refletir();
  }, [desenhar, refletir, setMsg]);

  const teclar = useCallback((ch: string, k?: "apagar" | "prox" | "linha") => {
    fechar();
    const e = esqRef.current, size = tamanho(), cor = cfg.current.caneta, g = cur.current.g;
    conf.current = null;
    if (e && g != null) {
      const c = e.casas[g]!;
      const atual = textoDaCasa(itens.current, c);
      const doPasso = e.passos[c.passo]?.casas ?? [];
      const prox = () => { const i = doPasso.indexOf(c.id); const n = doPasso[i + 1]; if (n !== undefined) cur.current.g = n; };
      if (k === "prox" || k === "linha") prox();
      else if (k === "apagar") {
        if (atual) { marcar(); itens.current = colocarNaCasa(itens.current, c, atual.slice(0, -1), cor, medidor, size); }
        else { const i = doPasso.indexOf(c.id); if (i > 0) cur.current.g = doPasso[i - 1]!; }
      } else {
        if (c.opcoes || !ch.trim() || atual.length >= c.slots) return;
        marcar();
        const novo = atual + ch;
        itens.current = colocarNaCasa(itens.current, c, novo, cor, medidor, size);
        if (novo.length >= c.esperado.length) prox(); // completou a casa: vai para a próxima do passo
        if (c.passo === passo.current) verificarPasso();
      }
    } else {
      const m0 = medidor("0"), cw = m0.w * size * 1.15;
      if (k === "prox") cur.current.x += cw;
      else if (k === "linha") cur.current = { g: null, x: 24, base: cur.current.base + size * 1.6 };
      else if (k === "apagar") {
        const s = desfazer.current.pop();
        if (s !== undefined) { try { itens.current = JSON.parse(s) as Item[]; } catch { /* ignora */ } cur.current.x = Math.max(24, cur.current.x - cw); }
      } else {
        if (cur.current.x + cw > largura() - 12) cur.current = { g: null, x: 24, base: cur.current.base + size * 1.6 };
        marcar();
        const cx = cur.current.x + cw / 2;
        itens.current = [...itens.current, ...(ehSinalVetor(ch) ? sinalNormalizado(ch, cx, cur.current.base - m0.asc * size * 0.5, m0.asc * size, cor) : [glifoEm(ch, cx, cur.current.base, size, cor, medidor)])];
        cur.current.x += cw;
      }
    }
    mudou();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechar, marcar, medidor, mudou, verificarPasso]);
  /** Casa de escolha (ex.: TAUTOLOGIA, SIM/NÃO): o aluno toca na opção. */
  const escolher = (opcao: string) => {
    const e = esqRef.current, g = cur.current.g; if (!e || g == null) return;
    const c = e.casas[g]!; fechar(); marcar(); conf.current = null;
    itens.current = colocarNaCasa(itens.current, c, opcao, cfg.current.caneta, medidor, tamanho());
    const doPasso = e.passos[c.passo]?.casas ?? [], n = doPasso[doPasso.indexOf(c.id) + 1];
    if (n !== undefined) cur.current.g = n;
    mudou();
    if (c.passo === passo.current) verificarPasso();
  };
  const tocar = (x: number, y: number) => {
    const e = esqRef.current;
    const i = e ? e.casas.findIndex((c) => c.passo <= passo.current && x >= c.x0 - 8 && x <= c.x1 + 8 && y >= c.y0 - 6 && y <= c.y1 + 6) : -1;
    if (i >= 0) cur.current = { ...cur.current, g: i };
    else cur.current = { g: null, x: Math.max(12, x), base: y };
    desenhar(); refletir();
  };
  const conferirAgora = () => { fechar(); verificarPasso(true); };
  const verResposta = () => {
    const e = esqRef.current; if (!e) return;
    const ps = e.passos[passo.current]; if (!ps) return;
    fechar(); marcar();
    for (const i of ps.casas) { const c = e.casas[i]!; if (!casaCerta(itens.current, c)) itens.current = colocarNaCasa(itens.current, c, c.esperado, "vermelho", medidor, e.size); }
    const ultimo = passo.current >= e.passos.length - 1;
    setMsg(ultimo ? `${ps.porque} Conta concluída! ${e.resposta}` : ps.porque, "info");
    if (!ultimo) { passo.current += 1; setPassoUi(passo.current); cur.current = { ...cur.current, g: e.passos[passo.current]!.casas[0] ?? null }; } else { passo.current = e.passos.length; setPassoUi(passo.current); }
    conf.current = null; mudou();
  };
  const montarDoCampo = () => {
    const tipo = esqRef.current?.tipo ?? tipos[0];
    if (!tipo) return;
    const r = lerExercicio(tipo, numsTxt);
    if ("erro" in r) { setMsg(r.erro, "erro"); return; }
    novoEsq(tipo, r.ex);
  };

  // teclado físico (computador)
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      if (!digitar || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const key = ev.key;
      let a: { ch: string; k?: "apagar" | "prox" | "linha" } | null = null;
      if (/^[0-9]$/.test(key) || "+-=,.():".includes(key) && key.length === 1) a = { ch: key };
      else if (key === "*" || key === "x" || key === "X") a = { ch: "×" };
      else if (key === "/") a = { ch: "÷" };
      else if (key === "Backspace") a = { ch: "⌫", k: "apagar" };
      else if (key === "Enter") a = { ch: "↵", k: "linha" };
      else if (key === "Tab" || key === "ArrowRight") a = { ch: "→", k: "prox" };
      if (!a) return;
      ev.preventDefault();
      teclar(a.ch, a.k);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [digitar, teclar]);

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
    try {
      const s = localStorage.getItem(chave);
      if (s) {
        const j = JSON.parse(s) as { itens?: Item[]; ref?: number; esq?: Esqueleto | null; passo?: number };
        if (Array.isArray(j.itens)) { itens.current = j.itens; refTam.current = typeof j.ref === "number" ? j.ref : undefined; }
        if (j.esq && Array.isArray(j.esq.casas) && Array.isArray(j.esq.passos)) { esqRef.current = j.esq; passo.current = Math.min(Math.max(0, j.passo ?? 0), j.esq.passos.length); cur.current = { g: j.esq.passos[passo.current]?.casas[0] ?? null, x: 24, base: 90 }; }
      }
    } catch { /* ignora */ }
    ajustar();
    // lousa nova numa aula de cálculo: a conta já vem montada
    if (!esqRef.current && !itens.current.length && tipos.length) {
      esqRef.current = montarEsqueleto(tipos[0]!, exercicioAleatorio(tipos[0]!), a.clientWidth || 360, medidor, a.clientHeight || 600);
      refTam.current = esqRef.current.size; passo.current = 0; cur.current = { g: esqRef.current.passos[0]?.casas[0] ?? null, x: 24, base: 90 };
      desenhar();
    }
    const raf = requestAnimationFrame(() => { // estado do React só depois do primeiro desenho
      if (esqRef.current) { setEsq(esqRef.current); setPassoUi(passo.current); setNumsTxt(textoDoExercicio(esqRef.current)); }
      refletir();
    });
    const ro = new ResizeObserver(ajustar); ro.observe(a);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); if (timer.current) clearTimeout(timer.current); };
  }, [desenhar, refletir, chave, tipos, medidor]);

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
    const [x, y] = pos(e);
    if (cfg.current.digitar && cfg.current.ferramenta === "caneta") { fechar(); tocar(x, y); return; } // modo teclado: o toque só escolhe a casa
    e.currentTarget.setPointerCapture(e.pointerId);
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
    if (pendente.current.length && candidato.current && !mesmaForma(pendente.current, t, cfg.current.perfil)) fechar(); // eram dois símbolos: o anterior já está pronto
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
    refTam.current = (itens.current.find((i) => i.t === "gl") as { size?: number } | undefined)?.size;
    mudou();
  };
  const limparTudo = () => {
    if (!confirmaLimpar) { setConfirmaLimpar(true); setTimeout(() => setConfirmaLimpar(false), 3000); return; }
    fechar(); marcar(); itens.current = []; pendente.current = []; conf.current = null; if (!esqRef.current) refTam.current = undefined; else { passo.current = 0; setPassoUi(0); cur.current.g = esqRef.current.passos[0]?.casas[0] ?? null; } setMsg(""); setConfirmaLimpar(false); mudou();
  };

  const { vazio, pode: podeDesfazer } = estado;

  return (
    <div className="qb" role="dialog" aria-modal="true" aria-label="Lousa de treino" data-testid="quadro-branco">
      <header className="qb-topo">
        <h2>Lousa<small className="qb-aula" data-testid="quadro-perfil">{perfil.modo === "calculo" ? `Aula: ${perfil.nome}` : perfil.nome}</small></h2>
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
        <button type="button" aria-pressed={digitar} aria-label="Teclado de números" data-testid="teclado" className={`qb-ferr${digitar ? " is-on" : ""}`} onClick={() => { fechar(); setDigitar((v) => !v); }}><Keyboard size={22} aria-hidden /><span>{digitar ? "Teclado" : "À mão"}</span></button>
      </div>
      <div className="qb-area" ref={area}>
        {vazio && !esq && !digitar && <p className="qb-dica">Escreva um número, uma letra ou um sinal.<br />Eu deixo tudo com <b>letra de máquina</b>.</p>}
        <canvas ref={tela} className={ferramenta === "borracha" ? "is-borracha" : ""} role="img" aria-label="Quadro branco para escrever à mão"
          onPointerDown={descer} onPointerMove={mover} onPointerUp={subir} onPointerCancel={subir} onPointerLeave={sair} data-testid="quadro-canvas" />
      </div>
      {digitar && (
        <div className="qb-teclado" data-testid="quadro-teclado">
          {tipos.length > 1 && (
            <div className="qb-esq" role="toolbar" aria-label="Tipos de conta">
              {tipos.map((t) => (
                <button key={t} type="button" className={`qb-chip${esq?.tipo === t ? " is-on" : ""}`} data-testid={`esq-${t}`} onClick={() => novoEsq(t)}>{ROTULOS[t]}</button>
              ))}
            </div>
          )}
          {esq && (
            <div className="qb-passo" data-testid="esq-passo">
              {passoUi < esq.passos.length ? (
                <>
                  <b>Passo {passoUi + 1} de {esq.passos.length}: {esq.passos[passoUi]!.titulo}</b>
                  <p>{esq.passos[passoUi]!.texto}</p>
                </>
              ) : <b>Conta concluída! {esq.resposta}</b>}
            </div>
          )}
          {msgObj && <p className={`qb-msg is-${msgObj.t}`} role="status" data-testid="esq-msg">{msgObj.s}</p>}
          {esq && (
            <div className="qb-esq">
              <input className="qb-nums" value={numsTxt} onChange={(ev) => setNumsTxt(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); montarDoCampo(); } }} aria-label="Números da conta" data-testid="esq-numeros" inputMode={esq && TIPOS_TEXTO.includes(esq.tipo) ? "text" : "numeric"} />
              <button type="button" className="qb-chip" onClick={montarDoCampo} data-testid="esq-montar">Montar</button>
              <button type="button" className="qb-chip" onClick={() => novoEsq(esq.tipo)} data-testid="esq-novo">Novo</button>
              <button type="button" className="qb-chip qb-ok" onClick={conferirAgora} data-testid="esq-conferir">Conferir</button>
              <button type="button" className="qb-chip" onClick={verResposta} data-testid="esq-resposta" disabled={passoUi >= esq.passos.length}>Mostrar o passo</button>
            </div>
          )}
          {opcoesAtuais.length > 0 && (
            <div className="qb-esq" role="group" aria-label="Escolha a resposta" data-testid="esq-opcoes">
              {opcoesAtuais.map((o) => <button key={o} type="button" className="qb-chip qb-opcao" data-testid={`opcao-${o}`} onPointerDown={(ev) => ev.preventDefault()} onClick={() => escolher(o)}>{o}</button>)}
            </div>
          )}
          <div className="qb-pad" data-testid="quadro-teclas">
            <div className="qb-abas" role="tablist" aria-label="Tipo de tecla">
              {abas.map((x) => <button key={x.id} type="button" role="tab" aria-selected={x.id === aba.id} className={`qb-aba${x.id === aba.id ? " is-on" : ""}`} data-testid={`aba-${x.id}`} onPointerDown={(ev) => ev.preventDefault()} onClick={() => setAbaSel({ passo: passoUi, id: x.id })}>{x.nome}</button>)}
            </div>
            <div className="qb-pad-corpo">
              <div className="qb-teclas" role="group" aria-label={aba.nome}>
                {aba.teclas.map((k) => (
                  <button key={k.ch} type="button" className="qb-tecla" aria-label={k.rot ?? k.ch} data-testid={`tecla-${k.ch}`} onPointerDown={(ev) => ev.preventDefault()} onClick={() => teclar(k.ch)}>{k.rot ?? k.ch}</button>
                ))}
              </div>
              <div className="qb-ctrl" role="group" aria-label="Controles">
                {CONTROLES.map((k) => (
                  <button key={k.ch} type="button" className="qb-tecla is-ctrl" aria-label={k.k === "apagar" ? "Apagar último" : k.k === "prox" ? "Próxima casa" : "Próxima linha"} data-testid={`tecla-${k.k}`} onPointerDown={(ev) => ev.preventDefault()} onClick={() => teclar(k.ch, k.k)}>{k.rot ?? k.ch}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
