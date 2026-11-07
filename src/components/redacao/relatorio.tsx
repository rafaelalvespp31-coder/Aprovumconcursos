"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PenLine, MessageCircle, Dumbbell, RotateCcw } from "lucide-react";
import type { ComparisonView, EvaluationView, ErroView, SubmissionView } from "@/server/services/redacao";
import type { Analise, Diagnostico } from "@/domain/redacao/schemas";
import { categoriaLabel, tipoLabel } from "@/domain/redacao/rubricas";
import { compararAction, reescreverAction } from "@/app/(app)/redacao/actions";
import { Aviso, Lista, MODALIDADE_LABEL, Secao, dataBR } from "./ui";

const COR: Record<string, string> = {
  erro_objetivo: "bg-[#E50914]/15 decoration-[#E50914] underline decoration-wavy decoration-1 underline-offset-2",
  problema_construcao: "bg-[#F59E0B]/20 decoration-[#D97706] underline decoration-2 underline-offset-2",
  fragilidade_argumentativa: "bg-[#7C3AED]/15 decoration-[#7C3AED] underline decoration-double decoration-1 underline-offset-2",
  oportunidade: "bg-[#2563EB]/12 decoration-[#2563EB] underline decoration-dashed decoration-1 underline-offset-2",
  estilistica: "decoration-[#8A8C93] underline decoration-dotted decoration-1 underline-offset-2",
};
const PRIORIDADE = ["erro_objetivo", "problema_construcao", "fragilidade_argumentativa", "oportunidade", "estilistica"];
const GRAVIDADE: Record<string, string> = { leve: "Leve", moderada: "Moderada", grave: "Grave" };

function Marcado({ texto, erros, selecionado, onSelect }: { texto: string; erros: ErroView[]; selecionado: string | null; onSelect: (id: string) => void }) {
  const segs = useMemo(() => {
    const pts = new Set<number>([0, texto.length]);
    for (const e of erros) {
      pts.add(Math.min(e.start, texto.length));
      pts.add(Math.min(e.end, texto.length));
    }
    const ord = [...pts].sort((a, b) => a - b);
    return ord.slice(0, -1).map((a, i) => {
      const b = ord[i + 1]!;
      const cobre = erros.filter((e) => e.start <= a && e.end >= b).sort((x, y) => PRIORIDADE.indexOf(x.kind) - PRIORIDADE.indexOf(y.kind));
      return { a, b, cobre };
    });
  }, [texto, erros]);
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-[1.9] text-[#08090B] [overflow-wrap:anywhere]" data-testid="redacao-texto-marcado">
      {segs.map((s) => {
        const t = texto.slice(s.a, s.b);
        const e = s.cobre[0];
        if (!e) return <span key={s.a}>{t}</span>;
        const on = s.cobre.some((x) => x.id === selecionado);
        return (
          <button key={s.a} type="button" onClick={() => onSelect(e.id)} className={`inline cursor-pointer rounded-[3px] px-[1px] text-left font-[inherit] ${COR[e.kind] ?? ""} ${on ? "outline outline-2 outline-[#08090B]" : ""}`} aria-label={`${tipoLabel(e.kind)}, ${categoriaLabel(e.category)}: ${e.issue}`} data-testid="redacao-marca">
            {t}
          </button>
        );
      })}
    </p>
  );
}

