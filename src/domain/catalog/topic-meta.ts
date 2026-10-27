/**
 * Edição rápida do tema (título) e do tipo de uma aula do catálogo, sem recolar o texto.
 * Puro: valida e normaliza com as mesmas regras do texto colado ("Lei:" e "Artigos:").
 */
import { articlesFrom, lawCodeFrom } from "./upload";
import { codeBelongs, parseCodedTitle } from "./topic-group";

export interface TopicMetaInput {
  title: string;
  kind: string;
  law?: string;
  articles?: string;
  /** Tópico do edital ("4. Ilicitude"); vazio = aula avulsa. Ausente = não mexe. */
  topicGroup?: string;
  /** Número do subtópico ("4.1"). */
  subtopicCode?: string;
}

export interface TopicGroupMeta {
  topic_group: string | null;
  topic_group_code: string | null;
  subtopic_code: string | null;
}

export type TopicMeta = ({ title: string; kind: "tema"; law_code: null; articles: [] } | { title: string; kind: "dispositivo"; law_code: string; articles: string[] }) & Partial<TopicGroupMeta>;

const SUB_CODE = /^\d{1,3}(\.\d{1,3}){0,4}$/;

/** Lê o tópico e o número do subtópico digitados no editor. */
export function parseGroupFields(topicGroup: string, subtopicCode: string): { ok: true; meta: TopicGroupMeta } | { ok: false; error: string } {
  const g = parseCodedTitle(topicGroup);
  const code = subtopicCode.trim().replace(/\.$/, "");
  if (!g) return code ? { ok: false, error: "Informe o tópico (ex.: 4. Ilicitude) para usar o número do subtópico." } : { ok: true, meta: { topic_group: null, topic_group_code: null, subtopic_code: null } };
  if (code && !SUB_CODE.test(code)) return { ok: false, error: "Número do subtópico inválido (ex.: 4.1)." };
  const groupCode = g.code ?? (code.includes(".") ? code.split(".")[0]! : null);
  if (code && groupCode && !codeBelongs(code, groupCode)) return { ok: false, error: `O subtópico ${code} não começa com o número do tópico (${groupCode}).` };
  return { ok: true, meta: { topic_group: g.title, topic_group_code: groupCode, subtopic_code: code || null } };
}

export function parseTopicMeta(input: TopicMetaInput): { ok: true; meta: TopicMeta } | { ok: false; error: string } {
  const title = (input.title ?? "").replace(/\s+/g, " ").trim();
  let group: Partial<TopicGroupMeta> = {};
  if (input.topicGroup !== undefined || input.subtopicCode !== undefined) {
    const gr = parseGroupFields(input.topicGroup ?? "", input.subtopicCode ?? "");
    if (!gr.ok) return gr;
    group = gr.meta;
  }
  if (title.length < 2) return { ok: false, error: "Escreva o tema (pelo menos 2 letras)." };
  if (title.length > 200) return { ok: false, error: "Tema longo demais (máximo de 200 caracteres)." };
  if (input.kind === "tema") return { ok: true, meta: { title, kind: "tema", law_code: null, articles: [], ...group } };
  if (input.kind !== "dispositivo") return { ok: false, error: "Tipo inválido: escolha tema ou dispositivo." };
  const law = lawCodeFrom(input.law ?? "");
  if (!law) return { ok: false, error: "Tipo dispositivo: informe a lei (ex.: CP, CPP, CF ou o número da lei)." };
  const articles = articlesFrom(input.articles ?? "");
  if (!articles.length) return { ok: false, error: "Tipo dispositivo: informe os artigos (ex.: 155 ou 121, 122)." };
  if (articles.length > 120) return { ok: false, error: "Artigos demais para uma aula (máximo de 120)." };
  return { ok: true, meta: { title, kind: "dispositivo", law_code: law, articles, ...group } };
}
