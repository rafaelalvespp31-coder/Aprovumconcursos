"use client";
import "./tutorial.css";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, Crown, Flag, MessageCircle, Play, RotateCcw, Sparkles, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { FREE_LIMITS } from "@/domain/plans/limits";
import { passoValido, TOUR_ID, TUTORIAIS, tutorialPorId } from "@/domain/tutorial/roteiros";
import type { EstadoTutoriais, ProgressoTutorial } from "@/server/services/tutorial";
import { salvarProgressoTutorialAction } from "@/app/(app)/tutorial-actions";
import type { Controle } from "./engine";
import { GuiaInstalar } from "@/components/push/guia-instalar";

interface Ctx { iniciar: (id: string, desde?: number) => void; abrirAjuda: () => void }
const TutorialCtx = createContext<Ctx>({ iniciar: () => undefined, abrirAjuda: () => undefined });
export const useTutorial = () => useContext(TutorialCtx);

const FAQ: Array<{ p: string; r: string }> = [
  { p: "Como continuo de onde parei?", r: "No Painel, o cartão da próxima aula leva você direto ao ponto em que estava, e a faixa abaixo lista as últimas aulas que você abriu." },
  { p: "Quantas aulas e questões posso fazer por dia?", r: `No plano gratuito você estuda ${FREE_LIMITS.lessonsPerDay} aula e ${FREE_LIMITS.questionsPerDay} questões por dia; os planos pagos liberam sem limite, em Meu Plano. No Modo Jogo o gratuito faz ${FREE_LIMITS.gameQuestionsPerDay} questões por dia (libera de novo no dia seguinte); os planos pagos jogam sem limite.` },
  { p: "Como o Mentor pode me ajudar?", r: "Toque no Mentor para ver seu plano e suas prioridades, ou na aba Voz para conversar falando. Peça “mostra no quadro” para ele desenhar a explicação." },
  { p: "Onde vejo meu desempenho?", r: "Em Desempenho: suas respostas, seus acertos e a sua evolução ao longo dos dias." },
  { p: "Como coloco o APROVUM como ícone no celular?", r: "Android: no Chrome, toque em ⋮ e em “Instalar app”. iPhone: no Safari, toque em Compartilhar e em “Adicionar à Tela de Início”. Depois abra pelo ícone novo." },
  { p: "Como ativo as notificações?", r: "Abra o Mentor e toque no sininho do topo (ou use Perfil → Avisos no celular). No iPhone, antes instale o app na Tela de Início. Depois disso os avisos chegam mesmo com o app fechado." },
  { p: "Posso rever o tour?", r: "Sempre. Abra esta central (botão ?) e toque em “Iniciar tour completo”." },
];

