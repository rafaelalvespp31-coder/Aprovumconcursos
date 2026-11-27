"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Calculator, ChevronRight, CornerDownLeft, Delete, Eraser, Highlighter, Keyboard, Lightbulb, Maximize, Minus, Pen, Play, Plus, Redo2, Search, SquareDashed, SquarePen, SquarePlus, Trash2, Undo2, Wand2, X } from "lucide-react";
import { apagar, COR_MARCA, CORES, LARGURA_MARCA, ehSinalVetor, glifoEm, interpretar, mesmaForma, promoverUns, sinalNormalizado, type Cor, type Item, type Medidor } from "@/domain/mentor/quadro-motor";
import { casaCerta, casaCompleta, colocarNaCasa, ehLogica, exercicioAleatorio, lerExercicio, montarEsqueleto, ROTULOS, textoDaCasa, textoDoExercicio, tiposDoAssunto, TIPOS_TEXTO, type Esqueleto, type Exercicio, type TipoEsqueleto } from "@/domain/mentor/quadro-esqueleto";
import type { Ponto, Traco } from "@/domain/mentor/quadro-modelos";
import { perfilDaAula, type ContextoAula } from "@/domain/mentor/quadro-perfil";
import "./quadro-branco.css";

const FONTE = '"Courier Prime", "Courier New", Courier, ui-monospace, monospace';
const BORRACHA = 16;
const ESPERA_MS = 600;
const CHAVE = "aprovum:quadro:v2";
type Tecla = { ch: string; rot?: string };
const t = (cs: string, rots: Record<string, string> = {}): Tecla[] => [...cs].map((ch) => ({ ch, rot: rots[ch] }));
const NUM = t("789÷()456×,%123-0.", { "-": "−" }); // o teclado do desenho: 3 linhas de 6 + ⌫ e ↵
/** Abas do teclado: Números, Sinais e Letras (Raciocínio Lógico abre com letras e símbolos lógicos). */
const ABAS_MAT: { id: string; nome: string; teclas: Tecla[] }[] = [
  { id: "num", nome: "Números", teclas: NUM },
  { id: "sin", nome: "Sinais", teclas: t("+-×÷=/()%√^:<>≤≥≠±", { "-": "−" }) },
  { id: "let", nome: "Letras", teclas: t("xyzabcnmkpqrstuvwd") },
];
const ABAS_LOG: { id: string; nome: string; teclas: Tecla[] }[] = [
  { id: "let", nome: "Letras", teclas: t("pqrstuVFabcdxynmkw") },
  { id: "sin", nome: "Sinais", teclas: t("~∧∨→↔⊻()=,;[]≡⇒⇔≠") },
  { id: "num", nome: "Números", teclas: NUM },
];

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

