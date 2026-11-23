import { modeOfDiscipline } from "./disciplines";
import type { ParsedDiscipline, ParsedEdital, ParsedTopic } from "./parser";
import { titleKey } from "./text";

/**
 * Importação da análise completa do concurso, feita pelo admin num chat externo (ChatGPT) com um comando fixo.
 * O chat devolve um JSON (formato abaixo); aqui ele é achado no texto colado, validado e convertido na mesma estrutura
 * (matérias › tópicos) que o leitor de PDF produz. Puro: sem banco e sem React (roda no navegador e no servidor).
 */

export const IMPORTACAO_VERSAO = 1;
const MAX_MATERIAS = 60;
const MAX_TOPICOS = 6000;
const MAX_NIVEL = 6;

export interface InfoImportada {
  nome: string | null;
  orgao: string | null;
  cargo: string | null;
  banca: string | null;
  ano: number | null;
}

export interface ResumoImportacao {
  materias: number;
  topicos: number;
  porMateria: Array<{ nome: string; topicos: number }>;
}

export type ResultadoImportacao =
  | { ok: true; parsed: ParsedEdital; info: InfoImportada; resumo: ResumoImportacao; avisos: string[] }
  | { ok: false; erros: string[] };

/** O comando que o admin cola no ChatGPT junto com o PDF do edital. {CARGO} é trocado pelo cargo desejado. */
export const COMANDO_CHATGPT = `Você é um analista de editais de concursos públicos brasileiros. Leia o PDF do edital anexado, do início ao fim, e extraia o CONTEÚDO PROGRAMÁTICO COMPLETO do cargo: {CARGO}.

REGRAS (siga todas):
1. Inclua TODAS as matérias do cargo (conhecimentos básicos, gerais e específicos) e TODOS os tópicos e subtópicos de cada uma. Não resuma, não agrupe, não pule, não invente.
2. Copie cada título EXATAMENTE como está no edital (mesmas palavras, pontuação e numeração). Não corrija nem reescreva.
3. Mantenha a ordem do edital e a hierarquia: tópico › subtópico › sub-subtópico (use "subtopicos" para os níveis abaixo). Em "codigo" ponha a numeração original ("1", "1.1", "a"…); se não houver, use "".
4. Matérias do mesmo cargo apenas. Ignore salários, inscrições, cronograma, requisitos, vagas e provas.
5. Se uma matéria só vale para outro cargo, não a inclua.
6. Em "itens_no_edital" de cada matéria, informe quantos itens (tópicos + subtópicos) o edital tem nessa matéria, contados por você no PDF, para conferência.
7. Responda SOMENTE com um JSON válido neste formato, sem texto antes ou depois:

{
  "versao": ${IMPORTACAO_VERSAO},
  "concurso": { "nome": "", "orgao": "", "cargo": "", "banca": "", "ano": 0 },
  "materias": [
    {
      "nome": "LÍNGUA PORTUGUESA",
      "itens_no_edital": 0,
      "topicos": [
        { "codigo": "1", "titulo": "…", "subtopicos": [ { "codigo": "1.1", "titulo": "…" } ] }
      ]
    }
  ]
}

Se a resposta ficar grande demais e for cortada, termine o JSON da parte atual e eu peço "continue"; na continuação, repita o mesmo formato com as matérias seguintes.`;

export const comandoParaCargo = (cargo: string): string => COMANDO_CHATGPT.replace("{CARGO}", cargo.trim() || "(informe o cargo)");

/** Acha todos os objetos JSON de nível raiz no texto (o chat pode ter posto cercas ``` ou conversa em volta, ou ter respondido em partes). */
export function objetosJson(texto: string): string[] {
  const out: string[] = [];
  let prof = 0;
  let ini = -1;
  let emString = false;
  let escape = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (emString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') emString = false;
      continue;
    }
    if (c === '"' && prof > 0) emString = true;
    else if (c === "{") {
      if (prof === 0) ini = i;
      prof++;
    } else if (c === "}" && prof > 0) {
      prof--;
      if (prof === 0 && ini >= 0) {
        out.push(texto.slice(ini, i + 1));
        ini = -1;
      }
    }
  }
  return out;
}

type No = { codigo?: unknown; titulo?: unknown; subtopicos?: unknown };
const texto = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const inteiro = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : null);
const nuloSeVazio = (s: string): string | null => (s ? s : null);

