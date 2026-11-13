"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Briefcase, CalendarClock, CalendarDays, Info, Landmark, Zap } from "lucide-react";
import type { PreparationTree } from "@/server/services/edital-view";
import { DeletePrep } from "./delete-prep";
import { orgImageFor } from "@/domain/edital/org-images";
import { orgInitials } from "./org-emblem";
import "./card-edital.css";

/** Divide o nome do órgão em "linha de apoio" + "destaque" (ex.: "Prefeitura Municipal de" + "Paulínia"). */
export function splitName(name: string): { apoio: string; destaque: string } {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length <= 1) return { apoio: "", destaque: w[0] ?? "" };
  const prep = new Set(["de", "da", "do", "das", "dos"]);
  for (let i = w.length - 2; i >= 0; i--) {
    if (prep.has(w[i]!.toLowerCase()) && w.length - i - 1 <= 3) return { apoio: w.slice(0, i + 1).join(" "), destaque: w.slice(i + 1).join(" ") };
  }
  return { apoio: w.slice(0, -1).join(" "), destaque: w[w.length - 1]! };
}

const RAIO = 92;
const CIRC = 2 * Math.PI * RAIO;

type Props = {
  tree: PreparationTree;
  save: (f: FormData) => Promise<void>;
  start: (s: { error?: string }) => Promise<{ error?: string }>;
  editing?: boolean;
};