export function Relatorio({ sub, ev, cmp }: { sub: SubmissionView; ev: EvaluationView; cmp: ComparisonView | null }) {
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [pend, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const analise = ev.analysis as Analise | null;
  const diag = ev.diagnostic as Diagnostico | null;
  const erroSel = ev.errors.find((e) => e.id === sel) ?? null;
  const pct = ev.score !== null && ev.max ? Math.round((ev.score / ev.max) * 100) : 0;
  const porCat = useMemo(() => {
    const m = new Map<string, ErroView[]>();
    for (const e of ev.errors) m.set(e.category, [...(m.get(e.category) ?? []), e]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [ev.errors]);
  const lista = ev.errors.filter((e) => filtro === "todos" || e.kind === filtro);
  const linguisticos = ev.errors.filter((e) => ["ortografia", "gramatica", "pontuacao", "concordancia", "regencia", "vocabulario"].includes(e.category));

  const escolher = (id: string) => {
    setSel(id);
    setTimeout(() => painelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 30);
  };
  const reescrever = () =>
    start(async () => {
      const r = await reescreverAction(sub.id).catch(() => null);
      if (!r || !r.ok) return setErro(r && !r.ok ? r.error : "Não foi possível criar a nova versão.");
      router.push(`/redacao/escrever?id=${r.id}`);
    });
  const explicar = () =>
    start(async () => {
      const r = await compararAction(sub.id).catch(() => null);
      if (!r || !r.ok) return setErro(r && !r.ok ? r.error : "Não foi possível gerar a explicação.");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4" data-testid="redacao-relatorio">
      {/* A. Resultado geral */}
      <section className="pc overflow-hidden p-0" data-testid="redacao-resultado">
        <div className="flex flex-wrap items-center gap-5 bg-[#08090B] p-5 text-white">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/60">Nota obtida</p>
            <p className="text-[44px] font-black leading-none tracking-[-0.03em]" data-testid="redacao-nota">
              {ev.score}<span className="text-[20px] font-bold text-white/60"> / {ev.max}</span>
            </p>
          </div>
          <div className="min-w-[160px] flex-1">
            <p className="text-[13px] font-semibold">{pct}% de aproveitamento · <span className="text-[#FF6B73]">{ev.classification}</span></p>
            <span className="pc-barra pc-barra-escura mt-2" role="img" aria-label={`${pct}% de aproveitamento`}><span style={{ width: `${pct}%` }} /></span>
            <p className="mt-2 text-[12px] text-white/70">{MODALIDADE_LABEL[ev.modality] ?? ev.modality} · {dataBR(ev.createdAt)}{sub.board ? ` · ${sub.board}` : ""}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <p className="text-[12.5px] text-[#64666D]">
            <b className="text-[#3A3C42]">{sub.title || sub.themeTitle || "Redação"}</b> · {sub.wordCount} palavras · rubrica <code>{ev.rubricKey}</code> v{ev.rubricVersion}{ev.model ? ` · modelo ${ev.model}` : ""}
          </p>
          {ev.estimated && <Aviso tom="alerta">Avaliação pedagógica <b>estimada</b>: esta metodologia pode não reproduzir a correção oficial da banca. Para uma correção alinhada ao edital, cole os critérios oficiais ao escrever.</Aviso>}
          {ev.rubricKey === "enem" && <Aviso>Nota pedagógica automatizada pelas 5 competências do ENEM. Não é a nota oficial do INEP e não tem precisão de 100%: use como guia de estudo.</Aviso>}
          {ev.zeroReason && <Aviso tom="erro">Situação de nota zero: {ev.zeroReason}</Aviso>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={reescrever} disabled={pend} className="pc-botao" data-testid="redacao-reescrever"><RotateCcw className="h-4 w-4" aria-hidden /> Reescrever redação</button>
            <Link href={`/redacao/exercicios?avaliacao=${ev.id}`} className="mentor-sec inline-flex items-center gap-1.5"><Dumbbell className="h-4 w-4" aria-hidden /> Exercícios</Link>
            <Link href={`/redacao/professor?avaliacao=${ev.id}`} className="mentor-sec inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" aria-hidden /> Falar com o professor</Link>
          </div>
          {erro && <Aviso tom="erro">{erro}</Aviso>}
        </div>
      </section>

      {/* Comparação de versões */}
      {cmp && (
        <Secao titulo="Comparação com a versão anterior" id="comparacao">
          <div className="grid gap-3 sm:grid-cols-3" data-testid="redacao-comparacao">
            <div className="rounded-[12px] border border-[#E6E7EB] p-3"><p className="text-[11px] font-bold uppercase text-[#64666D]">Primeira</p><p className="text-[22px] font-extrabold">{cmp.antes}</p></div>
            <div className="rounded-[12px] border border-[#E6E7EB] p-3"><p className="text-[11px] font-bold uppercase text-[#64666D]">Esta versão</p><p className="text-[22px] font-extrabold">{cmp.depois}</p></div>
            <div className="rounded-[12px] border border-[#E6E7EB] p-3"><p className="text-[11px] font-bold uppercase text-[#64666D]">Evolução</p><p className={`text-[22px] font-extrabold ${cmp.delta === null ? "" : cmp.delta >= 0 ? "text-[#047857]" : "text-[#B91C1C]"}`}>{cmp.delta === null ? "—" : `${cmp.delta > 0 ? "+" : ""}${cmp.delta}`}</p></div>
          </div>
          {!cmp.mesmaEscala && <p className="mt-2 text-[12.5px] text-[#64666D]">As versões usaram escalas de nota diferentes; a diferença não é calculada.</p>}
          <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-3">
            <p><b className="text-[#047857]">{cmp.corrigidos}</b> erro(s) corrigido(s)</p>
            <p><b className="text-[#B45309]">{cmp.permaneceram}</b> permaneceram</p>
            <p><b className="text-[#B91C1C]">{cmp.novos}</b> novo(s)</p>
          </div>
          <ul className="mt-3 flex flex-col gap-1 text-[13px]">
            {cmp.competencias.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-3 border-b border-[#ECEDF0] py-1 last:border-0"><span className="min-w-0">{c.label}</span><span className="shrink-0 font-bold">{c.antes} → {c.depois} <span className={c.delta >= 0 ? "text-[#047857]" : "text-[#B91C1C]"}>({c.delta > 0 ? "+" : ""}{c.delta})</span></span></li>
            ))}
          </ul>
          {cmp.narrativa ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-[14px] leading-relaxed text-[#2B2D33]">{cmp.narrativa.resumo}</p>
              {cmp.narrativa.melhorou.length > 0 && <div><p className="text-[12px] font-bold uppercase text-[#047857]">Melhorou</p><Lista itens={cmp.narrativa.melhorou} /></div>}
              {cmp.narrativa.continuaIgual.length > 0 && <div><p className="text-[12px] font-bold uppercase text-[#B45309]">Ainda precisa de trabalho</p><Lista itens={cmp.narrativa.continuaIgual} /></div>}
              {cmp.narrativa.piorou.length > 0 && <div><p className="text-[12px] font-bold uppercase text-[#B91C1C]">Piorou</p><Lista itens={cmp.narrativa.piorou} /></div>}
              {cmp.narrativa.proximosPassos.length > 0 && <div><p className="text-[12px] font-bold uppercase text-[#08090B]">Próximos passos</p><Lista itens={cmp.narrativa.proximosPassos} /></div>}
            </div>
          ) : (
            <button type="button" onClick={explicar} disabled={pend} className="mentor-sec mt-3">{pend ? "Gerando…" : "Pedir ao professor a explicação do que mudou"}</button>
          )}
        </Secao>
      )}

      {/* B. Avaliação por competência */}
      <Secao titulo="Avaliação por competência">
        <ul className="flex flex-col gap-3" data-testid="redacao-competencias">
          {ev.competencies.map((c) => {
            const p = c.max ? Math.round((c.score / c.max) * 100) : 0;
            return (
              <li key={c.key}>
                <div className="flex items-baseline justify-between gap-3"><p className="text-[13.5px] font-bold text-[#08090B]">{c.label}</p><p className="shrink-0 text-[14px] font-extrabold">{c.score}<span className="text-[#8A8C93]"> / {c.max}</span></p></div>
                <span className="pc-barra mt-1" role="img" aria-label={`${p}%`}><span style={{ width: `${p}%` }} /></span>
                <p className="mt-1.5 text-[13px] leading-snug text-[#3A3C42]">{c.justification}</p>
              </li>
            );
          })}
        </ul>
        {ev.notes.length > 0 && (
          <details className="mt-3 rounded-[10px] border border-[#E6E7EB] p-2.5">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-[#3A3C42]">Ajustes de consistência aplicados à nota ({ev.notes.length})</summary>
            <div className="mt-2"><Lista itens={ev.notes} /></div>
          </details>
        )}
      </Secao>

      {/* Correção linha por linha */}
      <Secao titulo="Correção no seu texto" id="correcao" aside={<span className="text-[12px] text-[#64666D]">{ev.errors.length} marcação(ões)</span>}>
        <div className="mb-3 flex flex-wrap gap-2 text-[11.5px]" aria-label="Legenda">
          {["erro_objetivo", "problema_construcao", "fragilidade_argumentativa", "oportunidade", "estilistica"].map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className={`inline-block h-3 w-5 rounded-[3px] ${COR[k]}`} />{tipoLabel(k)}</span>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-[12px] border border-[#E6E7EB] bg-white p-4">
            <Marcado texto={sub.body} erros={ev.errors} selecionado={sel} onSelect={escolher} />
            <p className="mt-3 text-[11.5px] text-[#8A8C93]">Seu texto original não é alterado. Toque em um trecho marcado para ver a explicação.</p>
          </div>
          <div ref={painelRef} className="min-w-0 self-start rounded-[12px] border border-[#E6E7EB] bg-[#FAFAFB] p-4 lg:sticky lg:top-4" data-testid="redacao-painel-erro">
            {erroSel ? (
              <div className="flex flex-col gap-2 text-[13.5px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#E50914]">{tipoLabel(erroSel.kind)} · {categoriaLabel(erroSel.category)} · {GRAVIDADE[erroSel.severity]}</p>
                <p className="rounded-[8px] bg-white px-2.5 py-1.5 font-semibold [overflow-wrap:anywhere]">“{erroSel.excerpt}”</p>
                <p className="font-bold text-[#08090B]">{erroSel.issue}</p>
                <p className="leading-snug text-[#2B2D33]">{erroSel.explanation}</p>
                {erroSel.rule && <p><b>Regra:</b> {erroSel.rule}</p>}
                {erroSel.suggestion && <p><b>Sugestão:</b> {erroSel.suggestion}</p>}
                {erroSel.example && <p className="text-[#3A3C42]"><b>Outro exemplo:</b> {erroSel.example}</p>}
                {erroSel.paragraph && <p className="text-[12px] text-[#64666D]">Parágrafo {erroSel.paragraph}</p>}
              </div>
            ) : (
              <p className="text-[13px] text-[#64666D]">{ev.errors.length ? "Selecione um trecho marcado no texto para ler a explicação, a regra e a sugestão de correção." : "Nenhuma marcação relevante neste texto."}</p>
            )}
          </div>
        </div>
      </Secao>

      {/* C. Erros encontrados */}
      <Secao titulo="Erros e apontamentos">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[{ id: "todos", label: `Todos (${ev.errors.length})` }, ...["erro_objetivo", "problema_construcao", "fragilidade_argumentativa", "oportunidade", "estilistica"].map((k) => ({ id: k, label: `${tipoLabel(k)} (${ev.errors.filter((e) => e.kind === k).length})` }))].map((f) => (
            <button key={f.id} type="button" onClick={() => setFiltro(f.id)} aria-pressed={filtro === f.id} className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${filtro === f.id ? "border-[#08090B] bg-[#08090B] text-white" : "border-[#E6E7EB] bg-white text-[#3A3C42]"}`}>{f.label}</button>
          ))}
        </div>
        {lista.length === 0 ? <p className="text-[13px] text-[#64666D]">Nada a mostrar neste filtro.</p> : (
          <ul className="flex flex-col divide-y divide-[#ECEDF0]">
            {lista.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => { escolher(e.id); document.getElementById("correcao")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="flex w-full flex-col gap-0.5 py-2 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#E50914]">{categoriaLabel(e.category)} · {tipoLabel(e.kind)} · {GRAVIDADE[e.severity]}{e.paragraph ? ` · parágrafo ${e.paragraph}` : ""}</span>
                  <span className="text-[13.5px] font-semibold text-[#08090B] [overflow-wrap:anywhere]">“{e.excerpt}”</span>
                  <span className="text-[13px] text-[#3A3C42]">{e.issue}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {porCat.length > 0 && <p className="mt-3 text-[12.5px] text-[#64666D]">Por categoria: {porCat.map(([c, l]) => `${categoriaLabel(c)} (${l.length})`).join(" · ")}</p>}
      </Secao>

      {analise && (
        <>
          <Secao titulo="Análise estrutural">
            <div className="grid gap-3 sm:grid-cols-3">
              {([["Introdução", analise.estrutura.introducao], ["Desenvolvimento", analise.estrutura.desenvolvimento], ["Conclusão", analise.estrutura.conclusao]] as const).map(([n, x]) => (
                <div key={n} className="rounded-[12px] border border-[#E6E7EB] p-3"><p className="text-[12px] font-bold uppercase text-[#E50914]">{n} · {x.nivel}</p><p className="mt-1 text-[13px] leading-snug text-[#2B2D33]">{x.avaliacao}</p></div>
              ))}
            </div>
            <p className="mt-3 text-[13px]"><b>Tese:</b> {analise.estrutura.tese.presente ? "presente" : "ausente ou pouco clara"}. {analise.estrutura.tese.observacao}</p>
            <p className="mt-1 text-[13px]"><b>Tema:</b> {analise.tema.compreensao} <span className="text-[#64666D]">(aderência: {analise.tema.aderencia}; tipo textual: {analise.tema.tipoTextual})</span></p>
            <p className="mt-1 text-[13px]"><b>Coesão e coerência ({analise.coesaoCoerencia.nivel}):</b> {analise.coesaoCoerencia.avaliacao}</p>
          </Secao>
          <Secao titulo="Análise argumentativa">
            <p className="text-[13.5px] leading-snug"><b>({analise.argumentacao.nivel})</b> {analise.argumentacao.avaliacao}</p>
            <p className="mt-2 text-[13px]"><b>Repertório:</b> {analise.argumentacao.repertorio.presente ? "presente" : "ausente"}. {analise.argumentacao.repertorio.avaliacao}</p>
            {analise.argumentacao.argumentosSuperficiais.length > 0 && (
              <div className="mt-2"><p className="text-[12px] font-bold uppercase text-[#7C3AED]">Argumentos superficiais</p><Lista itens={analise.argumentacao.argumentosSuperficiais.map((a) => `“${a.trecho}” — ${a.motivo}`)} /></div>
            )}
            {analise.argumentacao.contradicoes.length > 0 && <div className="mt-2"><p className="text-[12px] font-bold uppercase text-[#B91C1C]">Contradições</p><Lista itens={analise.argumentacao.contradicoes} /></div>}
            {analise.propostaIntervencao.exigida && <p className="mt-2 text-[13px]"><b>Proposta de intervenção:</b> {analise.propostaIntervencao.observacao}</p>}
          </Secao>
        </>
      )}
      <Secao titulo="Análise linguística">
        {linguisticos.length === 0 ? <p className="text-[13px] text-[#64666D]">Nenhum problema de norma culta relevante foi apontado.</p> : (
          <>
            <p className="mb-2 text-[13px] text-[#3A3C42]">{linguisticos.length} ocorrência(s): {porCat.filter(([c]) => linguisticos.some((l) => l.category === c)).map(([c, l]) => `${categoriaLabel(c)} ${l.filter((x) => linguisticos.includes(x)).length}`).join(" · ")}.</p>
            <ul className="flex flex-col gap-1 text-[13px]">
              {linguisticos.slice(0, 8).map((e) => <li key={e.id} className="[overflow-wrap:anywhere]"><button type="button" className="text-left" onClick={() => { escolher(e.id); document.getElementById("correcao")?.scrollIntoView({ behavior: "smooth" }); }}><b>“{e.excerpt}”</b> → {e.suggestion ?? e.issue}</button></li>)}
            </ul>
          </>
        )}
      </Secao>

      {diag ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Secao titulo="Pontos positivos"><Lista itens={diag.pontosPositivos} vazio="Nenhum ponto positivo destacado." /></Secao>
            <Secao titulo="Pontos negativos"><Lista itens={diag.pontosNegativos} vazio="Nenhum ponto negativo relevante." /></Secao>
            <Secao titulo="Oportunidades de melhoria"><Lista itens={diag.oportunidades} vazio="Sem oportunidades adicionais." /></Secao>
          </div>

          <section className="pc border-2 border-[#08090B] p-4 sm:p-5" id="diagnostico" data-testid="redacao-diagnostico">
            <h2 className="text-[17px] font-black tracking-[-0.01em] text-[#08090B]">DIAGNÓSTICO FINAL</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[#2B2D33]">{diag.resumo}</p>
            {diag.semProblemasRelevantes && <div className="mt-2"><Aviso>O professor não encontrou problemas relevantes nesta redação.</Aviso></div>}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div><h3 className="mb-1 text-[13px] font-extrabold">1. O que você fez bem</h3><Lista itens={diag.fezBem} vazio="—" /></div>
              <div><h3 className="mb-1 text-[13px] font-extrabold">2. O que você fez mal</h3><Lista itens={diag.fezMal} vazio="—" /></div>
              <div><h3 className="mb-1 text-[13px] font-extrabold">3. O que precisa melhorar</h3><Lista itens={diag.precisaMelhorar} vazio="—" /></div>
              <div><h3 className="mb-1 text-[13px] font-extrabold">4. Parágrafos a melhorar</h3><Lista itens={diag.paragrafosMelhorar.map((p) => `Parágrafo ${p.paragrafo}: ${p.motivo}`)} vazio="Nenhum parágrafo específico." /></div>
              <div><h3 className="mb-1 text-[13px] font-extrabold">5. Frases para reformular</h3><Lista itens={diag.frasesReformular.map((f) => `“${f.trecho}” — ${f.motivo} Sugestão: ${f.sugestao}`)} vazio="Nenhuma frase pede reformulação." /></div>
              <div><h3 className="mb-1 text-[13px] font-extrabold">6. Argumentos superficiais</h3><Lista itens={diag.argumentosSuperficiais.map((a) => `“${a.trecho}” — ${a.motivo} Como aprofundar: ${a.comoAprofundar}`)} vazio="Nenhum argumento superficial apontado." /></div>
              <div><h3 className="mb-1 text-[13px] font-extrabold">7. Erros que se repetem</h3><Lista itens={diag.errosRecorrentes.map((e) => `${categoriaLabel(e.categoria)}: ${e.descricao}`)} vazio="Sem erros recorrentes." /></div>
              <div><h3 className="mb-1 text-[13px] font-extrabold">8. Conteúdo de português para estudar</h3><Lista itens={diag.conteudoEstudar} vazio="—" /></div>
              <div><h3 className="mb-1 text-[13px] font-extrabold">9. Como melhorar a próxima redação</h3><Lista itens={diag.proximaRedacao} vazio="—" /></div>
              <div><h3 className="mb-1 text-[13px] font-extrabold">10. Prioridade de evolução</h3><p className="text-[13.5px]">{diag.prioridade}</p></div>
            </div>
          </section>

          <Secao titulo="Onde você precisa melhorar" id="onde-melhorar">
            {diag.ondeMelhorar.length === 0 ? <p className="text-[13px] text-[#64666D]">Nenhuma deficiência relevante para detalhar.</p> : (
              <ul className="flex flex-col gap-3" data-testid="redacao-onde-melhorar">
                {diag.ondeMelhorar.map((o, i) => (
                  <li key={i} className="rounded-[12px] border border-[#E6E7EB] p-3 text-[13.5px]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#E50914]">{o.localizacao}</p>
                    <p className="mt-1 font-bold text-[#08090B]">{o.problema}</p>
                    <p className="mt-1"><b>Motivo:</b> {o.motivo}</p>
                    <p className="mt-1"><b>Explicação técnica:</b> {o.explicacaoTecnica}</p>
                    <p className="mt-1"><b>Sugestão:</b> {o.sugestao}</p>
                    <p className="mt-1 text-[#3A3C42]"><b>Exemplo de como desenvolver melhor:</b> {o.exemplo}</p>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
          <Secao titulo="O que você não precisa mudar">
            {diag.naoMudar.length === 0 ? <p className="text-[13px] text-[#64666D]">Nenhum trecho específico foi destacado como adequado.</p> : <Lista itens={diag.naoMudar.map((n) => `“${n.trecho}” — ${n.motivo}`)} />}
          </Secao>
          <Secao titulo="Plano de evolução personalizado" id="plano">
            <ol className="flex flex-col gap-2" data-testid="redacao-plano">
              {[...diag.plano].sort((a, b) => a.prioridade - b.prioridade).map((p, i) => (
                <li key={i} className="flex gap-3 rounded-[12px] border border-[#E6E7EB] p-3">
                  <span className="pc-ico shrink-0 text-[12px] font-black" aria-hidden>{p.prioridade}</span>
                  <span className="min-w-0 text-[13.5px]"><b className="block text-[#08090B]">{p.acao}</b><span className="text-[#3A3C42]">{p.porque}</span></span>
                </li>
              ))}
            </ol>
            <div className="mt-3"><button type="button" onClick={reescrever} disabled={pend} className="pc-botao"><PenLine className="h-4 w-4" aria-hidden /> Reescrever aplicando o plano</button></div>
          </Secao>
        </>
      ) : null}
    </div>
  );
}
