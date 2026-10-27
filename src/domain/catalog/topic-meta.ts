/**
 * Edição rápida do tema (título) e do tipo de uma aula do catálogo, sem recolar o texto.
 * Puro: valida e normaliza com as mesmas regras do texto colado ("Lei:" e "Artigos:").
 */
import { articlesFrom, lawCodeFrom } from "./upload";

export interface TopicMetaInput {
  title: string;
  kind: string;
  law?: string;
  articles?: string;
}

export type TopicMeta = { title: string; kind: "tema"; law_code: null; articles: [] } | { title: string; kind: "dispositivo"; law_code: string; articles: string[] };

export function parseTopicMeta(input: TopicMetaInput): { ok: true; meta: TopicMeta } | { ok: false; error: string } {
  const title = (input.title ?? "").replace(/\s+/g, " ").trim();
  if (title.length < 2) return { ok: false, error: "Escreva o tema (pelo menos 2 letras)." };
  if (title.length > 200) return { ok: false, error: "Tema longo demais (máximo de 200 caracteres)." };
  if (input.kind === "tema") return { ok: true, meta: { title, kind: "tema", law_code: null, articles: [] } };
  if (input.kind !== "dispositivo") return { ok: false, error: "Tipo inválido: escolha tema ou dispositivo." };
  const law = lawCodeFrom(input.law ?? "");
  if (!law) return { ok: false, error: "Tipo dispositivo: informe a lei (ex.: CP, CPP, CF ou o número da lei)." };
  const articles = articlesFrom(input.articles ?? "");
  if (!articles.length) return { ok: false, error: "Tipo dispositivo: informe os artigos (ex.: 155 ou 121, 122)." };
  if (articles.length > 120) return { ok: false, error: "Artigos demais para uma aula (máximo de 120)." };
  return { ok: true, meta: { title, kind: "dispositivo", law_code: law, articles } };
}
