import { articleId } from "@/domain/catalog/match";

/**
 * Texto oficial de leis (Planalto) — parte pura: endereços, conversão de HTML em
 * texto e recorte dos artigos pedidos. O download fica no servidor.
 */
export interface LawSource {
  code: string;
  name: string;
  number: string;
  url: string;
}

export const LAW_SOURCES: Record<string, LawSource> = {
  CP: { code: "CP", name: "Código Penal", number: "Decreto-Lei 2.848/1940", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm" },
  CPP: { code: "CPP", name: "Código de Processo Penal", number: "Decreto-Lei 3.689/1941", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm" },
  CF: { code: "CF", name: "Constituição Federal", number: "CF/1988", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm" },
  LEP: { code: "LEP", name: "Lei de Execução Penal", number: "Lei 7.210/1984", url: "https://www.planalto.gov.br/ccivil_03/leis/l7210.htm" },
  L11340: { code: "L11340", name: "Lei Maria da Penha", number: "Lei 11.340/2006", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm" },
  L8112: { code: "L8112", name: "Estatuto dos Servidores Públicos Federais", number: "Lei 8.112/1990", url: "https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm" },
  L9784: { code: "L9784", name: "Lei do Processo Administrativo", number: "Lei 9.784/1999", url: "https://www.planalto.gov.br/ccivil_03/leis/l9784.htm" },
  L8429: { code: "L8429", name: "Lei de Improbidade Administrativa", number: "Lei 8.429/1992", url: "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm" },
  L13869: { code: "L13869", name: "Lei de Abuso de Autoridade", number: "Lei 13.869/2019", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm" },
  L11343: { code: "L11343", name: "Lei de Drogas", number: "Lei 11.343/2006", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm" },
  L10826: { code: "L10826", name: "Estatuto do Desarmamento", number: "Lei 10.826/2003", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm" },
  L8072: { code: "L8072", name: "Lei dos Crimes Hediondos", number: "Lei 8.072/1990", url: "https://www.planalto.gov.br/ccivil_03/leis/l8072.htm" },
  L12850: { code: "L12850", name: "Lei de Organização Criminosa", number: "Lei 12.850/2013", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm" },
  L9455: { code: "L9455", name: "Lei de Tortura", number: "Lei 9.455/1997", url: "https://www.planalto.gov.br/ccivil_03/leis/l9455.htm" },
  ECA: { code: "ECA", name: "Estatuto da Criança e do Adolescente", number: "Lei 8.069/1990", url: "https://www.planalto.gov.br/ccivil_03/leis/l8069.htm" },
  CTB: { code: "CTB", name: "Código de Trânsito Brasileiro", number: "Lei 9.503/1997", url: "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm" },
};

/** Decodifica a página respeitando o charset (o Planalto ainda usa windows-1252 em várias leis). */
export function decodeHtml(bytes: Uint8Array, contentType: string | null): string {
  const declared = (contentType ?? "").match(/charset=([\w-]+)/i)?.[1]?.toLowerCase();
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 2048));
  const meta = head.match(/charset=["']?([\w-]+)/i)?.[1]?.toLowerCase();
  const cs = declared ?? meta;
  if (cs && /1252|8859-1|latin/.test(cs)) return new TextDecoder("windows-1252").decode(bytes);
  const utf = new TextDecoder("utf-8").decode(bytes);
  return utf.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf;
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ordm: "º", ordf: "ª", sect: "§", deg: "°", ndash: "–", mdash: "—", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", hellip: "…" };

/** HTML → texto. Remove o que está riscado (redação revogada que o Planalto mantém tachada). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(strike|s|del)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d|table|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

const ART_LINE = /^Art\.?\s*(\d+)\s*(?:[º°o]\s*)?(?:-\s*([A-Z])\b)?/i;

/** Recorta os artigos pedidos, cada um até o início do artigo seguinte. */
export function extractArticles(text: string, wanted: readonly string[], maxChars: number): { text: string; found: string[]; missing: string[] } {
  const lines = text.split("\n");
  const starts: Array<{ id: string; line: number }> = [];
  lines.forEach((l, i) => {
    const m = l.match(ART_LINE);
    if (m) starts.push({ id: articleId(m[2] ? `${m[1]}-${m[2]}` : m[1]!), line: i });
  });
  const ids = wanted.map((w) => articleId(w));
  const parts: string[] = [];
  const found: string[] = [];
  let size = 0;
  for (const id of ids) {
    const idx = starts.findIndex((s) => s.id === id);
    if (idx < 0) continue;
    const end = starts[idx + 1]?.line ?? Math.min(lines.length, starts[idx]!.line + 80);
    const block = lines.slice(starts[idx]!.line, end).join("\n");
    if (size + block.length > maxChars) {
      if (!parts.length) {
        parts.push(block.slice(0, maxChars));
        found.push(id);
      }
      break;
    }
    parts.push(block);
    found.push(id);
    size += block.length + 2;
  }
  return { text: parts.join("\n\n"), found, missing: ids.filter((i) => !found.includes(i)) };
}
