import Link from "next/link";
import type { DupLesson, PlanDuplicates } from "@/domain/catalog/plan-duplicates";

function LessonChip({ l, base, admin }: { l: DupLesson; base: string; admin: boolean }) {
  const pub = l.status === "publicado";
  // Admin abre qualquer aula; sócio só abre rascunho (a página confere o dono).
  const href = admin ? `/admin/catalogo/${l.id}` : !pub ? `${base}/${l.id}` : null;
  const inner = (
    <>
      <span className={`dup-dot ${pub ? "dup-dot-pub" : "dup-dot-rasc"}`} aria-hidden />
      <span className="min-w-0 flex-1 break-words">{l.code ? `${l.code} · ` : ""}{l.title}</span>
      <span className="dup-st">{pub ? "no ar" : l.status === "arquivado" ? "arquivada" : "rascunho"}</span>
    </>
  );
  return href ? <Link href={href} className="dup-chip dup-chip-link">{inner}</Link> : <span className="dup-chip">{inner}</span>;
}

/** Central de duplicadas do plano: o que está repetido, onde e o que fazer. Chamativa de propósito. */
export function DuplicatesCenter({ dupes, base, admin }: { dupes: PlanDuplicates; base: string; admin: boolean }) {
  if (dupes.total === 0) {
    return (
      <section className="dup-ok" data-testid="sem-duplicados" aria-label="Duplicadas">
        <span aria-hidden className="dup-ok-ic">✓</span>
        <div><b>Nenhuma duplicada</b><small>Nenhuma aula, subtópico ou tópico repetido neste plano.</small></div>
      </section>
    );
  }
  const tiles: Array<[number, string]> = [[dupes.subtopics.length, "subtópicos com 2+ aulas"], [dupes.titles.length, "aulas com o mesmo título"], [dupes.outline.length, "itens repetidos no plano"]];
  return (
    <section role="alert" aria-labelledby="duplicados" className="dup-center" data-testid="aviso-duplicados">
      <div className="dup-head">
        <span className="dup-siren" aria-hidden>⚠</span>
        <div className="min-w-0">
          <h2 id="duplicados">DUPLICADAS ENCONTRADAS</h2>
          <p>Resolva antes de catalogar mais: aula repetida confunde o aluno e polui o catálogo.</p>
        </div>
        <span className="dup-total" aria-label={`${dupes.total} duplicadas`}>{dupes.total}</span>
      </div>

      <div className="dup-tiles">
        {tiles.map(([n, l]) => (
          <div key={l} data-zero={n === 0 ? 1 : undefined}><b>{n}</b><small>{l}</small></div>
        ))}
      </div>

      {dupes.subtopics.length > 0 && (
        <div className="dup-blk" data-testid="dup-subtopicos">
          <h3>Subtópicos cobertos por mais de uma aula</h3>
          <ul>
            {dupes.subtopics.map((d) => (
              <li key={d.ref}>
                <p className="dup-tt"><a href={`#sub-${d.ref}`}>{d.code ? `${d.code} ` : ""}{d.title}</a><small>{d.groupTitle}</small></p>
                <div className="dup-chips">{d.lessons.map((l) => <LessonChip key={l.id} l={l} base={base} admin={admin} />)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dupes.titles.length > 0 && (
        <div className="dup-blk" data-testid="dup-titulos">
          <h3>Aulas com o mesmo título</h3>
          <ul>
            {dupes.titles.map((d) => (
              <li key={d.lessons.map((l) => l.id).join()}>
                <p className="dup-tt"><span>{d.title}</span><small>{d.lessons.length} aulas</small></p>
                <div className="dup-chips">{d.lessons.map((l) => <LessonChip key={l.id} l={l} base={base} admin={admin} />)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dupes.outline.length > 0 && (
        <div className="dup-blk" data-testid="dup-plano">
          <h3>Repetido no próprio sumário do plano</h3>
          <ul>
            {dupes.outline.map((o) => (
              <li key={`${o.kind}|${o.refs.join()}`}>
                <p className="dup-tt">
                  <span>{o.kind === "topico" ? "Tópico" : "Subtópico"} {o.code ? `${o.code} ` : ""}{o.title}</span>
                  <small>aparece {o.times}× · {o.where}</small>
                </p>
              </li>
            ))}
          </ul>
          <p className="dup-dica">Edite o plano e deixe cada tópico e subtópico uma vez só.</p>
        </div>
      )}

      <p className="dup-dica">
        <b>O que fazer:</b> fique com uma aula por subtópico (de preferência a que está no ar) e {admin ? "exclua ou arquive as outras na página de cada aula" : "peça ao administrador para arquivar as outras"}.
        Catalogar de novo o mesmo subtópico atualiza a aula que já existe, sem duplicar.
      </p>
    </section>
  );
}
