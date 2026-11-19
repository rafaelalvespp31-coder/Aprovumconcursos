/** Aviso diário de concursos abertos e previstos (push no celular e faixa no Mentor). Puro, sem banco. */
export interface ConcursoAviso { name: string; uf: string | null; status: string }
export interface ResumoConcursos { abertos: number; previstos: number; destaque: ConcursoAviso | null; /** Até 8 concursos do grupo em destaque; o aviso sorteia um a cada vez. */ destaques?: ConcursoAviso[] }
import { sortear, type Rand } from "./mentor/variar";

export const STATUS_ABERTO = "inscricoes_abertas";
export const STATUS_PREVISTOS = ["previsto", "autorizado"] as const;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Monta o resumo e escolhe, entre os abertos (ou, se não houver, os previstos), um destaque que muda a cada dia. */
export function resumir(lista: ConcursoAviso[], hoje: Date = new Date()): ResumoConcursos {
  const abertos = lista.filter((c) => c.status === STATUS_ABERTO);
  const previstos = lista.filter((c) => (STATUS_PREVISTOS as readonly string[]).includes(c.status));
  const pool = abertos.length ? abertos : previstos;
  const dia = Math.floor(hoje.getTime() / 86_400_000);
  return { abertos: abertos.length, previstos: previstos.length, destaque: pool.length ? (pool[dia % pool.length] ?? null) : null, destaques: pool.slice(0, 8) };
}

/** Texto do aviso; muda de frase e de concurso em destaque a cada sorteio. null quando não há concurso aberto nem previsto. */
export function textoAviso(r: ResumoConcursos, rand: Rand = Math.random): { title: string; body: string } | null {
  if (!r.abertos && !r.previstos) return null;
  const partes = [r.abertos ? plural(r.abertos, "concurso aberto", "concursos abertos") : "", r.previstos ? plural(r.previstos, "previsto", "previstos") : ""].filter(Boolean).join(" e ");
  const d = r.destaques?.length ? sortear(r.destaques, rand) : r.destaque;
  const nome = d ? `${d.name}${d.uf ? ` (${d.uf})` : ""}` : "";
  const titulos = r.abertos ? ["Concursos abertos agora", "Inscrições abertas!", "Olho no edital", "Sua chance está aberta"] : ["Concursos previstos", "Edital a caminho", "Fique de olho", "Vem concurso por aí"];
  const corpos = d
    ? [`${partes}. Destaque: ${nome}. Toque para ver.`, `${nome} está em evidência. Temos ${partes}. Toque para ver.`, `Já viu ${nome}? No total: ${partes}. Toque para ver.`, `${partes}, e ${nome} merece sua atenção. Toque para ver.`]
    : [`${partes}. Toque para ver.`, `Temos ${partes}. Toque para ver.`];
  return { title: sortear(titulos, rand), body: sortear(corpos, rand) };
}
