import { modeOfDiscipline } from "./disciplines";
import type { ParsedDiscipline, ParsedEdital, ParsedTopic } from "./parser";
import { COMANDO_ANALISE, comandoAnaliseParaCargo, secaoDaLinha } from "./analise";
import { titleKey } from "./text";

/**
 * Raio-X do concurso, feito pelo admin num chat externo (ChatGPT) com um comando fixo.
 * O chat devolve TEXTO simples (sem JSON, sem markdown) no modelo do comando; aqui ele é lido, conferido e convertido na mesma
 * estrutura (matérias › tópicos) que o leitor de PDF produz, mais os dados de estratégia (prioridade, incidência, foco, nota de corte).
 * O modelo é o da análise do concurso da PCMG ("ANÁLISE COMPLETA DO EDITAL"), o mesmo lido por analise.ts.
 * Puro: sem banco e sem React (roda no navegador e no servidor).
 */

const MAX_MATERIAS = 60;
const MAX_TOPICOS = 6000;
const MAX_NIVEL = 6;

export interface RaioXMateria { nome: string; questoes: number | null; prioridade: string; incidencia: string; foco: string; estrategia: string; incidenciaTopicos: Array<{ titulo: string; nivel: "ALTA" | "MÉDIA" | "BAIXA" }> }
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

/** O comando é o do raio-x no padrão PCMG (analise.ts); {CARGO} é trocado pelo cargo desejado. */
export const COMANDO_CHATGPT = COMANDO_ANALISE;
export const comandoParaCargo = comandoAnaliseParaCargo;

