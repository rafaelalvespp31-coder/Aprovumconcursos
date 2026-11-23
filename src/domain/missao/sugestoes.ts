/** Sugestões do campo "Digite o concurso desejado…": só dados reais (catálogo da equipe e editais do próprio aluno). */
export type SugestaoTipo = "catalogo" | "edital" | "objetivo";

export interface Sugestao {
  /** Identificador estável na lista (catálogo: id do concurso; edital: id do edital). */
  id: string;
  tipo: SugestaoTipo;
  /** Nome que será salvo como objetivo do aluno. */
  nome: string;
  /** Linha de apoio (instituição, cargo, UF…): nunca inventada, vem do cadastro. */
  detalhe: string | null;
  /** Só para tipo "edital": o edital do próprio aluno, que gera o plano. */
  editalId?: string;
}

export const normalizar = (s: string): string => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Limpa o texto digitado antes de usar em busca no banco: sem caracteres de controle nem curingas/operadores do filtro. */
export function sanitizarConsulta(v: unknown): string {
  if (typeof v !== "string") return "";
  const t = v.normalize("NFC").replace(/[\u0000-\u001f\u007f<>`{}()[\],%_*\\"';:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return t.length >= 2 ? t : "";
}

/** 0 = não combina; maior = melhor. Todas as palavras digitadas precisam aparecer (em qualquer ordem). */
export function pontuar(consulta: string, s: Sugestao): number {
  const q = normalizar(consulta);
  if (!q) return 1;
  const alvo = normalizar(s.nome);
  const tudo = `${alvo} ${normalizar(s.detalhe ?? "")}`;
  const palavras = q.split(" ");
  if (!palavras.every((p) => tudo.includes(p))) return 0;
  if (alvo === q) return 100;
  if (alvo.startsWith(q)) return 80;
  if (palavras.every((p) => alvo.split(" ").some((w) => w.startsWith(p)))) return 60;
  if (alvo.includes(q)) return 40;
  return palavras.every((p) => alvo.includes(p)) ? 25 : 10;
}

const ORDEM: Record<SugestaoTipo, number> = { catalogo: 0, edital: 1, objetivo: 2 };

/** Filtra, remove repetidos (mesmo nome) e ordena: catálogo → editais do aluno; dentro de cada grupo, melhor combinação primeiro. */
export function rankear(consulta: string, itens: Sugestao[], max = 8): Sugestao[] {
  const vistos = new Set<string>();
  return itens
    .map((s) => ({ s, p: pontuar(consulta, s) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => ORDEM[a.s.tipo] - ORDEM[b.s.tipo] || b.p - a.p || a.s.nome.localeCompare(b.s.nome, "pt-BR"))
    .filter(({ s }) => {
      const k = `${s.tipo === "edital" ? s.editalId : "n"}|${normalizar(s.nome)}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .slice(0, max)
    .map((x) => x.s);
}

/** Junta listas (ex.: locais + vindas do servidor) sem repetir o mesmo item. */
export function mesclar(...listas: Sugestao[][]): Sugestao[] {
  const mapa = new Map<string, Sugestao>();
  for (const l of listas) for (const s of l) mapa.set(`${s.tipo}:${s.id}`, s);
  return [...mapa.values()];
}
