"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BarChart3, Check, X } from "lucide-react";
import { MIN_SAMPLE, pct, type QuestionStats } from "@/domain/notebooks/question-stats";

type Loaded = { ok: true; data: QuestionStats } | { ok: false; error: string };

/**
 * Estatísticas da questão, depois que o aluno respondeu: gráfico de acertos x erros e gráfico com a
 * quantidade de respostas em cada alternativa (todos os alunos). Só números agregados.
 */
export function QuestionStatsPanel({
  questionId,
  load,
  marcou,
  onClose,
}: {
  questionId: string;
  load: (questionId: string) => Promise<Loaded>;
  /** O que o aluno marcou (letra ou CERTO/ERRADO), para destacar a barra dele. */
  marcou: string | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const [state, setState] = useState<{ status: "carregando" } | { status: "erro"; msg: string } | { status: "ok"; data: QuestionStats }>({ status: "carregando" });
  const [tentativa, setTentativa] = useState(0);
  // `load` pode mudar de identidade a cada renderização do pai: lê sempre a mais recente sem refazer o pedido.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let vivo = true;
    loadRef.current(questionId)
      .then((r) => vivo && setState(r.ok ? { status: "ok", data: r.data } : { status: "erro", msg: r.error }))
      .catch(() => vivo && setState({ status: "erro", msg: "Não foi possível carregar as estatísticas. Tente de novo." }));
    return () => {
      vivo = false;
    };
  }, [questionId, tentativa]);

  return (
    <section className="qs" aria-labelledby={titleId} data-testid="estatisticas-questao">
      <header className="qs-topo">
        <span className="qs-ico" aria-hidden>
          <BarChart3 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="qs-titulo">
            Estatísticas da questão
          </h3>
          {state.status === "ok" && (
            <p className="qs-sub">
              {state.data.total} {state.data.total === 1 ? "resposta" : "respostas"} de {state.data.students} {state.data.students === 1 ? "aluno" : "alunos"}
            </p>
          )}
        </div>
        <button type="button" className="qs-fechar" onClick={onClose} aria-label="Fechar estatísticas">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      {state.status === "carregando" && (
        <div className="qs-corpo" role="status" aria-label="Carregando estatísticas">
          <span className="qz-esq-linha qs-esq-donut" />
          <span className="qs-esq-col">
            <span className="qz-esq-linha" />
            <span className="qz-esq-linha" />
            <span className="qz-esq-linha qz-esq-curta" />
          </span>
        </div>
      )}

      {state.status === "erro" && (
        <p className="qs-erro" role="alert">
          {state.msg}{" "}
          <button type="button" className="qs-link" onClick={() => { setState({ status: "carregando" }); setTentativa((n) => n + 1); }}>
            Tentar de novo
          </button>
        </p>
      )}

      {state.status === "ok" && <Graficos data={state.data} marcou={marcou} />}
    </section>
  );
}

function Graficos({ data, marcou }: { data: QuestionStats; marcou: string | null }) {
  const pctCertas = pct(data.correct, data.total);
  const pctErradas = data.total > 0 ? 100 - pctCertas : 0;
  const maior = Math.max(1, ...data.options.map((o) => o.count));
  const pouca = data.total < MIN_SAMPLE;
  return (
    <div className="qs-corpo">
      {/* Gráfico 1: acertos x erros */}
      <figure className="qs-fig">
        <figcaption className="qs-leg-titulo">Acertos e erros</figcaption>
        <div className="qs-donut-wrap">
          <Donut certas={data.correct} erradas={data.wrong} pctCertas={pctCertas} />
          <ul className="qs-legenda">
            <li>
              <span className="qs-dot qs-dot-ok" aria-hidden />
              <span className="qs-leg-nome">Acertos</span>
              <strong className="qs-num">{data.correct}</strong>
              <span className="qs-pc">{data.total ? `${pctCertas}%` : "—"}</span>
            </li>
            <li>
              <span className="qs-dot qs-dot-erro" aria-hidden />
              <span className="qs-leg-nome">Erros</span>
              <strong className="qs-num">{data.wrong}</strong>
              <span className="qs-pc">{data.total ? `${pctErradas}%` : "—"}</span>
            </li>
          </ul>
        </div>
        {data.mine.attempts > 0 && (
          <p className="qs-meu">
            Você: <strong>{data.mine.correct}</strong> {data.mine.correct === 1 ? "acerto" : "acertos"} em <strong>{data.mine.attempts}</strong> {data.mine.attempts === 1 ? "tentativa" : "tentativas"} nesta questão
          </p>
        )}
      </figure>

      {/* Gráfico 2: respostas por alternativa */}
      <figure className="qs-fig">
        <figcaption className="qs-leg-titulo">Respostas por alternativa</figcaption>
        <ul className="qs-barras" aria-label="Quantidade de respostas em cada alternativa">
          {data.options.map((o) => {
            const mine = marcou === o.label;
            return (
              <li key={o.label} className={`qs-barra-linha ${o.isCorrect ? "qs-certa" : ""} ${mine ? "qs-minha" : ""}`}>
                <span className="qs-rotulo" title={o.label}>{o.label.length > 2 ? o.label[0] + o.label.slice(1).toLowerCase() : o.label}</span>
                <span className="qs-trilha" aria-hidden>
                  <span className="qs-preenche" style={{ width: `${data.total ? Math.max(o.count ? 3 : 0, (o.count / maior) * 100) : 0}%` }} />
                </span>
                <span className="qs-valor">
                  <strong>{o.count}</strong>
                  <span className="qs-pc">{data.total ? `${pct(o.count, data.total)}%` : "—"}</span>
                </span>
                <span className="qs-selos">
                  {o.isCorrect && (
                    <span className="qs-selo qs-selo-ok">
                      <Check className="h-3 w-3" aria-hidden /> Gabarito
                    </span>
                  )}
                  {mine && <span className="qs-selo qs-selo-eu">Você</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </figure>

      {pouca && (
        <p className="qs-aviso">
          Poucas respostas até agora ({data.total}). Os percentuais ficam mais confiáveis com mais alunos.
        </p>
      )}
    </div>
  );
}

/** Rosca em SVG: o arco verde é a fatia de acertos. Sem respostas, anel cinza. */
function Donut({ certas, erradas, pctCertas }: { certas: number; erradas: number; pctCertas: number }) {
  const total = certas + erradas;
  const r = 42;
  const c = 2 * Math.PI * r;
  const arcoCertas = total ? (certas / total) * c : 0;
  return (
    <svg viewBox="0 0 100 100" className="qs-donut" role="img" aria-label={total ? `${pctCertas}% de acertos: ${certas} acertos e ${erradas} erros` : "Ainda sem respostas"}>
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="14" className="qs-anel-erro" />
      {total > 0 && (
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="14"
          strokeLinecap="butt"
          className="qs-anel-ok"
          strokeDasharray={`${arcoCertas} ${c - arcoCertas}`}
          transform="rotate(-90 50 50)"
        />
      )}
      <text x="50" y="49" textAnchor="middle" className="qs-donut-num">{total ? `${pctCertas}%` : "—"}</text>
      <text x="50" y="63" textAnchor="middle" className="qs-donut-rot">acertos</text>
    </svg>
  );
}