function Ferr({ id, icone, nome, ativo, onClick, desabilitado, extra, testid }: { id: string; icone: React.ReactNode; nome: string; ativo?: boolean; onClick: () => void; desabilitado?: boolean; extra?: React.ReactNode; testid?: string }) {
  return (
    <button type="button" aria-pressed={ativo} aria-label={nome} data-testid={testid ?? id} className={`qb-ferr${ativo ? " is-on" : ""}`} onClick={onClick} disabled={desabilitado}>
      {icone}<span>{nome}</span>{extra}
    </button>
  );
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
  const [ferramenta, setFerramenta] = useState<"caneta" | "marca" | "borracha" | "area">("caneta");
  const [zoom, setZoom] = useState(1);
  const [painel, setPainel] = useState(false); // exercício / opções (ícone no canto da lousa)
  const [passoExp, setPassoExp] = useState(false); // card do passo aberto por inteiro (no celular ele vem resumido)
  const [dicaVista, setDicaVista] = useState(-1); // passo em que o aluno pediu a dica
  const [auto, setAuto] = useState(true);
  const [estado, setEstado] = useState<{ vazio: boolean; pode: boolean; refaz: boolean; g: number | null }>({ vazio: true, pode: false, refaz: false, g: null });
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
  const alturaMontada = useRef(0);
  const vista = useRef({ s: 1, ox: 0, oy: 0 });
  const zoomRef = useRef(1);
  const pan = useRef({ x: 0, y: 0 });
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const selecao = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const refazerPilha = useRef<string[]>([]); // a lousa se ajusta ao que já está escrito: nada fica cortado
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
    { // encolhe (centralizado) só o quanto precisa para tudo ficar visível, e volta ao normal se sobrar espaço
      const W = cv.width / d, H = cv.height / d, e0 = esqRef.current;
      let fundo = 0, dir = 0;
      const med1 = (it: Item) => { if (it.t === "tr") { for (const sg of it.segs) for (const q of sg) { if (q[1] > fundo) fundo = q[1]; if (q[0] > dir) dir = q[0]; } } else { if (it.base + it.size * 0.3 > fundo) fundo = it.base + it.size * 0.3; if (it.cx + it.size * 0.4 > dir) dir = it.cx + it.size * 0.4; } };
      if (e0) { for (const c of e0.casas) { if (c.y1 > fundo) fundo = c.y1; if (c.x1 > dir) dir = c.x1; } e0.fixos.forEach(med1); e0.fixosPasso?.forEach((f) => f.itens.forEach(med1)); }
      itens.current.forEach(med1);
      const auto = Math.max(0.45, Math.min(1, (H - 8) / (fundo + 14), (W - 8) / (dir + 12)));
      const sc = auto * zoomRef.current;
      vista.current = { s: sc, ox: (W - W * sc) / 2 + pan.current.x, oy: pan.current.y };
      ctx.setTransform(d * sc, 0, 0, d * sc, d * vista.current.ox, d * vista.current.oy);
    }
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
    for (const it of itens.current) if (it.t === "tr" && it.cor === "marca") for (const sg of it.segs) risca(sg, it.w, COR_MARCA); // marca-texto fica por baixo
    for (const it of [...(e?.fixos ?? []), ...dosPassos, ...itens.current.filter((x) => !(x.t === "tr" && x.cor === "marca"))]) {
      if (it.t === "tr") for (const s of it.segs) risca(s, it.w, it.cor === "marca" ? COR_MARCA : CORES[it.cor]);
      else if (ehSinalVetor(it.ch) && !/[0-9]/.test(it.ch)) { for (const v of sinalNormalizado(it.ch, it.cx, it.base - medidor(it.ch).asc * it.size * 0.5, medidor("0").asc * it.size, it.cor)) if (v.t === "tr") for (const sg of v.segs) risca(sg, v.w, v.cor === "marca" ? COR_MARCA : CORES[v.cor]); }
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
    if (atual.current) { if (cfg.current.ferramenta === "marca") risca(atual.current, LARGURA_MARCA, COR_MARCA); else risca(atual.current, 3.2, cor); }
    if (selecao.current) { const q = selecao.current; ctx.strokeStyle = "#e50914"; ctx.fillStyle = "rgba(229,9,20,.08)"; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.fillRect(Math.min(q.x0, q.x1), Math.min(q.y0, q.y1), Math.abs(q.x1 - q.x0), Math.abs(q.y1 - q.y0)); ctx.strokeRect(Math.min(q.x0, q.x1), Math.min(q.y0, q.y1), Math.abs(q.x1 - q.x0), Math.abs(q.y1 - q.y0)); ctx.setLineDash([]); }
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
    refazerPilha.current = [];
  }, []);
  const refletir = useCallback(() => setEstado((a) => { const n = { vazio: itens.current.length === 0 && pendente.current.length === 0 && !atual.current, pode: desfazer.current.length > 0 || pendente.current.length > 0, refaz: refazerPilha.current.length > 0, g: cur.current.g }; return a.vazio === n.vazio && a.pode === n.pode && a.refaz === n.refaz && a.g === n.g ? a : n; }), []);
  const mudou = useCallback(() => { refletir(); guardar(); desenhar(); }, [desenhar, guardar, refletir]);

  /** Fecha o símbolo em escrita: reconhece e troca pelos traços limpos / caractere de máquina. */
  const fechar = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const g = pendente.current;
    if (!g.length) return;
    pendente.current = [];
    marcar();
    if (cfg.current.auto) {
      const marcas = itens.current.filter((i) => i.t === "tr" && i.cor === "marca"), base = itens.current.filter((i) => !(i.t === "tr" && i.cor === "marca"));
      const r = interpretar(g, cfg.current.caneta, medidor, base, { ref: refTam.current, perfil: cfg.current.perfil });
      if (r.ref && !refTam.current) refTam.current = r.ref;
      itens.current = [...marcas, ...promoverUns([...base, ...r.itens], r.itens, medidor, refTam.current)];
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
        if (c.passo === passo.current) {
          const doP = e.passos[c.passo]!.casas.map((i) => e.casas[i]!);
          if (doP.every((x) => casaCompleta(itens.current, x))) verificarPasso();
          else if (casaCompleta(itens.current, c)) { // casa pronta, passo ainda não: já comenta o que o aluno acabou de fazer
            const ok = casaCerta(itens.current, c), faltam = doP.filter((x) => !casaCompleta(itens.current, x)).length;
            conf.current = e.casas.map((x) => (x.id === c.id ? ok : null));
            setMsg(ok ? `${c.nota ?? `Isso mesmo: ${c.esperado}.`} Faltam ${faltam} casa${faltam > 1 ? "s" : ""} neste passo.` : `${c.nota ? `Confira: ${c.nota}` : `Esse valor não bate.`} ${e.passos[c.passo]!.dica}`, ok ? "ok" : "erro");
          }
        }
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
  /** ↵ : passa para a próxima casa do passo; com o passo todo preenchido, confere. */
  const entrar = () => {
    const e = esqRef.current; if (!e) return;
    fechar();
    const ps = e.passos[passo.current]; if (!ps) return;
    if (ps.casas.every((i) => casaCompleta(itens.current, e.casas[i]!))) { verificarPasso(true); return; }
    teclar("›", "prox");
  };
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
      const e0 = esqRef.current; // a lousa mudou de tamanho (ex.: o teclado abriu) e a conta ainda não foi mexida: remonta para caber
      if (e0 && passo.current === 0 && itens.current.length === 0 && Math.abs(r.height - (alturaMontada.current || r.height)) > 8) {
        const e1 = montarEsqueleto(e0.tipo, { nums: e0.nums, entrada: e0.entrada }, r.width, medidor, r.height);
        esqRef.current = e1; refTam.current = e1.size; setEsq(e1); cur.current = { ...cur.current, g: e1.passos[0]?.casas[0] ?? null };
      }
      alturaMontada.current = r.height;
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

  const pos = (e: React.PointerEvent): Ponto => { const r = tela.current!.getBoundingClientRect(); const v = vista.current; return [(e.clientX - r.left - v.ox) / v.s, (e.clientY - r.top - v.oy) / v.s]; };

  const apaga = (x: number, y: number) => {
    const r = apagar(itens.current, x, y, BORRACHA);
    if (r.mudou) { itens.current = r.itens; refletir(); }
  };

  const descer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const [x, y] = pos(e);
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.current.size >= 2) { atual.current = null; selecao.current = null; borrando.current = false; return; } // dois dedos: movem a lousa (ver mover)
    if (cfg.current.digitar && cfg.current.ferramenta === "caneta") { fechar(); tocar(x, y); return; } // modo teclado: o toque só escolhe a casa
    e.currentTarget.setPointerCapture(e.pointerId);
    if (cfg.current.ferramenta === "area") { fechar(); selecao.current = { x0: x, y0: y, x1: x, y1: y }; desenhar(); return; }
    if (cfg.current.ferramenta === "marca") { fechar(); atual.current = [[x, y]]; desenhar(); return; }
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
    const ant = ponteiros.current.get(e.pointerId);
    if (ant) {
      ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ponteiros.current.size >= 2) { // dois dedos: arrasta a lousa (útil depois de aumentar o zoom)
        pan.current = { x: pan.current.x + (e.clientX - ant.x) / 2, y: pan.current.y + (e.clientY - ant.y) / 2 };
        desenhar(); return;
      }
    }
    const eventos = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [];
    const r = tela.current!.getBoundingClientRect();
    const pts: Ponto[] = (eventos.length ? eventos : [e.nativeEvent]).map((p): Ponto => [(p.clientX - r.left - vista.current.ox) / vista.current.s, (p.clientY - r.top - vista.current.oy) / vista.current.s]);
    if (cfg.current.ferramenta === "area") { if (selecao.current) { const u = pts[pts.length - 1]!; selecao.current = { ...selecao.current, x1: u[0], y1: u[1] }; desenhar(); } return; }
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
    ponteiros.current.delete(e.pointerId);
    if (selecao.current) { // Apagador: tira tudo o que o retângulo tocar
      const q = selecao.current; selecao.current = null;
      const [ax, bx, ay, by] = [Math.min(q.x0, q.x1), Math.max(q.x0, q.x1), Math.min(q.y0, q.y1), Math.max(q.y0, q.y1)];
      if (bx - ax > 4 && by - ay > 4) {
        const toca = (i: Item): boolean => {
          if (i.t === "gl") return i.caixa.x1 >= ax && i.caixa.x0 <= bx && i.caixa.y1 >= ay && i.caixa.y0 <= by;
          return i.segs.some((sg) => sg.some((pt) => pt[0] >= ax && pt[0] <= bx && pt[1] >= ay && pt[1] <= by));
        };
        marcar(); itens.current = itens.current.filter((i) => !toca(i)); conf.current = null;
      }
      mudou(); return;
    }
    if (atual.current && cfg.current.ferramenta === "marca") { // Marca texto: guarda o traço como está (não vira letra)
      const t = atual.current; atual.current = null;
      if (t.length < 2) t.push([t[0]![0] + 0.01, t[0]![1]]);
      marcar(); itens.current = [...itens.current, { t: "tr", cor: "marca", w: LARGURA_MARCA, segs: [t] }]; mudou(); return;
    }
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
  const rodar = (e: React.WheelEvent) => { // roda do mouse: rola a lousa; com Ctrl, aproxima e afasta
    if (e.ctrlKey) { const z = Math.min(3, Math.max(0.5, zoomRef.current * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); zoomRef.current = z; setZoom(z); } else pan.current = { x: pan.current.x - e.deltaX, y: pan.current.y - e.deltaY };
    desenhar();
  };
  const mudarZoom = (f: number | null) => { // + / − / ajustar
    const z = f === null ? 1 : Math.min(3, Math.max(0.5, zoomRef.current * f));
    zoomRef.current = z; setZoom(z); if (f === null) pan.current = { x: 0, y: 0 };
    desenhar();
  };
  const sair = () => { if (cfg.current.ferramenta === "borracha") { mira.current = null; desenhar(); } };

  const desfazerUltimo = () => {
    if (pendente.current.length || atual.current) { pendente.current = []; atual.current = null; if (timer.current) clearTimeout(timer.current); refletir(); desenhar(); return; }
    const s = desfazer.current.pop();
    if (s === undefined) return;
    refazerPilha.current.push(JSON.stringify(itens.current));
    try { itens.current = JSON.parse(s) as Item[]; } catch { return; }
    refTam.current = (itens.current.find((i) => i.t === "gl") as { size?: number } | undefined)?.size;
    mudou();
  };
  const refazerUltimo = () => {
    const s = refazerPilha.current.pop();
    if (s === undefined) return;
    desfazer.current.push(JSON.stringify(itens.current));
    try { itens.current = JSON.parse(s) as Item[]; } catch { return; }
    mudou();
  };
  const limparTudo = () => {
    if (!confirmaLimpar) { setConfirmaLimpar(true); setTimeout(() => setConfirmaLimpar(false), 3000); return; }
    fechar(); marcar(); itens.current = []; pendente.current = []; conf.current = null; if (!esqRef.current) refTam.current = undefined; else { passo.current = 0; setPassoUi(0); cur.current.g = esqRef.current.passos[0]?.casas[0] ?? null; } setMsg(""); setConfirmaLimpar(false); mudou();
  };

  const { vazio, pode: podeDesfazer, refaz: podeRefazer } = estado;

  const dicaAberta = !!esq && dicaVista === passoUi && passoUi < esq.passos.length;
  const aulaNome = perfil.modo === "calculo" ? `Aula: ${perfil.nome}` : perfil.nome;
  return (
    <div className="qb" role="dialog" aria-modal="true" aria-label="Lousa de treino" data-testid="quadro-branco">
      <div className="qb-janela">
        <header className="qb-topo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="qb-logo" src="/images/aprovum-logo-escura.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={523} height={107} />
          <span className="qb-div" aria-hidden />
          <div className="qb-titulo">
            <SquarePen className="qb-titulo-ico" size={40} strokeWidth={1.8} aria-hidden />
            <h2>Lousa<small>Treine seus cálculos e anotações</small></h2>
          </div>
          <span className="qb-aula" data-testid="quadro-perfil">{aulaNome}</span>
          {onExplicacoes && <button type="button" className="qb-link" onClick={onExplicacoes} data-testid="quadro-explicacoes"><BookOpen size={18} aria-hidden /> <span>Explicações do Mentor</span> <ChevronRight size={18} aria-hidden /></button>}
          <button type="button" className="qb-x" onClick={onClose} aria-label="Fechar lousa"><X size={26} aria-hidden /></button>
        </header>
        <div className="qb-barra" role="toolbar" aria-label="Ferramentas da lousa">
          <Ferr id="caneta" testid={`caneta-${caneta}`} nome="Caneta" ativo={ferramenta === "caneta"} icone={<Pen size={26} aria-hidden strokeWidth={2.2} />}
            extra={<i className="qb-cor" style={{ background: CORES[caneta] }} aria-hidden />}
            onClick={() => { fechar(); if (ferramenta === "caneta") setCaneta((c) => (c === "preto" ? "azul" : c === "azul" ? "vermelho" : "preto")); setFerramenta("caneta"); }} />
          <Ferr id="marca" nome="Marca texto" ativo={ferramenta === "marca"} icone={<Highlighter size={26} aria-hidden strokeWidth={2.2} />} onClick={() => { fechar(); setFerramenta("marca"); }} />
          <Ferr id="borracha" nome="Borracha" ativo={ferramenta === "borracha"} icone={<Eraser size={26} aria-hidden strokeWidth={2.2} />} onClick={() => { fechar(); setFerramenta("borracha"); }} />
          <Ferr id="apagador" nome="Apagador" ativo={ferramenta === "area"} icone={<SquareDashed size={26} aria-hidden strokeWidth={2.2} />} onClick={() => { fechar(); setFerramenta("area"); }} />
          <span className="qb-sep" aria-hidden />
          <Ferr id="desfazer" nome="Desfazer" icone={<Undo2 size={26} aria-hidden strokeWidth={2.2} />} onClick={desfazerUltimo} desabilitado={!podeDesfazer} />
          <Ferr id="refazer" nome="Refazer" icone={<Redo2 size={26} aria-hidden strokeWidth={2.2} />} onClick={refazerUltimo} desabilitado={!podeRefazer} />
          <span className="qb-sep" aria-hidden />
          <button type="button" aria-label={confirmaLimpar ? "Confirmar: limpar tudo" : "Limpar tudo"} data-testid="apagar-tudo" className={`qb-ferr${confirmaLimpar ? " is-perigo" : ""}`} onClick={limparTudo} disabled={vazio}><Trash2 size={26} aria-hidden strokeWidth={2.2} /><span>{confirmaLimpar ? "Confirmar?" : "Limpar tudo"}</span></button>
        </div>
        <div className="qb-area" ref={area}>
          {vazio && !esq && !digitar && <p className="qb-dica">Escreva um número, uma letra ou um sinal.<br />Eu deixo tudo com <b>letra de máquina</b>.</p>}
          <canvas ref={tela} className={ferramenta === "borracha" ? "is-borracha" : ""} role="img" aria-label="Quadro branco para escrever à mão"
            onPointerDown={descer} onPointerMove={mover} onPointerUp={subir} onPointerCancel={subir} onPointerLeave={sair} onWheel={rodar} data-testid="quadro-canvas" />
          <button type="button" className={`qb-canto${painel ? " is-on" : ""}`} aria-label="Escolher exercício e opções" aria-expanded={painel} data-testid="quadro-opcoes" onClick={() => setPainel((v) => !v)}><SquarePlus size={30} strokeWidth={1.6} aria-hidden /></button>
          <div className="qb-zoom" role="group" aria-label="Zoom da lousa" data-testid="quadro-zoom">
            <span className="qb-zoom-t"><Search size={20} aria-hidden /><b>Zoom</b></span>
            <button type="button" aria-label="Aproximar" onClick={() => mudarZoom(1.25)} disabled={zoom >= 3}><Plus size={22} aria-hidden /></button>
            <button type="button" aria-label="Afastar" onClick={() => mudarZoom(0.8)} disabled={zoom <= 0.5}><Minus size={22} aria-hidden /></button>
            <button type="button" aria-label="Ajustar à tela" onClick={() => mudarZoom(null)}><Maximize size={20} aria-hidden /></button>
          </div>
          {painel && (
            <div className="qb-painel" role="group" aria-label="Exercício e opções" data-testid="quadro-painel">
              {tipos.length > 1 && (
                <div className="qb-esq" role="toolbar" aria-label="Tipos de conta">
                  {tipos.map((x) => <button key={x} type="button" className={`qb-chip${esq?.tipo === x ? " is-on" : ""}`} data-testid={`esq-${x}`} onClick={() => novoEsq(x)}>{ROTULOS[x]}</button>)}
                </div>
              )}
              {esq && (
                <div className="qb-esq">
                  <input className="qb-nums" value={numsTxt} onChange={(ev) => setNumsTxt(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); montarDoCampo(); } }} aria-label="Números da conta" data-testid="esq-numeros" inputMode={TIPOS_TEXTO.includes(esq.tipo) ? "text" : "numeric"} />
                  <button type="button" className="qb-chip" onClick={montarDoCampo} data-testid="esq-montar">Montar</button>
                  <button type="button" className="qb-chip" onClick={() => novoEsq(esq.tipo)} data-testid="esq-novo">Novo</button>
                </div>
              )}
              <div className="qb-esq">
                <button type="button" aria-pressed={auto} data-testid="auto-corrigir" className={`qb-chip${auto ? " is-on" : ""}`} onClick={() => { fechar(); setAuto((v) => !v); }}><Wand2 size={15} aria-hidden /> {auto ? "Letra de máquina ligada" : "Letra de máquina desligada"}</button>
                <button type="button" aria-pressed={digitar} data-testid="teclado" className={`qb-chip${digitar ? " is-on" : ""}`} onClick={() => { fechar(); setDigitar((v) => !v); }}><Keyboard size={15} aria-hidden /> {digitar ? "Teclado ligado" : "Escrever à mão"}</button>
              </div>
            </div>
          )}
        </div>
        {digitar && (
          <div className="qb-teclado" data-testid="quadro-teclado">
            {esq && (
              <div className={`qb-passo${passoExp ? " is-aberto" : ""}`} data-testid="esq-passo" onClick={() => setPassoExp((v) => !v)}>
                <Lightbulb className="qb-lampada" size={42} strokeWidth={1.7} aria-hidden />
                <div className="qb-passo-t">
                  {passoUi < esq.passos.length ? (
                    <>
                      <b>Passo {passoUi + 1} de {esq.passos.length}: {esq.passos[passoUi]!.titulo}</b>
                      <p>{esq.passos[passoUi]!.texto}</p>
                    </>
                  ) : <b>Conta concluída! {esq.resposta}</b>}
                </div>
                <span className="qb-barrinha" aria-hidden />
                <button type="button" className="qb-dicabtn" data-testid="esq-dica" disabled={passoUi >= esq.passos.length} onClick={(ev) => { ev.stopPropagation(); setDicaVista(passoUi); }}><Play size={16} aria-hidden fill="currentColor" /> Dica</button>
              </div>
            )}
            {dicaAberta && esq && (
              <div className="qb-msg is-dica" role="status" data-testid="esq-dica-texto">
                <p><b>Dica:</b> {esq.passos[passoUi]!.dica}</p>
                <button type="button" className="qb-chip" onClick={verResposta} data-testid="esq-resposta">Mostrar o passo</button>
              </div>
            )}
            {msgObj && <p className={`qb-msg is-${msgObj.t}`} role="status" data-testid="esq-msg">{msgObj.s}</p>}
            {opcoesAtuais.length > 0 && (
              <div className="qb-esq qb-opcoes" role="group" aria-label="Escolha a resposta" data-testid="esq-opcoes">
                {opcoesAtuais.map((o) => <button key={o} type="button" className="qb-chip qb-opcao" data-testid={`opcao-${o}`} onPointerDown={(ev) => ev.preventDefault()} onClick={() => escolher(o)}>{o}</button>)}
              </div>
            )}
            <div className="qb-pad" data-testid="quadro-teclas">
              <div className="qb-abas" role="tablist" aria-label="Tipo de tecla">
                {abas.map((x) => (
                  <button key={x.id} type="button" role="tab" aria-selected={x.id === aba.id} className={`qb-aba${x.id === aba.id ? " is-on" : ""}`} data-testid={`aba-${x.id}`} onPointerDown={(ev) => ev.preventDefault()} onClick={() => setAbaSel({ passo: passoUi, id: x.id })}>
                    {x.id === "num" ? <Calculator size={24} aria-hidden /> : x.id === "sin" ? <span className="qb-aba-ico" aria-hidden>+−<br />×÷</span> : <span className="qb-aba-aa" aria-hidden>Aa</span>}
                    <span>{x.nome}</span>
                  </button>
                ))}
              </div>
              <div className="qb-grade" role="group" aria-label={aba.nome}>
                {aba.teclas.map((k) => (
                  <button key={k.ch} type="button" className="qb-tecla" aria-label={k.rot ?? k.ch} data-testid={`tecla-${k.ch}`} onPointerDown={(ev) => ev.preventDefault()} onClick={() => teclar(k.ch)}>{k.rot ?? k.ch}</button>
                ))}
                <button type="button" className="qb-tecla is-apagar" aria-label="Apagar último" data-testid="tecla-apagar" onPointerDown={(ev) => ev.preventDefault()} onClick={() => teclar("⌫", "apagar")}><Delete size={26} aria-hidden /></button>
                <button type="button" className="qb-tecla is-enter" aria-label={esq ? "Próxima casa ou conferir" : "Próxima linha"} data-testid="tecla-prox" onPointerDown={(ev) => ev.preventDefault()} onClick={() => (esq ? entrar() : teclar("↵", "linha"))}><CornerDownLeft size={30} aria-hidden /></button>
              </div>
            </div>
          </div>
        )}
      </div>
      <footer className="qb-rodape" aria-hidden="true"><b>APROVUM</b><i>{"///"}</i><span>FOCO. DISCIPLINA. APROVAÇÃO.</span></footer>
    </div>
  );
}
