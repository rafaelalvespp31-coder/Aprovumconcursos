"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, Shuffle, Target, X } from "lucide-react";
import type { QuizTopicSummary } from "@/server/services/quiz";
import { TIPOS_PERGUNTA, type TipoPergunta } from "@/domain/quiz/tipos";

/**
 * "Trocar alvo": o aluno escolhe o que quer responder (frases da lei, verdadeiro ou falso, múltipla escolha ou tudo),
 * a matéria e o tema. Tocar num tema começa a rodada na hora, com o tipo marcado em cima.
 */
export function EscolherAlvo(props: Props) {
  // O conteúdo só existe com o painel aberto: cada abertura começa com o tipo e a matéria atuais.
  return props.open ? <Caixa {...props} /> : null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  topics: QuizTopicSummary[];
  mastered: Map<string, number>;
  currentId: string;
  tipo: TipoPergunta;
  ocupado: boolean;
  onEscolher: (topicId: string, tipo: TipoPergunta) => void;
}

function Caixa({
  onClose,
  topics,
  mastered,
  currentId,
  tipo,
  ocupado,
  onEscolher,
}: Props) {
  const [materia, setMateria] = useState(() => topics.find((t) => t.id === currentId)?.discipline ?? "Todas");
  const [tipoSel, setTipoSel] = useState<TipoPergunta>(tipo);
  const [busca, setBusca] = useState("");
  const [todos, setTodos] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    caixa.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const materias = useMemo(() => {
    const n = new Map<string, number>();
    for (const t of topics) n.set(t.discipline, (n.get(t.discipline) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [topics]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return topics
      .filter((t) => materia === "Todas" || t.discipline === materia)
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.discipline.toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { numeric: true }));
  }, [topics, materia, busca]);
  const visiveis = todos || busca ? lista : lista.slice(0, 40);

  // "Misturar a matéria": o tema da matéria com menos progresso (a rodada segue pelos outros quando ele esgota).
  const menosProgresso = useMemo(() => {
    const doGrupo = topics.filter((t) => materia === "Todas" || t.discipline === materia);
    return [...doGrupo].sort((a, b) => (mastered.get(a.id) ?? a.mastered) / Math.max(1, a.total) - (mastered.get(b.id) ?? b.mastered) / Math.max(1, b.total))[0];
  }, [topics, materia, mastered]);

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/75 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="escolher-alvo">
      <div
        ref={caixa}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Trocar alvo"
        className="flex max-h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[26px] border border-[#E10600]/50 bg-[#0B0B0C] text-white shadow-[0_24px_80px_rgba(225,6,0,0.3)] outline-none sm:rounded-[26px]"
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
          <p className="font-hud flex items-center gap-2 text-[14px] font-bold uppercase tracking-[0.16em]"><Target className="h-4 w-4 text-[#FF3B30]" aria-hidden /> Trocar alvo</p>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 ring-1 ring-white/20 hover:bg-white/10" aria-label="Fechar">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-4 pb-5 sm:px-5">
          <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">O que você quer responder</p>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de pergunta">
            {TIPOS_PERGUNTA.map((t) => {
              const on = tipoSel === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTipoSel(t.id)}
                  className={`min-h-[64px] rounded-[14px] px-3 py-2 text-left transition active:scale-[0.98] ${on ? "bg-gradient-to-br from-[#D90A00] to-[#7A0000] ring-1 ring-white/30" : "bg-[#141414] ring-1 ring-white/10 hover:ring-[#E10600]/60"}`}
                >
                  <span className="flex items-center gap-1.5 text-[13.5px] font-black">{on && <Check className="h-3.5 w-3.5" aria-hidden />}{t.rotulo}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-white/65">{t.dica}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">Matéria</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[["Todas", topics.length] as const, ...materias].map(([m, n]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMateria(m); setTodos(false); }}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold ${materia === m ? "bg-[#E10600] text-white" : "bg-[#141414] text-white/70 ring-1 ring-white/10"}`}
              >
                {m} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>

          <label className="relative mt-3 block">
            <span className="sr-only">Buscar tema</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar tema ou matéria"
              className="min-h-11 w-full rounded-[12px] bg-[#141414] pl-9 pr-3 text-[14px] text-white ring-1 ring-white/10 placeholder:text-white/40 focus:outline-none focus:ring-[#E10600]"
            />
          </label>

          <div className="mt-3 flex flex-col gap-2">
            {menosProgresso && !busca && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => onEscolher(menosProgresso.id, tipoSel)}
                className="flex min-h-14 items-center gap-3 rounded-[14px] bg-[#3A0808] px-3 py-2 text-left ring-1 ring-[#E10600]/40 hover:ring-[#E10600] disabled:opacity-60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#E10600]"><Shuffle className="h-4 w-4" aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-black">{materia === "Todas" ? "Misturar todas as matérias" : `Misturar ${materia}`}</span>
                  <span className="block text-[12px] text-white/65">Começa pelo tema com menos progresso e segue pelos outros</span>
                </span>
              </button>
            )}
            {visiveis.map((t) => {
              const m = mastered.get(t.id) ?? t.mastered;
              const done = m >= t.total;
              const atual = t.id === currentId;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={ocupado}
                  onClick={() => onEscolher(t.id, tipoSel)}
                  className={`flex min-h-14 items-center gap-3 rounded-[14px] px-3 py-2 text-left transition active:scale-[0.99] disabled:opacity-60 ${atual ? "bg-gradient-to-br from-[#D90A00] to-[#7A0000]" : "bg-[#141414] ring-1 ring-white/10 hover:ring-[#E10600]/60"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-black">{t.title}</span>
                    <span className="block truncate text-[12px] text-white/65">{t.discipline}</span>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-[#FF3B30]" style={{ width: `${Math.round((m / Math.max(1, t.total)) * 100)}%` }} /></span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${done ? "bg-[#22C55E] text-black" : "bg-black/35 text-white/90"}`}>
                    {done ? "Dominado" : atual ? "Jogando" : `${m}/${t.total}`}
                  </span>
                </button>
              );
            })}
            {!visiveis.length && <p className="py-6 text-center text-[13.5px] text-white/60">Nenhum tema encontrado.</p>}
            {!todos && !busca && lista.length > 40 && (
              <button type="button" onClick={() => setTodos(true)} className="min-h-11 rounded-[14px] bg-[#141414] px-4 text-[13px] font-bold text-white/80 ring-1 ring-white/10">
                Ver todos os {lista.length} temas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
