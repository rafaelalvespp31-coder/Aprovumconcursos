import { fold } from "@/domain/edital/text";

/**
 * Formato de texto (colado do ChatGPT) → mesma estrutura da importação JSON. Uma linha por registro:
 *   CONCURSO: nome | ÓRGÃO: x | CARGOS: a; b | LIMITAÇÕES: texto
 *   FONTE: chave | tipo | nome | url | página | órgão | publicado | consultado | conferido por
 *   PROVA: ano | banca | total de questões | regra de contagem
 *   NOTA: cargo | modalidade | etapa | tipo | nota | máximo | candidatos | critério | fonte | página | verificado
 *   DISCIPLINA: nome | questões | anuladas
 *   ASSUNTO: título | questões | anuladas
 *   FOCO: prioridade | disciplina | assunto | justificativa
 */

export interface TextIssue { line: number; message: string }

const KW: Record<string, string> = {
  concurso: "concurso", orgao: "orgao", cargos: "cargos", cargo: "cargos", limitacoes: "limitacoes", limitacao: "limitacoes",
  fonte: "fonte", prova: "prova", nota: "nota", disciplina: "disciplina", assunto: "assunto", foco: "foco",
};

const nul = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return !t || /^(-|—|–|n\/?a|nao localizado|não localizado|nao informado|não informado|null)$/i.test(t) ? null : t;
};
const num = (v: string | undefined): number | null => {
  const t = nul(v);
  if (t === null) return null;
  if (!/\d/.test(t)) return NaN;
  const n = Number(t.replace(/\./g, (m, i, s) => (/,/.test(s) ? "" : m)).replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const int = (v: string | undefined) => { const n = num(v); return n === null ? null : Number.isNaN(n) ? NaN : Math.round(n); };
const date = (v: string | undefined) => {
  const t = nul(v);
  if (!t) return null;
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}` : t;
};
const pick = <T extends string>(v: string | undefined, map: Array<[RegExp, T]>, fallback: T | null): T | null => {
  const f = fold(nul(v) ?? "");
  for (const [re, val] of map) if (re.test(f)) return val;
  return fallback;
};
const KIND: Array<[RegExp, string]> = [
  [/minima|aprovacao/, "minima_aprovacao"], [/1\s*fase|primeira|corte/, "corte_primeira_fase"], [/classificado/, "ultimo_classificado"],
  [/convocado|nomeado/, "ultimo_convocado"], [/vaga|dentro/, "ultimo_dentro_vagas"],
];
const MOD: Array<[RegExp, string]> = [[/ampla|geral/, "ampla"], [/pcd|defici/, "pcd"], [/negro|preto|pardo|racia/, "negros"], [/indigen/, "indigenas"], [/quilomb/, "quilombolas"], [/outra|outro/, "outra"]];
const SRC: Array<[RegExp, string]> = [[/oficial/, "oficial"], [/extra/, "extraido"], [/propri|analise/, "propria"]];
const PRIO: Array<[RegExp, string]> = [[/maxim/, "maxima"], [/alta/, "alta"], [/complement/, "complementar"]];

export function parseStrategicText(text: string): { data: unknown | null; issues: TextIssue[] } {
  const issues: TextIssue[] = [];
  const bad = (line: number, message: string) => issues.push({ line, message });
  const out: Record<string, unknown> & { exam: { name: string; organ: string | null }; positions: string[]; sources: unknown[]; editions: Array<Record<string, unknown>>; recommendations: unknown[]; limitations: string | null } = {
    exam: { name: "", organ: null }, positions: [], limitations: null, sources: [], editions: [], recommendations: [],
  };
  let ed: (typeof out.editions)[number] | null = null;
  let subj: { topics: unknown[] } | null = null;

  text.replace(/\r/g, "").split("\n").forEach((raw, i) => {
    const ln = i + 1;
    const line = raw.replace(/^[\s>*\-•#`]+/, "").replace(/\*\*/g, "").trim();
    if (!line) return;
    const m = line.match(/^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/);
    const key = m ? KW[fold(m[1]!)] : undefined;
    if (!key) return; // comentários e texto solto são ignorados
    const f = m![2]!.split("|").map((x) => x.trim());
    switch (key) {
      case "concurso": out.exam.name = f[0] ?? ""; if (f[1]) out.exam.organ = nul(f[1]); break;
      case "orgao": out.exam.organ = nul(f[0]); break;
      case "cargos": out.positions = (m![2] ?? "").split(/[;|]/).map((x) => x.trim()).filter(Boolean); break;
      case "limitacoes": out.limitations = nul(m![2]); break;
      case "fonte": {
        const s = { key: f[0] ?? "", kind: pick(f[1], SRC, "oficial"), name: f[2] ?? "", url: nul(f[3]), page: int(f[4]), organ: nul(f[5]), publishedAt: date(f[6]), consultedAt: date(f[7]), reviewer: nul(f[8]), notes: null };
        if (!s.key || !s.name) bad(ln, "FONTE precisa de: chave | tipo | nome ...");
        if (s.page !== null && Number.isNaN(s.page)) { bad(ln, "Página da fonte inválida."); s.page = null; }
        out.sources.push(s);
        break;
      }
      case "prova": {
        const year = int(f[0]);
        if (year === null || Number.isNaN(year)) { bad(ln, "PROVA precisa começar com o ano (ex.: PROVA: 2025 | Banca | 60 | regra)."); break; }
        const total = int(f[2]);
        ed = { year, board: nul(f[1]), totalQuestions: total !== null && !Number.isNaN(total) ? total : null, countingRule: nul(f[3]), notes: null, cutoffs: [], subjects: [] };
        out.editions.push(ed);
        subj = null;
        break;
      }
      case "nota": {
        if (!ed) { bad(ln, "NOTA deve vir depois de uma linha PROVA."); break; }
        const kind = pick(f[3], KIND, null);
        const score = num(f[4]);
        if (!kind) { bad(ln, `Tipo de nota não reconhecido: "${f[3] ?? ""}".`); break; }
        if (score === null || Number.isNaN(score)) { bad(ln, "Nota inválida ou não localizada."); break; }
        const max = num(f[5]); const cand = int(f[6]); const pg = int(f[9]);
        (ed.cutoffs as unknown[]).push({ position: nul(f[0]), modality: pick(f[1], MOD, "ampla"), stage: nul(f[2]), kind, score, maxScore: max === null || Number.isNaN(max) ? null : max, candidates: cand === null || Number.isNaN(cand) ? null : cand, criterion: nul(f[7]), sourceKey: nul(f[8]), sourcePage: pg === null || Number.isNaN(pg) ? null : pg, verifiedAt: date(f[10]) });
        break;
      }
      case "disciplina": {
        if (!ed) { bad(ln, "DISCIPLINA deve vir depois de uma linha PROVA."); break; }
        const q = int(f[1]);
        if (q === null || Number.isNaN(q)) { bad(ln, `Quantidade de questões inválida em "${f[0] ?? ""}".`); subj = null; break; }
        const a = int(f[2]);
        subj = { name: f[0] ?? "", questions: q, annulled: a === null || Number.isNaN(a) ? 0 : a, topics: [] } as never;
        (ed.subjects as unknown[]).push(subj);
        break;
      }
      case "assunto": {
        if (!subj) { bad(ln, "ASSUNTO deve vir depois de uma linha DISCIPLINA."); break; }
        const q = int(f[1]);
        if (q === null || Number.isNaN(q)) { bad(ln, `Quantidade de questões inválida no assunto "${f[0] ?? ""}".`); break; }
        const a = int(f[2]);
        subj.topics.push({ title: f[0] ?? "", questions: q, annulled: a === null || Number.isNaN(a) ? 0 : a });
        break;
      }
      case "foco": {
        const priority = pick(f[0], PRIO, null);
        if (!priority || !f[2] || !f[3]) { bad(ln, "FOCO precisa de: prioridade | disciplina | assunto | justificativa."); break; }
        out.recommendations.push({ priority, subject: nul(f[1]), topic: f[2], justification: f[3] });
        break;
      }
    }
  });
  if (!out.exam.name) bad(0, "Linha CONCURSO: ... não encontrada.");
  if (!out.editions.length) bad(0, "Nenhuma linha PROVA: ... encontrada.");
  return { data: issues.length && (!out.exam.name || !out.editions.length) ? null : out, issues };
}

