import { radicaisDoPedido } from "./catalogo-lousa";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// palavras de título que não dizem o assunto (evitam travar por "crimes", "lei", "conceito"…)
const GENERICAS = ["crime", "crimes", "lei", "leis", "artigo", "artigos", "conceito", "nocoes", "nocao", "introducao", "direito", "geral", "principios", "principal", "aula", "capitulo", "modulo", "tema", "questoes", "revisao", "resumo", "qual", "quais", "qualquer", "entre", "diferenca", "semelhanca", "como", "quando", "porque", "exemplo"];

function acertos(radicais: string[], titulo: string): number {
  const t = norm(titulo);
  return radicais.filter((r) => t.includes(r)).length;
}

/**
 * Trava de assunto: o aluno pede para ensinar/exemplificar algo que é o tema de OUTRA aula da trilha
 * (e não o da aula aberta). Devolve o título dessa outra aula, ou null quando o pedido cabe na aula atual
 * (empate também libera: comparar "roubo e furto" dentro da aula de roubo é permitido).
 */
export function travaDeAssunto(pedido: string, aulaAtual: string, outras: string[]): string | null {
  const radicais = radicaisDoPedido(pedido).filter((r) => !GENERICAS.some((g) => g === r || (r.length >= 5 && g.startsWith(r))));
  if (!radicais.length || !outras.length) return null;
  const noAtual = acertos(radicais, aulaAtual);
  let melhor: { titulo: string; n: number } | null = null;
  for (const o of outras) {
    const n = acertos(radicais, o);
    if (n > 0 && (!melhor || n > melhor.n)) melhor = { titulo: o, n };
  }
  return melhor && melhor.n > noAtual ? melhor.titulo : null;
}