const sansMd = (l: string): string => l.replace(/\u0000/g, "").replace(/[*_`]{2,3}/g, "").replace(/^\s*#{1,6}\s*/, "").replace(/\s+/g, " ").trim();
const semAcento = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const nuloSeVazio = (s: string): string | null => (s ? s : null);
const ehNaoEncontrado = (s: string): boolean => /^n[ãa]o encontrad/i.test(s.trim());
const RX_ROTULO_CAB = /^(CONCURSO|BANCA|ANO|EDITAL)\s*[:：]\s*(.*)$/i;
const RX_DISC = /^(\d+)\s*[.)]\s+(.+?)\s+[—–-]+\s+(.*quest.*)$/i;
const RX_TOPICO = /^(?:(\d+(?:\.\d+)*)\s*[.)\-–—]?|([a-z])\s*\)|[-•·▪●*]\s*)\s*(.+)$/i;
const RX_NIVEL = /\s*\[(alta|m[ée]dia|media|baixa)\]\s*$/i;
const RX_BLOCO = /^conhecimentos\s+(b[aá]sicos|espec[ií]ficos|gerais)\s*$/i;
const inteiroEm = (s: string): number | null => {
  const m = /\d+/.exec(s.replace(/\./g, ""));
  return m ? Number(m[0]) : null;
};

type Mat = { nome: string; questoes: number | null; prioridade: string; desc: string[]; focos: string[]; estrategia: string[]; incidencia: string[]; topicos: ParsedTopic[]; marcas: RaioXMateria["incidenciaTopicos"] };

/** Lê o texto do raio-x (modelo PCMG), confere e converte para a estrutura do leitor (matérias › tópicos com nível). Erros em português, apontando a disciplina. */
export function validarImportacao(bruto: string): ResultadoImportacao {
  const entrada = bruto.replace(/\u0000/g, "");
  if (entrada.trim().length < 80) return { ok: false, erros: ["Cole aqui a resposta do ChatGPT (o raio-x em texto, do título até a nota de corte)."] };
  if (/^\s*[{[]/.test(entrada) && /"materias"|"topicos"/.test(entrada)) {
    return { ok: false, erros: ["Isto é um JSON do comando antigo. Use o comando atual (Copiar o comando): a resposta agora vem em texto, no modelo “ANÁLISE COMPLETA DO EDITAL”."] };
  }
  const linhas = entrada.split(/\r?\n/).map(sansMd);

  const cab: Record<string, string> = {};
  let titulo = "";
  let secao: string | null = null;
  const vistas = new Set<string>();
  const mats = new Map<string, Mat>();
  const ordem: string[] = [];
  let atual: Mat | null = null;
  let modo: "desc" | "focos" | "estr" | "inc" | "prog" = "desc";
  let nivelNumerico = 0;
  let total = 0;
  const erros: string[] = [];
  const avisos: string[] = [];
  const corte: string[] = [];
  const visao: string[] = [];

  const tratarTopico = (m: Mat, linha: string): void => {
    let l = linha;
    let marca: "ALTA" | "MÉDIA" | "BAIXA" | null = null;
    const nm = RX_NIVEL.exec(l);
    if (nm) {
      const v = semAcento(nm[1]!);
      marca = v === "ALTA" ? "ALTA" : v === "BAIXA" ? "BAIXA" : "MÉDIA";
      l = l.replace(RX_NIVEL, "").trim();
    }
    const t = RX_TOPICO.exec(l);
    let codigo = "";
    let titulo2 = l;
    let nivel = 1;
    if (t) {
      titulo2 = t[3]!.trim();
      if (t[1]) {
        codigo = t[1];
        nivel = codigo.split(".").length;
        nivelNumerico = nivel;
      } else if (t[2]) {
        codigo = `${t[2]})`;
        nivel = nivelNumerico + 1;
      } else nivel = Math.max(1, nivelNumerico + 1);
    }
    if (titulo2.length < 2) return;
    if (nivel > MAX_NIVEL) {
      erros.push(`"${m.nome}": hierarquia funda demais (mais de ${MAX_NIVEL} níveis) em "${titulo2.slice(0, 40)}".`);
      return;
    }
    m.topicos.push({ code: nuloSeVazio(codigo.slice(0, 40)), depth: nivel, title: titulo2.slice(0, 1000), titleKey: titleKey(titulo2), page: 0 });
    total++;
    if (marca) m.marcas.push({ titulo: titulo2.slice(0, 200), nivel: marca });
  };

  for (const l of linhas) {
    if (!l || /^[\u2E3B—–_=\-\s]+$/.test(l)) continue;
    const sec = secaoDaLinha(l);
    // No conteúdo programático, "3. Distribuição de competências" é item; só vale título de seção em MAIÚSCULAS e numerado.
    const bloqueada = secao === "disciplinas" && modo === "prog" && (/[a-zà-ú]/.test(l) || !/^\d+/.test(l));
    if (sec && !vistas.has(sec) && !bloqueada) {
      vistas.add(sec);
      secao = sec;
      atual = null;
      continue;
    }
    if (!secao) {
      const tit = /^an[aá]lise completa do edital\s*[—–:-]+\s*(.+)$/i.exec(l);
      if (tit && !titulo) { titulo = tit[1]!; continue; }
      const r = RX_ROTULO_CAB.exec(l);
      if (r) cab[r[1]!.toUpperCase()] = r[2]!.trim();
      continue;
    }
    if (secao === "estrutura") { visao.push(l); continue; }
    if (secao === "corte") { corte.push(l); continue; }
    if (secao !== "disciplinas") continue;

    const dm = RX_DISC.exec(l);
    if (dm) {
      const nome = dm[2]!.replace(/\s+/g, " ").trim().slice(0, 160);
      const chave = nome.toLocaleLowerCase("pt-BR");
      let m = mats.get(chave);
      if (m) avisos.push(`A disciplina "${nome}" veio em mais de uma parte: os tópicos foram juntados.`);
      else {
        m = { nome, questoes: /n[ãa]o informad/i.test(dm[3]!) ? null : inteiroEm(dm[3]!), prioridade: "", desc: [], focos: [], estrategia: [], incidencia: [], topicos: [], marcas: [] };
        mats.set(chave, m);
        ordem.push(chave);
      }
      atual = m;
      modo = "desc";
      nivelNumerico = 0;
      continue;
    }
    if (RX_BLOCO.test(l)) { atual = null; continue; }
    if (!atual) continue;
    const pr = /^prioridade\s*:\s*(.+)$/i.exec(l);
    if (pr) { atual.prioridade = pr[1]!.trim(); modo = "desc"; continue; }
    const n = semAcento(l);
    if (/^PRINCIPAIS FOCOS|^FOCOS\b/.test(n) && /:$/.test(l)) { modo = "focos"; continue; }
    if (/^ESTRATEGIA\s*:/.test(n)) { modo = "estr"; const resto = l.replace(/^estrat[eé]gia\s*:?\s*/i, ""); if (resto) atual.estrategia.push(resto); continue; }
    if (/^INCIDENCIA\s*:/.test(n)) { modo = "inc"; const resto = l.replace(/^incid[eê]ncia\s*:?\s*/i, ""); if (resto) atual.incidencia.push(resto); continue; }
    if (/^CONTEUDO PROGRAMATICO/.test(n) && /:/.test(l)) {
      modo = "prog";
      const resto = l.replace(/^[^:]*:\s*/, "");
      if (resto) tratarTopico(atual, resto);
      continue;
    }
    if (modo === "prog") tratarTopico(atual, l);
    else if (modo === "focos") { const b = /^[*•·▪‣-]\s+(.+)$/.exec(l); if (b) atual.focos.push(b[1]!.replace(/[.;]\s*$/, "")); }
    else if (modo === "estr") atual.estrategia.push(l);
    else if (modo === "inc") atual.incidencia.push(l);
    else atual.desc.push(l);
  }

  if (!mats.size) {
    return { ok: false, erros: ["Não achei nenhuma disciplina. Cada uma começa com “1. NOME — 10 QUESTÕES” dentro de “2. ANÁLISE POR DISCIPLINA”. Se a resposta foi cortada, peça “continue” e cole tudo junto."] };
  }
  if (mats.size > MAX_MATERIAS) return { ok: false, erros: [`Disciplinas demais (${mats.size}); o limite é ${MAX_MATERIAS}.`] };
  if (total > MAX_TOPICOS) return { ok: false, erros: [`Tópicos demais (mais de ${MAX_TOPICOS}).`] };
  for (const k of ordem) if (!mats.get(k)!.topicos.length) erros.push(`A disciplina "${mats.get(k)!.nome}" não tem o conteúdo programático completo (falta “CONTEÚDO PROGRAMÁTICO COMPLETO:” e os itens).`);
  if (erros.length) return { ok: false, erros: erros.slice(0, 12) };

  const [orgaoT, cargoT] = titulo.split("|").map((x) => x?.replace(/\s+/g, " ").trim() ?? "");
  const campo = (v: string | undefined, max: number): string | null => { const x = (v ?? "").replace(/\s+/g, " ").trim(); return x && !ehNaoEncontrado(x) ? x.slice(0, max) : null; };
  const anoTxt = /\b(19|20)\d{2}\b/.exec(cab.ANO ?? "") ?? /\b(19|20)\d{2}\b/.exec(cab.EDITAL ?? "");
  const ano = anoTxt ? Number(anoTxt[0]) : null;
  const textoCorte = corte.join(" ").replace(/\s+/g, " ").trim();
  const notaCorte = textoCorte && !/^(nota de corte[^:]*:\s*)?n[ãa]o encontrad/i.test(textoCorte) ? textoCorte.slice(0, 2500) : null;
  const materias: RaioXMateria[] = [];
  const disciplines: ParsedDiscipline[] = [];
  for (const k of ordem) {
    const m = mats.get(k)!;
    disciplines.push({ name: m.nome, mode: modeOfDiscipline(m.nome), page: 0, topics: m.topicos });
    const inc = m.incidencia.join(" ").replace(/\s+/g, " ").trim();
    materias.push({ nome: m.nome, questoes: m.questoes, prioridade: m.prioridade.slice(0, 60), incidencia: inc.slice(0, 2500), foco: m.focos.join("\n").slice(0, 2500), estrategia: m.estrategia.join(" ").slice(0, 2500), incidenciaTopicos: m.marcas.slice(0, 200) });
    if (!inc || ehNaoEncontrado(inc)) avisos.push(`"${m.nome}": sem incidência informada.`);
    if (!m.focos.length) avisos.push(`"${m.nome}": sem “Principais focos de preparação”.`);
    if (!m.prioridade) avisos.push(`"${m.nome}": sem PRIORIDADE.`);
    if (m.questoes == null) avisos.push(`"${m.nome}": número de questões não informado.`);
  }
  const info: InfoImportada = {
    nome: campo(cab.CONCURSO, 160),
    orgao: campo(orgaoT, 160),
    cargo: campo(cargoT, 160),
    banca: campo(cab.BANCA, 80),
    ano: ano && ano >= 1990 && ano <= 2100 ? ano : null,
    notaCorte,
    raioX: { notaCorte, resumo: campo(visao.join(" "), 3000), materias },
  };
  if (!info.cargo) avisos.push("O título não informa o cargo (“ANÁLISE COMPLETA DO EDITAL — ÓRGÃO | CARGO”).");
  if (!notaCorte) avisos.push("Sem nota de corte (NÃO ENCONTRADO ou ausente): confira se há como completar.");

  return {
    ok: true,
    info,
    avisos,
    resumo: { materias: disciplines.length, topicos: total, porMateria: disciplines.map((d) => ({ nome: d.name, topicos: d.topics.length })) },
    parsed: { found: true, confidence: 1, sectionPages: null, disciplines, warnings: avisos },
  };
}