export const IMPORT_EXAMPLE_TEXT = `CONCURSO: Polícia Penal do Estado do Espírito Santo | SEJUS-ES
CARGOS: Policial Penal
LIMITAÇÕES: Análise baseada somente nas duas últimas provas localizadas.

FONTE: res-2025 | OFICIAL | Resultado da prova objetiva | https://exemplo.gov.br/resultado.pdf | 3 | Banca X | 10/05/2025 | 06/11/2026 | Nome do revisor
FONTE: ana-2025 | PROPRIA | Classificação dos assuntos das questões (análise própria) | - | - | - | - | 06/11/2026 | -

PROVA: 2025 | Banca X | 60 | Questões anuladas pontuam para todos
NOTA: Policial Penal | AMPLA | Prova objetiva | CORTE_1FASE | 38 | 60 | 5000 | Mínimo de 50% e classificação até 5x vagas | res-2025 | 3 | 06/11/2026
DISCIPLINA: Direito Penal | 10 | 0
ASSUNTO: Crimes contra a Administração Pública | 3 | 0
ASSUNTO: Teoria do crime | 2 | 0

FOCO: MAXIMA | Direito Penal | Crimes contra a Administração Pública | Cobrado em todas as provas analisadas.`;

/** Comando para colar no ChatGPT: gera a análise exatamente no formato que parseStrategicText entende. */
export const CHATGPT_STRATEGIC_PROMPT = `Você é um analista de concursos públicos. Faça a ANÁLISE ESTRATÉGICA do concurso abaixo para eu importar no meu sistema.

CONCURSO: [nome do concurso]
ÓRGÃO: [órgão]
CARGO(S): [cargo]
PROVAS A ANALISAR: [ex.: as 2 ou 3 últimas provas objetivas]

REGRAS OBRIGATÓRIAS
1. NUNCA invente números. Questões por disciplina/assunto e notas de corte só com base em fonte que você consiga indicar (edital, resultado, prova, gabarito). Se não localizar, escreva "-" no campo ou omita a linha.
2. A classificação das questões por assunto é análise própria: registre como FONTE do tipo PROPRIA.
3. Toda linha NOTA precisa apontar a chave de uma FONTE que exista.
4. A soma das DISCIPLINAS não pode passar do total de questões da PROVA, e a soma dos ASSUNTOS não pode passar das questões da DISCIPLINA.
5. Datas em DD/MM/AAAA. Separe campos com " | " (barra vertical).
6. Responda SOMENTE com as linhas no formato abaixo, em texto puro: sem markdown, sem tabelas, sem comentários antes ou depois.

FORMATO (uma linha por registro, nesta ordem)
CONCURSO: nome | órgão
CARGOS: cargo 1; cargo 2
LIMITAÇÕES: o que a análise não cobre ou não conseguiu confirmar
FONTE: chave | OFICIAL, EXTRAIDO ou PROPRIA | nome do documento | url | página | órgão/banca | data de publicação | data de consulta | conferido por

Para CADA prova, repita o bloco:
PROVA: ano | banca | total de questões | regra de contagem (ex.: anuladas pontuam para todos)
NOTA: cargo | AMPLA, PCD ou NEGROS | etapa | MINIMA_APROVACAO, CORTE_1FASE, ULTIMO_CLASSIFICADO, ULTIMO_CONVOCADO ou ULTIMO_DENTRO_VAGAS | nota | nota máxima | nº de candidatos | critério | chave da fonte | página | data da verificação
DISCIPLINA: nome | nº de questões | nº de anuladas
ASSUNTO: título do assunto | nº de questões | nº de anuladas
(cada DISCIPLINA seguida dos seus ASSUNTOS)

No final, as recomendações de estudo:
FOCO: MAXIMA, ALTA ou COMPLEMENTAR | disciplina | assunto | justificativa curta baseada na incidência

EXEMPLO DE SAÍDA
${IMPORT_EXAMPLE_TEXT}`;