export function TutorialProvider({ estado, loginId, children }: { estado: EstadoTutoriais | null; loginId: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  const [prog, setProg] = useState<Record<string, ProgressoTutorial>>(estado?.progresso ?? {});
  const ativos = estado?.ativos ?? {};
  const ctl = useRef<Controle | null>(null);
  const [rodando, setRodando] = useState(false);
  const [boasVindas, setBoasVindas] = useState<null | "novo" | "retomar">(null);
  const [ajuda, setAjuda] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fim, setFim] = useState<string | null>(null);

  const gravar = useCallback((id: string, patch: { passo?: number; concluido?: boolean; pulado?: boolean; reiniciar?: boolean; ocultar?: boolean }) => {
    setProg((p) => {
      const at = p[id];
      return { ...p, [id]: { ocultar: patch.ocultar ?? at?.ocultar ?? false, passo: patch.passo ?? at?.passo ?? 0, concluido: patch.reiniciar ? !!patch.concluido : !!(patch.concluido || at?.concluido), pulado: patch.reiniciar ? !!patch.pulado : !!((patch.pulado && !at?.concluido) || at?.pulado) } };
    });
    void salvarProgressoTutorialAction({ tutorialId: id, ...patch });
  }, []);

  const parar = useCallback(() => { ctl.current?.parar(); ctl.current = null; setRodando(false); }, []);

  const iniciar = useCallback((id: string, desde = 0) => {
    const t = tutorialPorId(id);
    if (!t || ativos[id] === false) return;
    if (id === "aula" && !pathRef.current.startsWith("/aula")) { setAviso("Abra uma aula e toque no ? de novo para ver este tutorial."); return; }
    setBoasVindas(null); setAjuda(false); setAviso(null);
    ctl.current?.parar();
    const passo = passoValido(t, desde);
    const antes = prog[id];
    gravar(id, { passo, reiniciar: passo === 0 && !!(antes?.concluido || antes?.pulado) ? true : undefined });
    setRodando(true);
    void import("./engine").then(({ rodarTutorial }) =>
      rodarTutorial(t, passo, {
        navegar: (rota) => router.push(rota),
        rotaAtual: () => pathRef.current,
        aoPasso: (i) => gravar(id, { passo: i }),
        aoConcluir: () => { gravar(id, { passo: t.passos.length - 1, concluido: true }); setRodando(false); ctl.current = null; setFim(t.titulo); },
        aoPular: (i) => { gravar(id, { passo: i, pulado: true }); setRodando(false); ctl.current = null; },
        aoPausar: (i) => { gravar(id, { passo: i }); setRodando(false); ctl.current = null; },
      }).then((c) => { ctl.current = c; }),
    ).catch(() => setRodando(false));
  }, [ativos, gravar, prog, router]);

  // Boas-vindas na primeira vez; "continuar de onde parou" se o tour ficou pela metade. Uma vez por sessão.
  useEffect(() => {
    if (!estado || ativos[TOUR_ID] === false) return;
    if (!/^\/(painel|trilhas)$/.test(pathname)) return;
    let key = `aprovum:tour:visto:${loginId}`;
    try { if (sessionStorage.getItem(key)) return; } catch { key = ""; }
    const p = prog[TOUR_ID];
    if (p?.ocultar) return;
    const modo = !p || p.concluido || p.pulado || p.passo === 0 ? "novo" : "retomar";
    if (!modo) return;
    let vivo = true;
    // espera a janela de boas-vindas do plano (se houver) fechar antes de aparecer
    const t = setInterval(() => {
      if (!vivo || document.querySelector(".cvp-fundo")) return;
      clearInterval(t);
      setBoasVindas(modo);
      try { if (key) sessionStorage.setItem(key, "1"); } catch { /* sem sessionStorage */ }
    }, 900);
    return () => { vivo = false; clearInterval(t); };
    // só na entrada: o progresso muda durante o tour e não deve reabrir a janela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, pathname]);

  const dispensar = () => { setBoasVindas(null); };
  useEffect(() => () => ctl.current?.parar(), []);
  useEffect(() => { if (!fim) return; const t = setTimeout(() => setFim(null), 3200); return () => clearTimeout(t); }, [fim]);
  useEffect(() => {
    if (!ajuda && !boasVindas) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setAjuda(false); if (boasVindas) dispensar(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajuda, boasVindas]);

  const naoMostrar = () => { gravar(TOUR_ID, { ocultar: true }); setBoasVindas(null); setAviso(null); setFim("Tudo certo: a janela de boas-vindas não aparece mais. Para rever, use o botão de ajuda"); };
  const ctx = useMemo<Ctx>(() => ({ iniciar, abrirAjuda: () => setAjuda(true) }), [iniciar]);
  const p0 = prog[TOUR_ID];
  const passoRetomar = p0 ? p0.passo : 0;
  const totalTour = tutorialPorId(TOUR_ID)!.passos.length;
  const lista = TUTORIAIS.filter((t) => t.id !== TOUR_ID && ativos[t.id] !== false);

  return (
    <TutorialCtx.Provider value={ctx}>
      {children}
      {estado && !rodando && !boasVindas && (
        <button type="button" className="tour-ajuda-btn" onClick={() => setAjuda(true)} aria-label="Central de ajuda" title="Ajuda" data-testid="ajuda-botao">
          <CircleHelp aria-hidden />
        </button>
      )}

      {boasVindas && (
        <div className="tour-fundo" role="dialog" aria-modal="true" aria-labelledby="tour-bv-titulo" data-testid="tour-boas-vindas">
          <div className="tour-cartao">
            <button type="button" className="tour-x" onClick={dispensar} aria-label="Fechar"><X aria-hidden /></button>
            <span className="tour-selo"><Flag aria-hidden /> OPERAÇÃO APROVUM</span>
            <h2 id="tour-bv-titulo">{boasVindas === "novo" ? "Sua missão começa aqui." : "Vamos continuar de onde você parou?"}</h2>
            <p>
              {boasVindas === "novo"
                ? "Seja bem-vindo ao APROVUM! Preparamos uma experiência para você conhecer todas as ferramentas que vão ajudar na sua preparação. Vou te mostrar como utilizar cada recurso e aproveitar o máximo da plataforma."
                : `Você parou no passo ${passoRetomar + 1} de ${totalTour} do tour guiado. Quer retomar daqui?`}
            </p>
            <details className="tour-instalar">
              <summary>Instale o app: ícone na tela do celular</summary>
              <GuiaInstalar className="mt-2" />
            </details>
            <div className="tour-acoes">
              {boasVindas === "novo" ? (
                <>
                  <button type="button" className="tour-primario" onClick={() => iniciar(TOUR_ID, 0)} autoFocus><Play aria-hidden /> INICIAR TOUR GUIADO</button>
                  <button type="button" className="tour-secundario" onClick={dispensar}>PULAR POR ENQUANTO</button>
                  <button type="button" className="tour-terciario" onClick={naoMostrar} data-testid="tour-nao-mostrar">Não mostrar mais</button>
                </>
              ) : (
                <>
                  <button type="button" className="tour-primario" onClick={() => iniciar(TOUR_ID, passoRetomar)} autoFocus><Play aria-hidden /> CONTINUAR TOUR</button>
                  <button type="button" className="tour-secundario" onClick={() => iniciar(TOUR_ID, 0)}><RotateCcw aria-hidden /> RECOMEÇAR</button>
                  <button type="button" className="tour-terciario" onClick={() => setBoasVindas(null)}>Agora não</button>
                  <button type="button" className="tour-terciario" onClick={naoMostrar} data-testid="tour-nao-mostrar">Não mostrar mais</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {ajuda && (
        <div className="tour-fundo tour-fundo-ajuda" onClick={(e) => e.target === e.currentTarget && setAjuda(false)} role="dialog" aria-modal="true" aria-labelledby="tour-aj-titulo" data-testid="central-ajuda">
          <div className="tour-painel">
            <div className="tour-painel-topo">
              <h2 id="tour-aj-titulo"><CircleHelp aria-hidden /> Central de ajuda</h2>
              <button type="button" className="tour-x" onClick={() => setAjuda(false)} aria-label="Fechar a ajuda"><X aria-hidden /></button>
            </div>
            <div className="tour-painel-corpo">
              <section>
                <h3>Conheça o APROVUM</h3>
                {ativos[TOUR_ID] !== false ? (
                  <button type="button" className="tour-linha tour-linha-destaque" onClick={() => iniciar(TOUR_ID, 0)}>
                    <Sparkles aria-hidden />
                    <span><b>Iniciar tour completo</b><small>{p0?.concluido ? "Você já concluiu. Refaça quando quiser." : `${totalTour} passos pelas principais ferramentas`}</small></span>
                  </button>
                ) : <p className="tour-vazio">O tour completo está desativado no momento.</p>}
                {p0?.ocultar && <button type="button" className="tour-linha" onClick={() => gravar(TOUR_ID, { ocultar: false })}><RotateCcw aria-hidden /><span><b>Voltar a mostrar boas-vindas no login</b><small>Hoje a janela está desligada</small></span></button>}
              </section>
              <section data-testid="ajuda-instalar">
                <h3>Ícone na tela do celular e avisos</h3>
                <p className="tour-vazio">Instale o APROVUM como app e ative os avisos (revisões e concursos chegam mesmo com o app fechado).</p>
                <GuiaInstalar className="mt-2" />
              </section>
              <section>
                <h3>Tutoriais por ferramenta</h3>
                {aviso && <p className="tour-aviso" role="status">{aviso}</p>}
                <ul>
                  {lista.map((t) => {
                    const aqui = t.rota !== "/aula" ? pathname.startsWith(t.rota) : pathname.startsWith("/aula");
                    return (
                      <li key={t.id}>
                        <button type="button" className="tour-linha" onClick={() => iniciar(t.id, 0)}>
                          {prog[t.id]?.concluido ? <CheckCircle2 aria-hidden className="tour-ok" /> : <Play aria-hidden />}
                          <span><b>{t.titulo}</b><small>{t.resumo}{aqui ? " · está nesta tela" : ""}</small></span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <section>
                <h3>Perguntas frequentes</h3>
                <div className="tour-faq">
                  {FAQ.map((f) => (
                    <details key={f.p}><summary>{f.p}<ChevronDown aria-hidden /></summary><p>{f.r}</p></details>
                  ))}
                </div>
              </section>
              <section>
                <h3>Ajuda com o Mentor Aprovum</h3>
                <button
                  type="button"
                  className="tour-linha"
                  onClick={() => {
                    setAjuda(false);
                    const b = document.querySelector<HTMLElement>('[data-testid="mentor-bolha"]');
                    if (b) setTimeout(() => b.click(), 120); else setAviso("O Mentor está aberto ou indisponível nesta tela.");
                  }}
                >
                  <MessageCircle aria-hidden />
                  <span><b>Perguntar ao Mentor</b><small>Tire dúvidas por texto ou por voz</small></span>
                </button>
                <a className="tour-linha" href="/plano"><Crown aria-hidden /><span><b>Meu Plano</b><small>Limites diários e planos disponíveis</small></span></a>
              </section>
            </div>
          </div>
        </div>
      )}

      {fim && <div className="tour-toast" role="status"><CheckCircle2 aria-hidden /> {fim.startsWith("Tudo") ? fim : `Missão cumprida: ${fim}`}</div>}
    </TutorialCtx.Provider>
  );
}
