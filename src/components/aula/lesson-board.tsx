"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Crosshair,
  Gavel,
  Lightbulb,
  ListChecks,
  Network,
  NotebookPen,
  Quote,
  ScrollText,
  Sparkles,
  Target,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { BOARD_CARDS, cardTitle, isLegalBoard, type LessonBoard as Board } from "@/domain/content/board";

export interface BoardLessonInfo {
  id: string;
  title: string;
  objective: string;
  trailId: string;
  trailTitle: string;
  estimatedMinutes: number;
}

export interface BoardOutlineItem {
  id: string;
  title: string;
  module: string | null;
}

export interface BoardCardMeta {
  /** Temas (seções) que o card abre. */
  count: number;
  /** Todos os temas do card já lidos (card 8: os três níveis aprovados). */
  done: boolean;
  /** % estudado do card (0–100). */
  pct: number;
}

function CardShell({
  n,
  title,
  subtitle,
  children,
  meta,
  themes,
  keepPreview = false,
  footer,
  testId,
  className = "",
}: {
  n: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  meta?: BoardCardMeta;
  /** Conteúdo completo do card (temas, questões e botão de avançar). Substitui a prévia. */
  themes?: ReactNode;
  /** Mantém a prévia visual acima dos temas (ex.: mapa mental). */
  keepPreview?: boolean;
  /** Rodapé do card (navegação entre cards). */
  footer?: ReactNode;
  testId?: string;
  className?: string;
}) {
  const full = themes != null;
  return (
    <article
      className={`al-card ${full ? "al-card-completo" : ""} ${className}`}
      aria-labelledby={`al-card-${n}`}
      data-testid={testId}
      data-card={n}
      data-concluido={meta?.done ? "1" : undefined}
    >
      <header className="al-card-topo">
        <span className="al-num" aria-hidden>
          {n}
        </span>
        <h2 id={`al-card-${n}`} className="al-card-titulo">
          {title}
        </h2>
        {full && n !== 8 && meta && meta.count > 0 && (
          <span className="al-card-qtd">
            {meta.count} {meta.count === 1 ? "tema" : "temas"}
          </span>
        )}
        {meta?.done && <CircleCheck className="al-card-ok" aria-label="Concluído" />}
      </header>
      {subtitle && <p className="al-card-sub">{subtitle}</p>}
      {(!full || keepPreview) && children && <div className="al-card-corpo">{children}</div>}
      {full && <div className="al-card-temas">{themes}</div>}
      {footer}
    </article>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="al-vazio">{children}</p>;

const situation = (pct: number) => (pct >= 100 ? "concluido" : pct > 0 ? "andamento" : "nao_iniciado");

/** Gráfico circular do % estudado (verde concluído, laranja em andamento). */
function ProgressRing({ pct }: { pct: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <span className="al-anel" aria-hidden>
      <svg viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} className="al-anel-trilho" />
        <circle cx="18" cy="18" r={r} className="al-anel-valor" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <span className="al-anel-texto">{v}%</span>
    </span>
  );
}

/**
 * Visão da aula: cabeçalho, banner, nove cards didáticos, pontos-chave e navegação entre
 * aulas. Tudo vem da aula aberta (seções reais, itens do conteúdo, questões e progresso).
 */
export function LessonBoardView({
  board,
  lesson,
  position,
  moduleTitle,
  progressPct,
  prevId,
  nextId,
  reading,
  levelsPassed,
  cards,
  themes,
  footers,
  active,
  onSelect,
  startLabel,
  onStart,
  notesCount,
  onNotes,
  notices,
  after,
}: {
  board: Board;
  lesson: BoardLessonInfo;
  position: { index: number; total: number } | null;
  moduleTitle: string | null;
  progressPct: number;
  prevId: string | null;
  nextId: string | null;
  reading: { seen: number; total: number };
  levelsPassed: number;
  cards: Record<number, BoardCardMeta>;
  startLabel: string;
  onStart: () => void;
  /** Conteúdo completo de cada card (número → temas/questões), exposto no próprio card. */
  themes: Record<number, ReactNode>;
  /** Rodapé de cada card (avançar/voltar). */
  footers: Record<number, ReactNode>;
  /** Card exibido (um por vez). */
  active: number;
  onSelect: (n: number) => void;
  notesCount: number;
  onNotes: () => void;
  notices?: ReactNode;
  after?: ReactNode;
}) {
  const card = (n: number) => ({ meta: cards[n], themes: themes[n], footer: footers[n] });
  const legal = isLegalBoard(board);

  const n2 = (i: number) => String(i).padStart(2, "0");
  return (
    <div className="al" data-testid="visao-aula">
      {/* Cabeçalho da aula + banner */}
      <div className="al-topo">
        <div className="al-cabecalho">
          <nav aria-label="Trilha" className="al-trilha">
            <Link href="/trilhas">Estudos</Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span className="truncate">{lesson.trailTitle}</span>
            <ChevronRight className="size-3.5" aria-hidden />
            <span aria-current="page" className="truncate">
              {board.title.lead ? `${board.title.lead} ${board.title.highlight}` : board.title.highlight}
            </span>
          </nav>
          <div className="al-meta">
            {position && <span className="al-chip-aula">Aula {n2(position.index + 1)}</span>}
            {moduleTitle && <span className="al-chip-modulo">{moduleTitle}</span>}
            <span className="al-pct" data-testid="progresso-aula">{progressPct}%</span>
            <span className="al-barra" role="progressbar" aria-label="Progresso nesta aula" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progressPct}%` }} />
            </span>
          </div>
          <h1 className="al-titulo">
            {board.title.lead} <span>{board.title.highlight}</span>
          </h1>
          {board.legalBasis && <p className="al-base">{board.legalBasis}</p>}
          <p className="al-desc">{lesson.objective}</p>
          <div className="al-acoes">
            <button type="button" className="al-btn al-btn-vermelho" onClick={onStart}>
              {startLabel} <ArrowRight className="size-4" aria-hidden />
            </button>
            <button type="button" className="al-btn al-btn-contorno" onClick={onNotes}>
              <NotebookPen className="size-4" aria-hidden /> Minhas anotações ({notesCount})
            </button>
          </div>
          <p className="al-tempo">
            <span data-testid="secoes-vistas">{reading.seen} de {reading.total}</span> temas lidos · {levelsPassed} de 3 níveis aprovados · ~{lesson.estimatedMinutes} min
          </p>
        </div>
        <div className="al-banner" aria-hidden>
          <span className="al-banner-arte" />
          <span className="al-banner-sombra" />
          <p className="al-banner-frase">
            Conhecimento
            <br />é a sua melhor
            <br />
            <span>arma.</span>
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/aprovum-login-logo.png" alt="" width={523} height={107} className="al-banner-logo" />
        </div>
      </div>

      {notices && <div className="al-avisos">{notices}</div>}

      <nav className="al-passos" aria-label="Cards da aula" id="al-cards">
        <ol>
          {BOARD_CARDS.map((c) => (
            <li key={c.n}>
              <button
                type="button"
                onClick={() => onSelect(c.n)}
                aria-current={active === c.n ? "step" : undefined}
                data-situacao={situation(cards[c.n]?.pct ?? 0)}
                data-concluido={cards[c.n]?.done ? "1" : undefined}
                aria-label={`Card ${c.n}: ${cardTitle(c.n, legal)} — ${cards[c.n]?.pct ?? 0}% estudado${cards[c.n]?.done ? " (concluído)" : ""}`}
              >
                <ProgressRing pct={cards[c.n]?.pct ?? 0} />
                <span className="al-passo-titulo" aria-hidden>
                  <span className="al-passo-n">{c.n}</span> {cardTitle(c.n, legal)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="al-grade" data-card-ativo={active}>
        {/* 1 */}
        {active === 1 && (
        <CardShell n={1} title="Entenda o conceito" {...card(1)} testId="card-conceito">
          {board.concept ? (
            <>
              <div className="al-conceito">
                <Target className="al-conceito-icone" aria-hidden />
                <div className="al-md al-md-destaque">
                  <Markdown>{board.concept.markdown}</Markdown>
                </div>
              </div>
              {board.concept.example && (
                <div className="al-exemplo">
                  <p className="al-exemplo-titulo">
                    <Lightbulb className="size-5" aria-hidden /> Exemplo prático
                  </p>
                  <p>{board.concept.example.situation}</p>
                  {board.concept.example.answer && <p className="mt-1 font-semibold text-[#111318]">→ {board.concept.example.answer}</p>}
                </div>
              )}
            </>
          ) : (
            <Empty>Esta aula não tem uma explicação introdutória. Veja o conteúdo no estudo guiado.</Empty>
          )}
        </CardShell>
        )}

        {/* 2 */}
        {active === 2 && (
        <CardShell
          n={2}
          title="Visualize"
          subtitle={board.scheme.source === "temas" ? "Os temas desta aula" : board.scheme.source === "esquema" ? "Esquema do conteúdo" : "Os conceitos-chave"}
          {...card(2)}
          testId="card-visualize"
        >
          <ol className="al-esquema">
            {board.scheme.items.map((it, i) => (
              <li key={i}>
                <span className="al-esquema-no" aria-hidden>
                  {i + 1}
                </span>
                <span className="al-esquema-rotulo">{it.label}</span>
                {it.detail && <span className="al-esquema-detalhe">{it.detail}</span>}
              </li>
            ))}
          </ol>
        </CardShell>
        )}

        {/* 3 */}
        {active === 3 && (
        <CardShell n={3} title={cardTitle(3, legal)} subtitle={board.legalBasis ?? (legal ? undefined : "Textos-base comentados")} {...card(3)} testId="card-lei">
          {board.law ? (
            <>
              {board.law.markdown && (
                <div className="al-lei">
                  <Quote className="al-lei-aspas" aria-hidden />
                  <div className="al-md">
                    <Markdown legal>{board.law.markdown}</Markdown>
                  </div>
                </div>
              )}
              {board.law.items.length > 0 && (
                <ul className="al-dispositivos">
                  {board.law.items.map((d, i) => (
                    <li key={i}>
                      <Gavel className="size-4 shrink-0 text-[#E50914]" aria-hidden />
                      <span>
                        {d.marker && <strong>{d.marker} </strong>}
                        {d.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="al-nota">O texto legal exibido é o do seu conteúdo. Confira sempre a redação vigente na fonte oficial.</p>
            </>
          ) : (
            legal ? <Empty>Este conteúdo não tem texto legal.</Empty> : null
          )}
        </CardShell>
        )}

        {/* 4 */}
        {active === 4 && (
        <CardShell
          n={4}
          title={cardTitle(4, legal)}
          subtitle={board.glossary?.source === "dispositivos" ? "Cada dispositivo do conteúdo" : legal ? "Entenda o significado de cada palavra" : "Cada conceito, em linguagem simples"}
          {...card(4)}
          testId="card-destrinche"
        >
          {board.glossary ? <BoardTable headers={board.glossary.headers} rows={board.glossary.rows} firstRed /> : <Empty>Esta aula não tem termos destrinchados em tabela.</Empty>}
        </CardShell>
        )}

        {/* 5 */}
        {active === 5 && (
        <CardShell n={5} title="Diferencie" subtitle={board.compare?.title} {...card(5)} testId="card-diferencie">
          {board.compare ? (
            board.compare.panels ? (
              <div className="al-paineis">
                {[1, 2].map((col) => (
                  <section key={col} className="al-painel" aria-label={board.compare!.headers[col]}>
                    <h3 className={col === 1 ? "al-painel-titulo al-painel-escuro" : "al-painel-titulo"}>
                      <span className="al-md-inline">
                        <Markdown>{board.compare!.headers[col] || "—"}</Markdown>
                      </span>
                    </h3>
                    <dl>
                      {board.compare!.rows.map((r, i) => (
                        <div key={i}>
                          {r[0] && (
                            <dt className="al-md-inline">
                              <Markdown>{r[0]}</Markdown>
                            </dt>
                          )}
                          <dd className="al-md-inline">
                            <Markdown>{r[col] ?? ""}</Markdown>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            ) : (
              <BoardTable headers={board.compare.headers} rows={board.compare.rows} />
            )
          ) : (
            <Empty>Esta aula não tem um quadro comparativo.</Empty>
          )}
        </CardShell>
        )}

        {/* 6 */}
        {active === 6 && (
        <CardShell n={6} title="Veja na prática" subtitle="Exemplos completos" {...card(6)} testId="card-pratica">
          {board.examples.items.length ? (
            <ol className="al-exemplos">
              {board.examples.items.map((e, i) => (
                <li key={i}>
                  <p className="al-exemplos-titulo">
                    Exemplo {i + 1}
                    {e.title ? ` — ${e.title}` : ""}
                  </p>
                  <p>{e.situation}</p>
                  {e.answer && (
                    <p className="al-exemplos-resp">
                      <ArrowRight className="size-3.5 shrink-0" aria-hidden /> {e.answer}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Esta aula não tem exemplos práticos.</Empty>
          )}
        </CardShell>
        )}

        {/* 7 */}
        {active === 7 && (
        <CardShell n={7} title="Atenção à banca" subtitle="Pegadinhas e exceções" {...card(7)} testId="card-banca">
          {board.traps.items.length ? (
            <ul className="al-alertas">
              {board.traps.items.map((t, i) => (
                <li key={i}>
                  <AlertTriangle className="al-alerta-icone" aria-hidden />
                  <span>
                    <strong>{t.head}</strong>
                    {t.rest && <span className="block">{t.rest}</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Esta aula não tem pegadinhas destacadas.</Empty>
          )}
        </CardShell>
        )}

        {/* 8 */}
        {active === 8 && (
        <CardShell n={8} title="Questões de fixação" subtitle="Fácil → médio → difícil" testId="card-questao" className="al-card-questao" {...card(8)}>
          <Empty>As questões desta aula ainda não foram geradas.</Empty>
        </CardShell>
        )}

        {/* 9 */}
        {active === 9 && (
        <CardShell n={9} title="Mapa mental" testId="card-mapa" keepPreview {...card(9)}>
          <MindMap center={board.mindmap.center} branches={board.mindmap.branches} />
        </CardShell>
        )}
      </div>

      {/* Pontos-chave */}
      {board.keyPoints.length > 0 && (
        <section className="al-pontos" aria-labelledby="al-pontos-titulo">
          <h2 id="al-pontos-titulo" className="al-pontos-titulo">
            <Crosshair className="size-6 text-[#E50914]" aria-hidden />
            <span>
              <span className="text-[#E50914]">Pontos-chave</span> para não esquecer
            </span>
          </h2>
          <ul>
            {board.keyPoints.map((k, i) => {
              const Icon = [ScrollText, BookOpen, CircleCheck, Sparkles, ListChecks][i % 5]!;
              return (
                <li key={i}>
                  <Icon className="al-pontos-icone" aria-hidden />
                  <span>{k}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {after}

      {/* Navegação entre aulas */}
      <nav className="al-nav" aria-label="Navegação entre aulas">
        {prevId ? (
          <Link href={`/aula/${prevId}`} className="al-btn al-btn-contorno">
            <ArrowLeft className="size-4" aria-hidden /> Aula anterior
          </Link>
        ) : (
          <span className="al-btn al-btn-contorno al-desabilitado" aria-disabled>
            <ArrowLeft className="size-4" aria-hidden /> Aula anterior
          </span>
        )}
        {position && (
          <div className="al-nav-pos">
            <span>
              {position.index + 1} de {position.total} {position.total === 1 ? "aula" : "aulas"}
            </span>
            <span className="al-barra" aria-hidden>
              <span style={{ width: `${((position.index + 1) / position.total) * 100}%` }} />
            </span>
          </div>
        )}
        {nextId ? (
          <Link href={`/aula/${nextId}`} className="al-btn al-btn-vermelho">
            Próxima aula <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className="al-btn al-btn-vermelho al-desabilitado" aria-disabled>
            Próxima aula <ArrowRight className="size-4" aria-hidden />
          </span>
        )}
      </nav>
    </div>
  );
}

function BoardTable({ headers, rows, firstRed = false }: { headers: string[]; rows: string[][]; firstRed?: boolean }) {
  return (
    <div className="al-tabela-rolagem" tabIndex={0} role="region" aria-label="Tabela (role para o lado se precisar)">
      <table className="al-tabela">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col" className="al-md-inline">
                <Markdown>{h || " "}</Markdown>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {headers.map((_, j) => (
                <td key={j} className={`al-md-inline ${j === 0 && firstRed ? "al-termo" : ""}`}>
                  <Markdown>{r[j] ?? ""}</Markdown>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Mapa mental: nó central e até seis ramos, ligados por linhas (SVG). No celular, ramos em lista. */
export function MindMap({ center, branches }: { center: string; branches: Array<{ label: string; items: string[] }> }) {
  const slots = ["a", "b", "c", "d", "e", "f"];
  const pos: Record<string, [number, number]> = { a: [16.6, 16.6], b: [83.3, 16.6], c: [16.6, 50], d: [83.3, 50], e: [16.6, 83.3], f: [83.3, 83.3] };
  return (
    <div className="al-mapa" role="group" aria-label={`Mapa mental: ${center}`}>
      <svg className="al-mapa-linhas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {branches.map((_, i) => {
          const [x, y] = pos[slots[i]!]!;
          return <line key={i} x1="50" y1="50" x2={x} y2={y} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="al-mapa-centro">
        <Network className="size-4 opacity-70" aria-hidden />
        <span>{center}</span>
      </div>
      {branches.map((b, i) => (
        <div key={b.label} className="al-mapa-ramo" style={{ gridArea: slots[i] }}>
          <p className="al-mapa-rotulo">{b.label}</p>
          <ul>
            {b.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Árvore das aulas do estudo, desenhada na barra lateral do app (desktop) e no menu do
 * celular por portal: módulos expansíveis e a aula atual destacada.
 */
export function LessonTreePortal({ trailId, trailTitle, outline, currentId }: { trailId: string; trailTitle: string; outline: BoardOutlineItem[]; currentId: string }) {
  // Só no navegador (os pontos de encaixe ficam no casco do app).
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const targets = mounted ? ["aula-arvore-desktop", "aula-arvore-movel"].map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e) : [];
  if (!targets.length || outline.length === 0) return null;
  return <>{targets.map((t) => createPortal(<LessonTree key={t.id} trailId={trailId} trailTitle={trailTitle} outline={outline} currentId={currentId} />, t))}</>;
}

const noop = () => () => {};

function LessonTree({ trailId, trailTitle, outline, currentId }: { trailId: string; trailTitle: string; outline: BoardOutlineItem[]; currentId: string }) {
  const groups = useMemo(() => {
    const out: Array<{ module: string; items: BoardOutlineItem[] }> = [];
    for (const it of outline) {
      const m = it.module ?? "Aulas";
      const last = out.at(-1);
      if (last && last.module === m) last.items.push(it);
      else out.push({ module: m, items: [it] });
    }
    return out;
  }, [outline]);
  const currentGroup = groups.findIndex((g) => g.items.some((i) => i.id === currentId));
  const [open, setOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Set<number>>(() => new Set([Math.max(0, currentGroup)]));
  const toggle = (i: number) => setOpenGroups((s) => (s.has(i) ? new Set([...s].filter((x) => x !== i)) : new Set([...s, i])));
  return (
    <nav className="al-arvore" aria-label="Aulas deste estudo">
      <p className="al-arvore-rotulo">Aulas deste estudo</p>
      <button type="button" className="al-arvore-estudo" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="truncate">{trailTitle}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ol className="al-arvore-grupos">
          {groups.map((g, gi) => (
            <li key={gi}>
              {groups.length > 1 ? (
                <button type="button" className="al-arvore-modulo" aria-expanded={openGroups.has(gi)} onClick={() => toggle(gi)}>
                  <span className="truncate">
                    {gi + 1}. {g.module}
                  </span>
                  <ChevronDown className={`size-3.5 shrink-0 transition-transform ${openGroups.has(gi) ? "rotate-180" : ""}`} aria-hidden />
                </button>
              ) : null}
              {(groups.length === 1 || openGroups.has(gi)) && (
                <ul className="al-arvore-aulas">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <Link href={`/aula/${it.id}`} aria-current={it.id === currentId ? "page" : undefined}>
                        <span className="al-arvore-bola" aria-hidden />
                        <span className="truncate">{it.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
      <Link href={`/trilhas/${trailId}/cobertura`} className="al-arvore-ver">
        Ver cobertura do estudo <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </nav>
  );
}