/** Valida o que foi colado e converte para a estrutura do leitor (matérias › tópicos com nível). Erros em português, apontando a matéria. */
export function validarImportacao(bruto: string): ResultadoImportacao {
  const entrada = bruto.replace(/\u0000/g, "");
  if (entrada.trim().length < 20) return { ok: false, erros: ["Cole aqui a resposta do ChatGPT (o JSON)."] };
  const blocos = objetosJson(entrada);
  if (!blocos.length) {
    return { ok: false, erros: ["Não achei um JSON na resposta. Ele começa em { e termina em }. Se foi cortado no meio, peça ao ChatGPT para continuar e cole tudo junto."] };
  }
  const objetos: Array<Record<string, unknown>> = [];
  for (const [i, b] of blocos.entries()) {
    try {
      const o = JSON.parse(b) as unknown;
      if (o && typeof o === "object" && !Array.isArray(o)) objetos.push(o as Record<string, unknown>);
    } catch (e) {
      return { ok: false, erros: [`O JSON${blocos.length > 1 ? ` da parte ${i + 1}` : ""} está inválido (${(e as Error).message.slice(0, 90)}). Peça ao ChatGPT para reenviar só o JSON, sem comentários.`] };
    }
  }
  const brutas: Array<Record<string, unknown>> = objetos.flatMap((o) => (Array.isArray(o.materias) ? (o.materias as unknown[]).filter((m): m is Record<string, unknown> => !!m && typeof m === "object") : []));
  if (!brutas.length) return { ok: false, erros: ['O JSON não tem a lista "materias". Use o formato do comando.'] };
  if (brutas.length > MAX_MATERIAS) return { ok: false, erros: [`Matérias demais (${brutas.length}); o limite é ${MAX_MATERIAS}.`] };

  const c = (objetos.find((o) => o.concurso && typeof o.concurso === "object")?.concurso ?? {}) as Record<string, unknown>;
  const ano = inteiro(c.ano);
  const info: InfoImportada = {
    nome: nuloSeVazio(texto(c.nome, 160)),
    orgao: nuloSeVazio(texto(c.orgao, 160)),
    cargo: nuloSeVazio(texto(c.cargo, 160)),
    banca: nuloSeVazio(texto(c.banca, 80)),
    ano: ano && ano >= 1990 && ano <= 2100 ? ano : null,
  };

  const erros: string[] = [];
  const avisos: string[] = [];
  const porNome = new Map<string, ParsedDiscipline>();
  const esperado = new Map<string, number>();
  let total = 0;

  for (const [i, m] of brutas.entries()) {
    const nome = texto(m.nome, 160);
    if (nome.length < 2) {
      erros.push(`A matéria ${i + 1} está sem nome.`);
      continue;
    }
    const chave = nome.toLocaleLowerCase("pt-BR");
    const disc = porNome.get(chave) ?? { name: nome, mode: modeOfDiscipline(nome), page: 0, topics: [] };
    if (porNome.has(chave)) avisos.push(`A matéria "${nome}" veio em mais de uma parte: os tópicos foram juntados.`);
    const antes = disc.topics.length;
    const visitar = (nos: unknown, nivel: number) => {
      if (!Array.isArray(nos)) return;
      for (const n of nos as No[]) {
        if (!n || typeof n !== "object") continue;
        const titulo = texto(n.titulo, 1000);
        if (titulo.length < 2) {
          erros.push(`Há um tópico sem título em "${nome}".`);
          continue;
        }
        if (nivel > MAX_NIVEL) {
          erros.push(`"${nome}": hierarquia funda demais (mais de ${MAX_NIVEL} níveis) em "${titulo.slice(0, 40)}".`);
          continue;
        }
        const codigo = texto(n.codigo, 40);
        const t: ParsedTopic = { code: nuloSeVazio(codigo), depth: nivel, title: titulo, titleKey: titleKey(titulo), page: 0 };
        disc.topics.push(t);
        total++;
        visitar(n.subtopicos, nivel + 1);
      }
    };
    visitar(m.topicos, 1);
    if (disc.topics.length === antes) erros.push(`A matéria "${nome}" não tem tópicos.`);
    const esp = inteiro(m.itens_no_edital);
    if (esp && esp > 0) esperado.set(chave, (esperado.get(chave) ?? 0) + esp);
    porNome.set(chave, disc);
    if (total > MAX_TOPICOS) return { ok: false, erros: [`Tópicos demais (mais de ${MAX_TOPICOS}).`] };
  }
  if (erros.length) return { ok: false, erros: erros.slice(0, 12) };

  const disciplines = [...porNome.values()];
  // Conferência: o ChatGPT contou os itens no edital; se o que veio é menor, provavelmente faltou algo.
  for (const d of disciplines) {
    const esp = esperado.get(d.name.toLocaleLowerCase("pt-BR"));
    if (esp && d.topics.length < esp) avisos.push(`"${d.name}": o ChatGPT contou ${esp} itens no edital, mas vieram ${d.topics.length}. Pode ter faltado conteúdo.`);
    if (esp && d.topics.length > esp) avisos.push(`"${d.name}": vieram ${d.topics.length} itens e o ChatGPT contou ${esp} no edital. Confira se algo foi dividido ou repetido.`);
  }
  if (!info.cargo) avisos.push("O JSON não informa o cargo.");

  return {
    ok: true,
    info,
    avisos,
    resumo: { materias: disciplines.length, topicos: total, porMateria: disciplines.map((d) => ({ nome: d.name, topicos: d.topics.length })) },
    parsed: { found: true, confidence: 1, sectionPages: null, disciplines, warnings: avisos },
  };
}
