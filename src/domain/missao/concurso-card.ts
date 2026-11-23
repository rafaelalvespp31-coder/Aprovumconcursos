/** Textos dos cartões de concurso, sempre a partir do cadastro da equipe (nada inventado). */
import type { ConcursoCard } from "./materias";

export type ChipConcurso = { texto: string; tipo: "destaque" | "verde" | "amarelo" | "relogio" };

/** AAAA-MM-DD → DD/MM/AAAA (devolve o texto original se não tiver esse formato). */
export function formatarData(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

const ROTULO_SITUACAO: Record<string, string> = {
  previsto: "Edital em breve",
  autorizado: "Concurso autorizado",
  edital_publicado: "Edital publicado",
  inscricoes_abertas: "Inscrições abertas",
  inscricoes_encerradas: "Inscrições encerradas",
  prova_realizada: "Prova realizada",
  encerrado: "Encerrado",
};

/** Selo no alto do cartão: destaque (marcado pela equipe) ou a situação do concurso. */
export function chipDoConcurso(c: Pick<ConcursoCard, "destaque" | "situacao">): ChipConcurso {
  if (c.destaque) return { texto: "Destaque", tipo: "destaque" };
  switch (c.situacao) {
    case "inscricoes_abertas": return { texto: "Inscrições abertas", tipo: "verde" };
    case "edital_publicado": return { texto: "Edital publicado", tipo: "verde" };
    case "autorizado": return { texto: "Autorizado", tipo: "amarelo" };
    case "inscricoes_encerradas": return { texto: "Inscrições encerradas", tipo: "relogio" };
    case "prova_realizada": return { texto: "Prova realizada", tipo: "relogio" };
    case "encerrado": return { texto: "Encerrado", tipo: "relogio" };
    default: return { texto: "Em breve", tipo: "relogio" };
  }
}

/** Linha de data/situação do cartão: prazo de inscrição, data da prova (só se confirmada) ou a situação. */
export function quandoDoConcurso(c: Pick<ConcursoCard, "situacao" | "provaEm" | "inscricaoAte">): string {
  const ate = formatarData(c.inscricaoAte);
  if (c.situacao === "inscricoes_abertas" && ate) return `Inscrições até ${ate}`;
  const prova = formatarData(c.provaEm);
  if (prova && c.situacao !== "prova_realizada" && c.situacao !== "encerrado") return `Prova ${prova}`;
  return ROTULO_SITUACAO[c.situacao] ?? "Edital em breve";
}

export const formatarVagas = (n: number): string => `${n.toLocaleString("pt-BR")} ${n === 1 ? "vaga" : "vagas"}`;
