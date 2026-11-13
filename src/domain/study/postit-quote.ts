/**
 * Validação do trecho marcado num post-it. O navegador entrega o texto renderizado da seção
 * (sem a sintaxe do markdown); o servidor confere que ele de fato existe na aula do aluno,
 * comparando apenas letras e números (sem acentos trocados: preserva os acentos, ignora
 * pontuação, espaços e símbolos do markdown). Assim ninguém grava trecho inventado.
 */
export const POSTIT_QUOTE_MIN = 2;
/** Sem limite prático: dá para marcar a seção inteira. */
export const POSTIT_QUOTE_MAX = 200_000;
export const POSTIT_NOTE_MAX = 2000;

/** Remove caracteres de controle e normaliza o texto para guardar/mostrar. */
export function cleanPostitText(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‍⁠﻿]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Só letras e números, em minúsculas — base da comparação tolerante. */
export function matchKey(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export interface QuoteSection {
  id: string;
  title: string;
  /** Texto-fonte da seção (markdown cru e/ou convertido). */
  bodies: string[];
}

/** Acha a seção que contém o trecho; prioriza a seção indicada pelo navegador. */
export function findQuoteSection(quote: string, sections: QuoteSection[], preferredId?: string | null): QuoteSection | null {
  const key = matchKey(quote);
  if (key.length < 2) return null;
  const has = (s: QuoteSection) => s.bodies.some((b) => matchKey(b).includes(key) || matchKey(s.title).includes(key));
  if (preferredId) {
    const p = sections.find((s) => s.id === preferredId);
    if (p && has(p)) return p;
  }
  return sections.find(has) ?? null;
}