/** Card principal do edital (clone fiel da referência), com os dados reais do concurso. */
export function CardEdital({ tree, save, start, editing = false }: Props) {
  const { prep, totals } = tree;
  const [startState, startAction, starting] = useActionState(start, {});
  const [edit, setEdit] = useState(editing);
  const started = !!(prep.stats as { studyFolderId?: string }).studyFolderId;
  const base = `/meu-concurso/${prep.id}`;
  const created = new Date(prep.createdAt).toLocaleDateString("pt-BR");
  const org = orgImageFor(prep.contestName, prep.roleName, prep.title);
  const nomeOrgao = org?.nome ?? prep.title;
  const { apoio, destaque } = splitName(nomeOrgao);
  const sigla = orgInitials(prep.contestName ?? prep.title);
  const pct = Math.max(0, Math.min(100, totals.pct));
  const semAulas = totals.lessonsAvailable === 0;
  const linhas: [string, string] = starting ? ["MONTANDO SEUS", "ESTUDOS…"] : started ? ["ABRIR MEUS ESTUDOS", "DESTE CONCURSO"] : ["COMEÇAR", "ESTUDO"];
  const [l2a, l2b] = starting ? ["", "ESTUDOS…"] : started ? ["DESTE ", "CONCURSO"] : ["", "ESTUDO"];

  return (
    <div className="vc-wrap" data-testid="card-edital">
      <article className="vc" aria-label={`Edital ${nomeOrgao}`} data-capa={org ? 1 : undefined} style={org ? { ["--capa" as string]: `url(${org.capa})`, ["--arte" as string]: `url(${org.card})` } : undefined}>
        <div className="vc-frame" aria-hidden />
        <div className="vc-glow" aria-hidden />
        <span className="vc-sr">Concurso público</span>

        {/* Identificação */}
        <header className="vc-id">
          <span className="vc-brasao" style={{ backgroundImage: "url(/card-edital/brasao.webp)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- brasão do próprio edital (data URL) */}
            {prep.orgLogo ? <img src={prep.orgLogo} alt={`Símbolo de ${prep.contestName ?? prep.title}`} /> : <b aria-hidden style={{ ["--n" as string]: sigla.length }}>{sigla}</b>}
          </span>
          <div className="vc-nome" style={{ ["--a" as string]: Math.max(apoio.length, 1), ["--b" as string]: Math.max(destaque.length, 1) }}>
            {apoio && <p className="vc-apoio">{apoio}</p>}
            <h1 className="vc-destaque">{destaque}</h1>
            <p className="vc-tag" aria-hidden>CONQUISTE SUA VAGA!</p>
          </div>
        </header>

        {/* Imagem institucional (só com asset real); sem ela, fundo tático coerente */}
        <div className="vc-inst" aria-hidden data-logo={prep.orgLogo ? 1 : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element -- brasão do próprio edital */}
          {prep.orgLogo ? <img src={prep.orgLogo} alt="" /> : <span>{sigla}</span>}
        </div>

        {/* Informações */}
        <dl className="vc-info">
          <div><Briefcase aria-hidden /><dt>Cargo</dt><dd data-vazio={prep.roleName ? undefined : 1}>{prep.roleName ?? "Não informado"}</dd></div>
          <div><Landmark aria-hidden /><dt>Banca</dt><dd data-vazio={prep.board ? undefined : 1}>{prep.board ?? "Não informada"}</dd></div>
          <div><CalendarDays aria-hidden /><dt>Ano</dt><dd data-vazio={prep.year ? undefined : 1}>{prep.year ?? "Não informado"}</dd></div>
          <div className="vc-criada"><CalendarClock aria-hidden /><dt>Criada em</dt><dd>{created}</dd></div>
        </dl>

        <div className="vc-foco" style={{ backgroundImage: "url(/card-edital/foco.webp)" }} role="img" aria-label="Foco, estratégia, aprovação" />

        {/* Chamada principal */}
        <form action={startAction} className="vc-form">
          <button type="submit" className="vc-cta" style={{ backgroundImage: "url(/card-edital/botao.webp)" }} disabled={starting || semAulas} data-testid="comecar-estudo" aria-label={linhas.join(" ")}>
            <span className="vc-cta-txt" aria-hidden>
              <span>{linhas[0]}</span>
              <span>{l2a}<em>{l2b}</em>{!l2b && linhas[1]}</span>
            </span>
          </button>
          <p className="vc-expl">
            {semAulas
              ? "Ainda não há aulas no catálogo para este edital."
              : started
                ? <>Suas aulas deste edital estão numa pasta em <b>Meus estudos</b>, separadas por matéria.</>
                : <>Reúne as {totals.lessonsAvailable} aulas deste edital numa pasta em <b>Meus estudos</b>, separadas por matéria.</>}
          </p>
          {startState.error && <p role="alert" className="vc-erro">{startState.error}</p>}
        </form>

        {/* Painéis */}
        <section className="vc-prog" style={{ backgroundImage: "url(/card-edital/painel1.webp)" }} aria-label="Seu progresso geral">
          <span className="vc-anel" role="img" aria-label={`${pct}% concluído`}>
            <svg viewBox="0 0 208 208" aria-hidden>
              <defs>
                <linearGradient id={`vcg-${prep.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5a64" /><stop offset=".55" stopColor="#e50920" /><stop offset="1" stopColor="#7a0210" /></linearGradient>
              </defs>
              <circle cx="104" cy="104" r="102" className="vc-a0" />
              <circle cx="104" cy="104" r={RAIO} className="vc-a1" />
              {pct > 0 && <circle cx="104" cy="104" r={RAIO} className="vc-a2" stroke={`url(#vcg-${prep.id})`} pathLength={CIRC} strokeDasharray={CIRC} transform="rotate(-90 104 104)" style={{ ["--o" as string]: CIRC * (1 - pct / 100), ["--c" as string]: CIRC }} />}
              <circle cx="104" cy="104" r="76" className="vc-a3" />
            </svg>
            <span className="vc-anel-txt"><b>{pct}<small>%</small></b><i>CONCLUÍDO</i></span>
          </span>
          <div className="vc-prog-txt">
            <h2>SEU PROGRESSO GERAL</h2>
            <p>Continue seus estudos e aumente sua performance!</p>
            <span className="vc-trilho" role="progressbar" aria-label="Progresso geral do edital" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${pct}%` }} /></span>
          </div>
        </section>

        <Link href={`${base}?aba=raiox`} className="vc-inteligente" style={{ backgroundImage: "url(/card-edital/painel2.webp)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ícone fixo da marca */}
          <img src="/card-edital/cerebro.webp" alt="" aria-hidden width={84} height={90} decoding="async" />
          <span><b>ESTUDO INTELIGENTE</b><small>Aproveite o conteúdo com a metodologia APROVUM</small></span>
        </Link>

        {/* Botões */}
        <div className="vc-btns">
          <button type="button" className="vc-btn vc-corrigir" style={{ backgroundImage: "url(/card-edital/bt1.webp)" }} onClick={() => setEdit((v) => !v)} aria-expanded={edit}>
            <Info aria-hidden /><span>{edit ? <>Fechar<br />edição</> : <>Corrigir<br />informações</>}</span>
          </button>
          <div className="vc-del-box" style={{ backgroundImage: "url(/card-edital/bt2.webp)" }}><DeletePrep id={prep.id} redirectTo="/aprovum-ai" tatico /></div>
          <Link href={`${base}?aba=aulas`} className="vc-btn vc-rapido" style={{ backgroundImage: "url(/card-edital/bt3.webp)" }}>
            <Zap aria-hidden /><span><b>Acesso rápido</b><small>Tudo em um só lugar</small></span><ArrowRight aria-hidden />
          </Link>
        </div>

        {edit && (
          <form action={async (f) => { await save(f); setEdit(false); }} className="vc-edit">
            <label><span>Nome do concurso</span><input name="contestName" defaultValue={prep.contestName ?? ""} maxLength={160} /></label>
            <label><span>Cargo pretendido</span><input name="roleName" defaultValue={prep.roleName ?? ""} maxLength={160} placeholder="Ex: Guarda Civil Municipal" autoFocus={editing && !prep.roleName} /></label>
            <label><span>Banca</span><input name="board" defaultValue={prep.board ?? ""} maxLength={80} /></label>
            <label><span>Ano</span><input name="year" defaultValue={prep.year ?? ""} inputMode="numeric" maxLength={4} /></label>
            <button type="submit" className="vc-salvar">SALVAR</button>
          </form>
        )}
      </article>
    </div>
  );
}
