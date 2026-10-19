"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpenText, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { pct, timeAgo, type StudiesHome } from "@/domain/studies/home";
import { DisciplineIcon, Ring } from "./parts";

/** Recortes da arte tática usados como fundo dos cards (sem repetir o mesmo enquadramento lado a lado). */
const FRAMES = ["0 0, 8% 45%", "0 0, 30% 42%", "0 0, 52% 38%", "0 0, 82% 62%", "0 0, 86% 14%", "0 0, 60% 70%"];

/**
 * "Seus estudos": faixa escura com os estudos do aluno em carrossel horizontal (toque,
 * mouse, teclado), progresso real de cada um e destaque do estudo em andamento.
 */
export function StudySubjectsSection({ data, base = "" }: { data: StudiesHome; base?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const items = data.studies;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      const n = Math.max(1, Math.ceil((el.scrollWidth - 4) / el.clientWidth));
      setPages(n);
      setPage(Math.min(n - 1, Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [items.length]);
  const go = (p: number) => track.current?.scrollTo({ left: p * (track.current?.clientWidth ?? 0), behavior: "smooth" });

  return (
    <section className="es" aria-labelledby="es-titulo" data-testid="seus-estudos">
      <div className="es-topo">
        <span className="es-icone" aria-hidden>
          <BookOpenText className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="es-titulo" className="es-titulo">Seus estudos</h2>
          <p className="es-sub">Continue de onde parou ou explore novos conteúdos.</p>
        </div>
        {pages > 1 && (
          <span className="es-setas">
            <button type="button" onClick={() => go(page - 1)} disabled={page === 0} aria-label="Estudos anteriores">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button type="button" onClick={() => go(page + 1)} disabled={page >= pages - 1} aria-label="Próximos estudos">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </span>
        )}
        <a href="#pastas" className="es-ver-todos">
          Ver todos <ArrowRight className="size-4" aria-hidden />
        </a>
      </div>

      {items.length === 0 ? (
        <div className="es-vazio">
          <p className="font-semibold text-white">Você ainda não tem estudos.</p>
          <p className="mt-1 text-[13px] text-white/65">Escolha uma aula pronta do catálogo para começar.</p>
          <Link href={`${base}/nova-trilha`} className="es-vazio-botao">
            <Plus className="size-4" aria-hidden /> Começar um estudo
          </Link>
        </div>
      ) : (
        <>
          <ul ref={track} className="es-trilho" aria-label="Seus estudos">
            {items.map((s, i) => {
              const p = pct(s.answered, s.totalQuestions);
              const href = s.inProgress && data.current ? `${base}/aula/${data.current.lessonId}` : `${base}/trilhas/${s.id}`;
              return (
                <li key={s.id} className="es-item">
                  <Link href={href} className="es-card" data-andamento={s.inProgress ? "1" : "0"} aria-label={`${s.title}${s.inProgress ? " — em andamento, continuar" : ""}`}>
                    <span className="es-card-arte" aria-hidden style={{ backgroundPosition: FRAMES[i % FRAMES.length] }} />
                    {s.inProgress && <span className="es-badge">Em andamento</span>}
                    <span className="es-card-icone">
                      <DisciplineIcon discipline={s.discipline} className="size-7" />
                    </span>
                    <span className="es-card-materia">{s.discipline ?? "Estudo"}</span>
                    <span className="es-card-titulo">{s.title}</span>
                    {s.inProgress && data.current && (
                      <span className="es-card-aula">
                        <Clock className="size-3.5 shrink-0" aria-hidden /> {data.current.lessonTitle} · {data.current.minutes} min
                      </span>
                    )}
                    <span className="es-card-base">
                      <Ring value={p} size={38} stroke={11} dark label={`${p}% das questões respondidas`} />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold text-white">
                          {s.answered}/{s.totalQuestions} questões
                        </span>
                        <span className="block text-[11px] text-white/60">{s.inProgress ? "agora" : timeAgo(s.lastStudiedAt)}</span>
                      </span>
                      <span className="es-card-seta">
                        <ArrowRight className="size-4" aria-hidden />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="es-pontos" role="tablist" aria-label="Páginas de estudos">
              {Array.from({ length: pages }, (_, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === page} aria-label={`Página ${i + 1} de ${pages}`} onClick={() => go(i)} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
