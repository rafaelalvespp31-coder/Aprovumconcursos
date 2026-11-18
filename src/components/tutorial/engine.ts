"use client";
import type { Driver, DriveStep } from "driver.js";
import { rotuloPasso, segmentos, type Alvo, type Tutorial } from "@/domain/tutorial/roteiros";

export interface Controle { parar(): void }
export interface Ganchos {
  navegar(rota: string): void;
  /** Rota atual (lida na hora, não congelada). */
  rotaAtual(): string;
  aoPasso(i: number): void;
  aoConcluir(): void;
  /** "Pular tour": o aluno não quer ver. */
  aoPular(i: number): void;
  /** Fechou no X/Esc: guarda o ponto para retomar. */
  aoPausar(i: number): void;
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function visivel(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== "hidden" && cs.display !== "none";
}

/** Primeiro candidato VISÍVEL na tela (a barra lateral some no celular, o menu de baixo some no computador). */
export function acharAlvo(alvos: Alvo[]): { el: Element; nota: string | null } | null {
  for (const a of alvos) {
    const sel = typeof a === "string" ? a : a.sel;
    let achados: Element[] = [];
    try { achados = Array.from(document.querySelectorAll(sel)); } catch { continue; }
    const el = achados.find(visivel);
    if (el) return { el, nota: typeof a === "string" ? null : a.nota };
  }
  return null;
}

async function esperarAlvo(alvos: Alvo[], ate = 2200): Promise<void> {
  const fim = Date.now() + ate;
  while (Date.now() < fim) { if (acharAlvo(alvos)) return; await dormir(120); }
}


/** "Câmera" do tour: mira de enquadramento que desliza e trava no alvo, mais uma vinheta. Só decoração (não captura toque). */
function criarCamera(reduz: boolean) {
  const vinheta = document.createElement("div");
  vinheta.className = "tour-vinheta";
  const cam = document.createElement("div");
  cam.className = "tour-cam" + (reduz ? " tour-cam-calma" : "");
  cam.setAttribute("aria-hidden", "true");
  cam.innerHTML = "<i></i><i></i><i></i><i></i><b></b>";
  document.body.append(vinheta, cam);
  requestAnimationFrame(() => vinheta.classList.add("on"));
  let alvo: Element | null = null;
  let raf = 0;
  let ate = 0;
  const pos = () => {
    const ok = alvo && alvo.isConnected && alvo.id !== "driver-dummy-element";
    const r = ok ? alvo!.getBoundingClientRect() : null;
    if (!r || r.width < 8 || r.height < 8) { cam.classList.remove("on"); return; }
    const m = 10;
    cam.style.transform = `translate(${r.left - m}px, ${r.top - m}px)`;
    cam.style.width = `${r.width + m * 2}px`;
    cam.style.height = `${r.height + m * 2}px`;
    cam.classList.add("on");
  };
  const laco = () => { pos(); if (performance.now() < ate) raf = requestAnimationFrame(laco); else raf = 0; };
  const seguir = (ms: number) => { ate = Math.max(ate, performance.now() + ms); if (!raf) raf = requestAnimationFrame(laco); };
  const aoMexer = () => seguir(120);
  window.addEventListener("scroll", aoMexer, true);
  window.addEventListener("resize", aoMexer);
  return {
    focar(el: Element) {
      alvo = el;
      cam.classList.remove("trava"); void cam.offsetWidth; cam.classList.add("trava"); // reinicia o "travar foco"
      seguir(1100); // acompanha a rolagem suave até assentar
    },
    remover() {
      window.removeEventListener("scroll", aoMexer, true);
      window.removeEventListener("resize", aoMexer);
      cancelAnimationFrame(raf);
      cam.classList.remove("on"); vinheta.classList.remove("on");
      setTimeout(() => { cam.remove(); vinheta.remove(); }, 350);
    },
  };
}

/** Roda o tutorial: Driver.js (carregado só agora) em sessões por página, navegando entre elas. */
export async function rodarTutorial(t: Tutorial, inicio: number, g: Ganchos): Promise<Controle> {
  const { driver } = await import("driver.js");
  const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const segs = segmentos(t.passos, t.rota);
  let atual: Driver | null = null;
  let cancelado = false;
  let trocando = false;
  let ultimoGlobal = inicio;
  const camera = criarCamera(reduz);

  const encerrar = () => { trocando = true; try { atual?.destroy(); } catch { /* já destruído */ } atual = null; trocando = false; };

  const garantirRota = async (rota: string) => {
    if (g.rotaAtual().startsWith(rota)) return;
    g.navegar(rota);
    const fim = Date.now() + 6000;
    while (!cancelado && Date.now() < fim && !g.rotaAtual().startsWith(rota)) await dormir(100);
    await dormir(250); // a tela nova termina de montar
  };

  const abrir = async (i: number): Promise<void> => {
    const seg = segs.find((s) => i >= s.de && i <= s.ate);
    if (!seg || cancelado) return;
    await garantirRota(seg.rota);
    if (cancelado) return;
    await esperarAlvo(t.passos[i]!.alvos);
    if (cancelado) return;
    encerrar();
    const notas = new Map<number, string | null>();
    const steps: DriveStep[] = t.passos.slice(seg.de, seg.ate + 1).map((p, k) => ({
      element: () => {
        const r = acharAlvo(p.alvos);
        notas.set(k, r?.nota ?? null);
        return (r?.el ?? null) as Element; // sem alvo na tela: o Driver.js centraliza o balão, sem destaque quebrado
      },
      popover: {
        title: `${p.titulo}`,
        description: p.texto,
        side: p.lado ?? "bottom",
        align: "center",
        showButtons: seg.de + k === 0 ? ["next", "close"] : ["previous", "next", "close"],
        doneBtnText: "CONCLUIR",
      },
    }));
    const total = t.passos.length;
    const d = driver({
      steps,
      animate: !reduz,
      smoothScroll: !reduz,
      overlayColor: "#0A0A0A",
      overlayOpacity: 0.62,
      stagePadding: 8,
      stageRadius: 14,
      popoverOffset: 14,
      allowClose: true,
      allowKeyboardControl: true,
      disableActiveInteraction: true, // o tour mostra; nunca clica pelo aluno nem dispara ação real
      overlayClickBehavior: "close",
      showProgress: false,
      popoverClass: "aprovum-tour",
      nextBtnText: "PRÓXIMO",
      prevBtnText: "ANTERIOR",
      doneBtnText: "CONCLUIR",
      onPopoverRender: (pop, { state }) => {
        const k = state.activeIndex ?? 0;
        const gi = seg.de + k;
        const nota = notas.get(k);
        if (nota) pop.description.textContent = `${t.passos[gi]!.texto} ${nota}`;
        pop.title.textContent = `${String(gi + 1).padStart(2, "0")} · ${t.passos[gi]!.titulo}`;
        pop.wrapper.querySelector(".tour-extra")?.remove();
        const extra = document.createElement("div");
        extra.className = "tour-extra";
        const barra = document.createElement("div");
        barra.className = "tour-barra"; barra.setAttribute("role", "progressbar");
        barra.setAttribute("aria-valuemin", "1"); barra.setAttribute("aria-valuemax", String(total)); barra.setAttribute("aria-valuenow", String(gi + 1));
        const i = document.createElement("i"); i.style.width = `${((gi + 1) / total) * 100}%`; barra.appendChild(i);
        const rot = document.createElement("span"); rot.className = "tour-rotulo"; rot.textContent = rotuloPasso(gi, total);
        const pular = document.createElement("button"); pular.type = "button"; pular.className = "tour-pular"; pular.textContent = "PULAR TOUR";
        pular.addEventListener("click", () => { const at = ultimoGlobal; encerrar(); cancelado = true; camera.remover(); g.aoPular(at); });
        extra.append(rot, barra, pular);
        pop.description.insertAdjacentElement("afterend", extra);
      },
      onHighlightStarted: (el, _step, { state }) => {
        if (el) camera.focar(el);
        ultimoGlobal = seg.de + (state.activeIndex ?? 0);
        g.aoPasso(ultimoGlobal);
      },
      onNextClick: (_el, _step, { state, driver: dr }) => {
        const gi = seg.de + (state.activeIndex ?? 0);
        if (gi >= total - 1) { encerrar(); cancelado = true; camera.remover(); g.aoConcluir(); return; }
        if (gi < seg.ate) { dr.moveNext(); return; }
        encerrar();
        void abrir(gi + 1);
      },
      onPrevClick: (_el, _step, { state, driver: dr }) => {
        const gi = seg.de + (state.activeIndex ?? 0);
        if (gi <= 0) return;
        if (gi > seg.de) { dr.movePrevious(); return; }
        encerrar();
        void abrir(gi - 1);
      },
      onCloseClick: () => { const at = ultimoGlobal; encerrar(); cancelado = true; camera.remover(); g.aoPausar(at); },
      onDestroyed: () => { if (!trocando) atual = null; },
    });
    atual = d;
    d.drive(i - seg.de);
  };

  void abrir(inicio);
  return { parar: () => { cancelado = true; encerrar(); camera.remover(); } };
}
