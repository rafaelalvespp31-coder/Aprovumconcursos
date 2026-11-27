import { modeOfDiscipline } from "./disciplines";
import type { ParsedDiscipline, ParsedEdital, ParsedTopic } from "./parser";
import { titleKey } from "./text";

/**
 * Raio-X do concurso, feito pelo admin num chat externo (ChatGPT) com um comando fixo.
 * O chat devolve TEXTO simples (sem JSON, sem markdown) neste modelo; aqui ele é lido, conferido e convertido na mesma
 * estrutura (matérias › tópicos) que o leitor de PDF produz, mais os dados de estratégia (incidência, foco, nota de corte).
 * Puro: sem banco e sem React (roda no navegador e no servidor).
 */

const MAX_MATERIAS = 60;
const MAX_TOPICOS = 6000;
const MAX_NIVEL = 6;

export interface RaioXMateria { nome: string; questoes: number | null; incidencia: string; foco: string; incidenciaTopicos: Array<{ titulo: string; nivel: "ALTA" | "MÉDIA" | "BAIXA" }> }
export interface RaioXExtras { notaCorte: string | null; resumo: string | null; materias: RaioXMateria[] }

export interface InfoImportada {
  nome: string | null;
  orgao: string | null;
  cargo: string | null;
  banca: string | null;
  ano: number | null;
  notaCorte: string | null;
  raioX: RaioXExtras;
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
export const COMANDO_CHATGPT = `Você é um analista sênior de concursos públicos brasileiros. Leia o PDF do edital anexado do início ao fim e faça o RAIO-X COMPLETO do concurso para o cargo: {CARGO}. Se você tiver acesso à internet, pesquise também as provas anteriores da mesma banca e a nota de corte; se não tiver, use apenas o edital e diga o que não foi possível confirmar.

REGRAS (siga todas):
1. Use somente fatos do edital e fontes que você consegue citar. Não invente número de questões, nota de corte, incidência ou numeração. Quando não houver dado confiável, escreva exatamente: NÃO ENCONTRADO.
2. Inclua TODAS as matérias do cargo (conhecimentos básicos, gerais e específicos), na ordem do edital, e TODO o conteúdo programático de cada uma, item por item, na ordem do edital. Não resuma, não agrupe, não pule.
3. Copie cada item do conteúdo programático EXATAMENTE como está no edital (mesmas palavras e pontuação), um item por linha, com a numeração original do edital no começo da linha (1., 1.1, 1.1.1, a), b)…). Se o edital não numerar, numere 1., 2., 3. em sequência.
4. Responda em TEXTO SIMPLES. Proibido JSON, proibido markdown (sem #, sem **, sem tabelas, sem blocos de código). Use apenas os rótulos em MAIÚSCULAS do modelo abaixo, cada um no começo de uma linha.
5. Ignore salários, inscrições, cronograma, requisitos e vagas. Se uma matéria vale só para outro cargo, não a inclua.
6. Em cada matéria, informe em ITENS NO EDITAL quantos itens (tópicos e subtópicos) o edital tem nela, contados por você, para conferência.

MODELO (repita o bloco MATÉRIA para cada matéria):

RAIO-X DO CONCURSO
CONCURSO: nome do concurso
ÓRGÃO: sigla e nome do órgão
CARGO: cargo analisado
BANCA: banca organizadora
ANO: ano do edital
EDITAL: número do edital
NOTA DE CORTE: nota de corte do concurso analisado (e das últimas edições da mesma banca/cargo, se achar), com a nota mínima de aprovação do edital, a pontuação máxima, a fonte e o ano. Se não encontrar: NÃO ENCONTRADO.
VISÃO GERAL: 1 ou 2 parágrafos com a estrutura da prova (número de questões, blocos, pesos, nota mínima por bloco, eliminações) e a leitura estratégica geral.

MATÉRIA 1: NOME DA MATÉRIA
QUESTÕES: número de questões da matéria na prova (só o número; NÃO ENCONTRADO se o edital não informar)
INCIDÊNCIA: o peso da matéria na prova e os assuntos que a banca mais cobrou nas provas anteriores, do mais ao menos cobrado, com percentuais quando houver dado confiável.
O QUE FOCAR: os pontos prioritários de estudo, na ordem de prioridade, e o que pode ficar para depois.
ITENS NO EDITAL: número
CONTEÚDO PROGRAMÁTICO:
1. Título exato do item
1.1 Título exato do subitem
1.1.1 Título exato do sub-subitem
a) Título exato

Se quiser marcar a incidência de um item do conteúdo, ponha no fim da linha [ALTA], [MÉDIA] ou [BAIXA]. Marque só os itens em que houver dado ou critério real e deixe os demais sem marcação.

MATÉRIA 2: …
(e assim por diante, até a última matéria)

Se a resposta ficar grande demais e for cortada, pare no fim de uma linha completa; eu peço "continue". Na continuação, retome do ponto exato, sem repetir o que já enviou, e escreva o rótulo MATÉRIA n: NOME antes dos itens (para eu saber a qual matéria pertencem).`;

export const comandoParaCargo = (cargo: string): string => COMANDO_CHATGPT.replace("{CARGO}", cargo.trim() || "(informe o cargo)");

const ROTULOS_CAB = ["CONCURSO", "ÓRGÃO", "ORGÃO", "ORGAO", "CARGO", "BANCA", "ANO", "EDITAL", "NOTA DE CORTE", "VISÃO GERAL", "VISAO GERAL"] as const;
const ROTULOS_MAT = ["QUESTÕES", "QUESTOES", "INCIDÊNCIA", "INCIDENCIA", "O QUE FOCAR", "ITENS NO EDITAL", "CONTEÚDO PROGRAMÁTICO", "CONTEUDO PROGRAMATICO"] as const;

const sansMd = (l: string): string => l.replace(/\u0000/g, "").replace(/[*_`]{1,3}/g, "").replace(/^\s*#{1,6}\s*/, "").replace(/\s+/g, " ").trim();
const semAcento = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const nuloSeVazio = (s: string): string | null => (s ? s : null);
const ehNaoEncontrado = (s: string): boolean => /^n[ãa]o encontrad/i.test(s.trim());

/** "ROTULO: valor" no começo da linha (aceita "Rótulo - valor"); devolve o rótulo normalizado e o resto. */
function rotulo(linha: string, lista: readonly string[]): { chave: string; valor: string } | null {
  const m = /^([A-Za-zÀ-ÿ ]{3,32}?)\s*[:：]\s*(.*)$/.exec(linha);
  if (!m) return null;
  const nome = semAcento(m[1]!.trim());
  const achado = lista.find((r) => semAcento(r) === nome);
  return achado ? { chave: semAcento(achado), valor: m[2]!.trim() } : null;
}

const CAB = ROTULOS_CAB;
const RX_MATERIA = /^mat[ée]ria\s*(\d{1,3})?\s*[:.\-–—)]\s*(.+)$/i;
const RX_TOPICO = /^(?:(\d+(?:\.\d+)*)\s*[.)\-–—]?|([a-z])\s*\)|[-•·▪●]\s*)\s*(.+)$/i;
const RX_NIVEL = /\s*\[(alta|m[ée]dia|media|baixa)\]\s*$/i;

function inteiroEm(s: string): number | null {
  const m = /\d+/.exec(s.replace(/\./g, ""));
  return m ? Number(m[0]) : null;
}

/** Lê o texto do raio-x, confere e converte para a estrutura do leitor (matérias › tópicos com nível). Erros em português, apontando a matéria. */
export function validarImportacao(bruto: string): ResultadoImportacao {
  const entrada = bruto.replace(/\u0000/g, "");
  if (entrada.trim().length < 40) return { ok: false, erros: ["Cole aqui a resposta do ChatGPT (o raio-x em texto)."] };
  if (/^\s*[{[]/.test(entrada) && /"materias"|"topicos"/.test(entrada)) {
    return { ok: false, erros: ["Isto é um JSON do comando antigo. Use o comando atual (Copiar o comando): a resposta agora vem em texto, com MATÉRIA 1:, QUESTÕES:, CONTEÚDO PROGRAMÁTICO: …"] };
  }
  const linhas = entrada.split(/\r?\n/).map(sansMd);

  const cab: Record<string, string> = {};
  let secao: { tipo: "cab"; chave: string } | { tipo: "mat" } | null = null;
  type Mat = { nome: string; questoes: number | null; incidencia: string[]; foco: string[]; esperado: number | null; topicos: ParsedTopic[]; marcas: RaioXMateria["incidenciaTopicos"]; sub: "inc" | "foco" | "prog" | null };
  const mats = new Map<string, Mat>();
  const ordem: string[] = [];
  let atual: Mat | null = null;
  let nivelNumerico = 0;
  let total = 0;
  const erros: string[] = [];
  const avisos: string[] = [];
  const cabLinhas: Record<string, string[]> = {};

  for (const l of linhas) {
    if (!l) continue;
    if (/^raio.?x\b/i.test(l) && !atual) continue;
    const mm = RX_MATERIA.exec(l);
    if (mm) {
      const nome = mm[2]!.replace(/\s+/g, " ").trim().slice(0, 160);
      if (nome.length >= 2) {
        const chave = nome.toLocaleLowerCase("pt-BR");
        let m = mats.get(chave);
        if (m) avisos.push(`A matéria "${nome}" veio em mais de uma parte: os tópicos foram juntados.`);
        else {
          m = { nome, questoes: null, incidencia: [], foco: [], esperado: null, topicos: [], marcas: [], sub: null };
          mats.set(chave, m);
          ordem.push(chave);
        }
        atual = m;
        secao = { tipo: "mat" };
        nivelNumerico = 0;
        continue;
      }
    }
    if (!atual) {
      const r = rotulo(l, CAB);
      if (r) {
        const k = r.chave === "ORGAO" ? "ÓRGÃO" : r.chave === "VISAO GERAL" ? "VISÃO GERAL" : r.chave === "ORGÃO" ? "ÓRGÃO" : r.chave;
        secao = { tipo: "cab", chave: k };
        cabLinhas[k] = r.valor ? [r.valor] : [];
        continue;
      }
      if (secao?.tipo === "cab") (cabLinhas[secao.chave] ??= []).push(l);
      continue;
    }
    // dentro de uma matéria
    const r = rotulo(l, ROTULOS_MAT);
    if (r) {
      const k = semAcento(r.chave);
      if (k.startsWith("QUESTOES")) { atual.questoes = ehNaoEncontrado(r.valor) ? null : inteiroEm(r.valor); atual.sub = null; }
      else if (k.startsWith("INCIDENCIA")) { atual.sub = "inc"; if (r.valor) atual.incidencia.push(r.valor); }
      else if (k.startsWith("O QUE FOCAR")) { atual.sub = "foco"; if (r.valor) atual.foco.push(r.valor); }
      else if (k.startsWith("ITENS")) { atual.esperado = inteiroEm(r.valor); atual.sub = null; }
      else { atual.sub = "prog"; if (r.valor) tratarTopico(atual, r.valor); }
      continue;
    }
    const cabRotulo = rotulo(l, CAB);
    if (cabRotulo && atual.sub !== "prog") continue;
    if (atual.sub === "inc") atual.incidencia.push(l);
    else if (atual.sub === "foco") atual.foco.push(l);
    else if (atual.sub === "prog") tratarTopico(atual, l);
  }

  function tratarTopico(m: Mat, linha: string): void {
    let l = linha;
    let nivelMarca: "ALTA" | "MÉDIA" | "BAIXA" | null = null;
    const nm = RX_NIVEL.exec(l);
    if (nm) {
      const v = semAcento(nm[1]!);
      nivelMarca = v === "ALTA" ? "ALTA" : v === "BAIXA" ? "BAIXA" : "MÉDIA";
      l = l.replace(RX_NIVEL, "").trim();
    }
    const t = RX_TOPICO.exec(l);
    let codigo = "";
    let titulo = l;
    let nivel = 1;
    if (t) {
      titulo = t[3]!.trim();
      if (t[1]) {
        codigo = t[1];
        nivel = Math.min(MAX_NIVEL + 1, codigo.split(".").length);
        nivelNumerico = nivel;
      } else if (t[2]) {
        codigo = `${t[2]})`;
        nivel = Math.min(MAX_NIVEL + 1, nivelNumerico + 1);
      } else nivel = Math.min(MAX_NIVEL + 1, Math.max(1, nivelNumerico + 1));
    }
    if (titulo.length < 2) return;
    if (nivel > MAX_NIVEL) { erros.push(`"${m.nome}": hierarquia funda demais (mais de ${MAX_NIVEL} níveis) em "${titulo.slice(0, 40)}".`); return; }
    m.topicos.push({ code: nuloSeVazio(codigo.slice(0, 40)), depth: nivel, title: titulo.slice(0, 1000), titleKey: titleKey(titulo), page: 0 });
    total++;
    if (nivelMarca) m.marcas.push({ titulo: titulo.slice(0, 200), nivel: nivelMarca });
  }

  if (!mats.size) {
    return { ok: false, erros: ["Não achei nenhuma matéria. Cada matéria começa com “MATÉRIA 1: NOME” numa linha própria. Se a resposta foi cortada, peça “continue” e cole tudo junto."] };
  }
  if (mats.size > MAX_MATERIAS) return { ok: false, erros: [`Matérias demais (${mats.size}); o limite é ${MAX_MATERIAS}.`] };
  if (total > MAX_TOPICOS) return { ok: false, erros: [`Tópicos demais (mais de ${MAX_TOPICOS}).`] };
  for (const k of ordem) if (!mats.get(k)!.topicos.length) erros.push(`A matéria "${mats.get(k)!.nome}" não tem conteúdo programático (falta a linha “CONTEÚDO PROGRAMÁTICO:” e os itens).`);
  if (erros.length) return { ok: false, erros: erros.slice(0, 12) };

  const juntar = (k: string): string => (cabLinhas[k] ?? []).join(" ").replace(/\s+/g, " ").trim();
  const campo = (k: string, max: number): string | null => { const v = juntar(k); return v && !ehNaoEncontrado(v) ? v.slice(0, max) : null; };
  const anoTxt = /\b(19|20)\d{2}\b/.exec(juntar("ANO"));
  const ano = anoTxt ? Number(anoTxt[0]) : null;
  const notaCorte = campo("NOTA DE CORTE", 1500);
  const materias: RaioXMateria[] = [];
  const disciplines: ParsedDiscipline[] = [];
  for (const k of ordem) {
    const m = mats.get(k)!;
    disciplines.push({ name: m.nome, mode: modeOfDiscipline(m.nome), page: 0, topics: m.topicos });
    const inc = m.incidencia.join(" ").replace(/\s+/g, " ").trim();
    const foco = m.foco.join("\n").trim();
    materias.push({ nome: m.nome, questoes: m.questoes, incidencia: inc.slice(0, 2500), foco: foco.slice(0, 2500), incidenciaTopicos: m.marcas.slice(0, 200) });
    if (m.esperado && m.topicos.length < m.esperado) avisos.push(`"${m.nome}": o ChatGPT contou ${m.esperado} itens no edital, mas vieram ${m.topicos.length}. Pode ter faltado conteúdo.`);
    if (m.esperado && m.topicos.length > m.esperado) avisos.push(`"${m.nome}": vieram ${m.topicos.length} itens e o ChatGPT contou ${m.esperado} no edital. Confira se algo foi dividido ou repetido.`);
    if (!inc || ehNaoEncontrado(inc)) avisos.push(`"${m.nome}": sem incidência informada.`);
    if (!foco) avisos.push(`"${m.nome}": sem “O QUE FOCAR”.`);
  }
  const info: InfoImportada = {
    nome: campo("CONCURSO", 160),
    orgao: campo("ÓRGÃO", 160),
    cargo: campo("CARGO", 160),
    banca: campo("BANCA", 80),
    ano: ano && ano >= 1990 && ano <= 2100 ? ano : null,
    notaCorte,
    raioX: { notaCorte, resumo: campo("VISÃO GERAL", 3000), materias },
  };
  if (!info.cargo) avisos.push("O texto não informa o cargo.");
  if (!notaCorte) avisos.push("Sem nota de corte (NÃO ENCONTRADO ou ausente): confira se há como completar.");

  return {
    ok: true,
    info,
    avisos,
    resumo: { materias: disciplines.length, topicos: total, porMateria: disciplines.map((d) => ({ nome: d.name, topicos: d.topics.length })) },
    parsed: { found: true, confidence: 1, sectionPages: null, disciplines, warnings: avisos },
  };
}
