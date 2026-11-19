/** Aviso diário de concursos abertos e previstos (push no celular e faixa no Mentor). Puro, sem banco. */
export interface ConcursoAviso { name: string; uf: string | null; status: string }
export interface ResumoConcursos { abertos: number; previstos: number; destaque: ConcursoAviso | null }

export const STATUS_ABERTO = "inscricoes_abertas";
export const STATUS_PREVISTOS = ["previsto", "autorizado"] as const;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Monta o resumo e escolhe, entre os abertos (ou, se não houver, os previstos), um destaque que muda a cada dia. */
export function resumir(lista: ConcursoAviso[], hoje: Date = new Date()): ResumoConcursos {
  const abertos = lista.filter((c) => c.status === STATUS_ABERTO);
  const previstos = lista.filter((c) => (STATUS_PREVISTOS as readonly string[]).includes(c.status));
  const pool = abertos.length ? abertos : previstos;
  const dia = Math.floor(hoje.getTime() / 86_400_000);
  return { abertos: abertos.length, previstos: previstos.length, destaque: pool.length ? (pool[dia % pool.length] ?? null) : null };
}

/** Texto do aviso do dia; null quando não há concurso aberto nem previsto. */
export function textoAviso(r: ResumoConcursos): { title: string; body: string } | null {
  if (!r.abertos && !r.previstos) return null;
  const partes = [r.abertos ? plural(r.abertos, "concurso aberto", "concursos abertos") : "", r.previstos ? plural(r.previstos, "previsto", "previstos") : ""].filter(Boolean);
  const d = r.destaque;
  const dest = d ? ` Destaque: ${d.name}${d.uf ? ` (${d.uf})` : ""}.` : "";
  return { title: r.abertos ? "Concursos abertos agora" : "Concursos previstos", body: `${partes.join(" e ")}.${dest} Toque para ver.` };
}
