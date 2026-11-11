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

export interface TextIssue { line: number; message: string; level?: "erro" | "aviso" }

const KW: Record<string, string> = {
  concurso: "concurso", orgao: "orgao", cargos: "cargos", cargo: "cargos", limitacoes: "limitacoes", limitacao: "limitacoes",
  fonte: "fonte", fontes: "fonte", prova: "prova", edicao: "prova", nota: "nota", disciplina: "disciplina", materia: "disciplina", assunto: "assunto", topico: "assunto", foco: "foco",
};

const nul = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return !t || /^(-|—|–|n\/?a|nao localizado|não localizado|nao informado|não informado|null|\?|sem dados|desconhecido)$/i.test(t) ? null : t;
};
const num = (v: string | undefined): number | null => {
  const t = nul(v);
  if (t === null) return null;
  const m = t.match(/-?\d[\d.,]*/); // pega o primeiro número ("12 questões", "≈ 8", "38,5 pts")
  if (!m) return NaN;
  let s = m[0];
  if (/,/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};
const int = (v: string | undefined) => { const n = num(v); return n === null ? null : Number.isNaN(n) ? NaN : Math.round(n); };
const ok = (n: number | null) => (n === null || Number.isNaN(n) ? null : n);
const date = (v: string | undefined) => {
  const t = nul(v);
  if (!t) return null;
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
};
const pick = <T extends string>(v: string | undefined, map: Array<[RegExp, T]>, fallback: T | null): T | null => {
  const f = fold(nul(v) ?? "");
  for (const [re, val] of map) if (re.test(f)) return val;
  return fallback;
};
const KIND: Array<[RegExp, string]> = [
  [/minima|aprovacao/, "minima_aprovacao"], [/1\s*.?\s*fase|primeira|corte/, "corte_primeira_fase"], [/classificado/, "ultimo_classificado"],
  [/convocado|nomeado/, "ultimo_convocado"], [/vaga|dentro/, "ultimo_dentro_vagas"],
];
const MOD: Array<[RegExp, string]> = [[/ampla|geral/, "ampla"], [/pcd|defici/, "pcd"], [/negro|preto|pardo|racia/, "negros"], [/indigen/, "indigenas"], [/quilomb/, "quilombolas"], [/outra|outro/, "outra"]];
const SRC: Array<[RegExp, string]> = [[/oficial/, "oficial"], [/extra/, "extraido"], [/propri|analise/, "propria"]];
const PRIO: Array<[RegExp, string]> = [[/maxim|altissim|muito alta/, "maxima"], [/alta/, "alta"], [/complement|media|baixa|moderad/, "complementar"]];

/**
 * Lê o texto e CONSERTA o que for possível (cada conserto vira aviso). Só é erro a ausência de CONCURSO ou de PROVA.
 * Quantidade não informada vira 0 (com aviso); linha fora de ordem é encaixada; nota ilegível é ignorada.
 */
export function parseStrategicText(text: string): { data: unknown | null; issues: TextIssue[] } {
  const issues: TextIssue[] = [];
  const warn = (line: number, message: string) => issues.push({ line, message, level: "aviso" });
  const out: Record<string, unknown> & { exam: { name: string; organ: string | null }; positions: string[]; sources: Array<Record<string, unknown>>; editions: Array<Record<string, unknown>>; recommendations: unknown[]; limitations: string | null } = {
    exam: { name: "", organ: null }, positions: [], limitations: null, sources: [], editions: [], recommendations: [],
  };
  let ed: (typeof out.editions)[number] | null = null;
  let subj: { name: string; questions: number | null; annulled: number; topics: Array<{ title: string; questions: number; annulled: number }> } | null = null;
  const subjectsOf = (e: Record<string, unknown>) => e.subjects as Array<NonNullable<typeof subj>>;

  text.replace(/\r/g, "").split("\n").forEach((raw, i) => {
    const ln = i + 1;
    const line = raw.replace(/^[\s>*\-•#`\d.)]+(?=[A-Za-zÀ-ÿ])/, "").replace(/\*\*|`/g, "").trim();
    if (!line) return;
    const m = line.match(/^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/);
    const key = m ? KW[fold(m[1]!)] : undefined;
    if (!key) return; // comentários e texto solto são ignorados
    const f = m![2]!.split("|").map((x) => x.trim());
    switch (key) {
      case "concurso": out.exam.name = f[0] ?? ""; if (f[1]) out.exam.organ = nul(f[1]); break;
      case "orgao": out.exam.organ = nul(f[0]); break;
      case "cargos": out.positions = (m![2] ?? "").split(/[;|]/).map((x) => x.trim()).filter((x) => nul(x)); break;
      case "limitacoes": out.limitations = nul(m![2]); break;
      case "fonte": {
        let k = nul(f[0]) ?? `fonte-${out.sources.length + 1}`;
        const name = nul(f[2]) ?? nul(f[0]) ?? k;
        if (!nul(f[0])) warn(ln, `Fonte sem chave: usei "${k}".`);
        if (out.sources.some((s) => s.key === k)) { k = `${k}-${out.sources.length + 1}`; warn(ln, `Chave de fonte repetida: renomeei para "${k}".`); }
        const page = ok(int(f[4]));
        out.sources.push({ key: k, kind: pick(f[1], SRC, "oficial"), name, url: nul(f[3]), page: page && page >= 1 ? page : null, organ: nul(f[5]), publishedAt: date(f[6]), consultedAt: date(f[7]), reviewer: nul(f[8]), notes: null });
        break;
      }
      case "prova": {
        let year = ok(int(f[0]));
        if (year === null || year < 1990 || year > 2100) {
          const y = (m![2] ?? "").match(/\b(19[9]\d|20\d\d)\b/);
          if (!y) { warn(ln, "PROVA sem ano reconhecível: linha ignorada (as linhas abaixo dela também)."); ed = null; subj = null; break; }
          year = Number(y[1]);
          warn(ln, `Ano da PROVA ajustado para ${year}.`);
        }
        const total = ok(int(f[2]));
        ed = { year, board: nul(f[1]), totalQuestions: total && total >= 1 ? total : null, countingRule: nul(f[3]), notes: null, cutoffs: [], subjects: [] };
        out.editions.push(ed);
        subj = null;
        break;
      }
      case "nota": {
        if (!ed) { warn(ln, "NOTA antes de qualquer PROVA: ignorada."); break; }
        const kind = pick(f[3], KIND, "corte_primeira_fase");
        const score = ok(num(f[4]));
        if (score === null || score < 0) { warn(ln, "NOTA sem valor numérico: ignorada."); break; }
        if (!pick(f[3], KIND, null)) warn(ln, `Tipo de nota "${f[3] ?? ""}" não reconhecido: gravei como corte da 1ª fase.`);
        const max = ok(num(f[5])); const cand = ok(int(f[6])); const pg = ok(int(f[9]));
        (ed.cutoffs as unknown[]).push({ position: nul(f[0]), modality: pick(f[1], MOD, "ampla"), stage: nul(f[2]), kind, score, maxScore: max, candidates: cand !== null && cand >= 0 ? cand : null, criterion: nul(f[7]), sourceKey: nul(f[8]), sourcePage: pg && pg >= 1 ? pg : null, verifiedAt: date(f[10]) });
        break;
      }
      case "disciplina": {
        if (!ed) { warn(ln, "DISCIPLINA antes de qualquer PROVA: ignorada."); subj = null; break; }
        const name = nul(f[0]) ?? "Disciplina sem nome";
        const q = ok(int(f[1]));
        if (q === null) warn(ln, `Disciplina "${name}" sem quantidade de questões: usei a soma dos assuntos (ou 0).`);
        subj = { name, questions: q !== null && q >= 0 ? q : null, annulled: Math.max(0, ok(int(f[2])) ?? 0), topics: [] };
        subjectsOf(ed).push(subj);
        break;
      }
      case "assunto": {
        if (!ed) { warn(ln, "ASSUNTO antes de qualquer PROVA: ignorado."); break; }
        const title = nul(f[0]);
        if (!title) { warn(ln, "ASSUNTO sem título: ignorado."); break; }
        if (!subj) {
          subj = { name: "Geral", questions: null, annulled: 0, topics: [] };
          subjectsOf(ed).push(subj);
          warn(ln, `Assunto "${title}" sem DISCIPLINA antes: coloquei em "Geral".`);
        }
        const q = ok(int(f[1]));
        if (q === null) warn(ln, `Assunto "${title}" sem quantidade de questões: gravado como 0.`);
        subj.topics.push({ title, questions: q !== null && q >= 0 ? q : 0, annulled: Math.max(0, ok(int(f[2])) ?? 0) });
        break;
      }
      case "foco": {
        const subject = nul(f[1]);
        const topic = nul(f[2]) ?? subject;
        if (!topic) { warn(ln, "FOCO sem disciplina nem assunto: ignorado."); break; }
        if (!pick(f[0], PRIO, null)) warn(ln, `Prioridade "${f[0] ?? ""}" não reconhecida: usei ALTA.`);
        out.recommendations.push({ priority: pick(f[0], PRIO, "alta"), subject, topic, justification: nul(f.slice(3).join(" | ")) ?? "Sem justificativa informada." });
        break;
      }
    }
  });
  // Disciplina sem quantidade: soma dos assuntos.
  for (const e of out.editions) for (const s of subjectsOf(e)) if (s.questions === null) s.questions = s.topics.reduce((n, t) => n + t.questions, 0);
  if (!out.exam.name) issues.push({ line: 0, message: "Linha CONCURSO: ... não encontrada.", level: "erro" });
  if (!out.editions.length) issues.push({ line: 0, message: "Nenhuma linha PROVA: ... válida encontrada.", level: "erro" });
  return { data: !out.exam.name || !out.editions.length ? null : out, issues };
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

export interface PromptInfo { name?: string | null; organ?: string | null; role?: string | null; board?: string | null; year?: number | null; program?: string | null }

/**
 * Comando para colar no chat (ChatGPT, Claude…): a IA analisa as provas e devolve SÓ as linhas que parseStrategicText entende.
 * Com info, já vem preenchido com o concurso do edital do aluno.
 */
export function buildStrategicPrompt(info: PromptInfo = {}): string {
  const v = (x: string | number | null | undefined, ph: string) => (x === null || x === undefined || x === "" ? ph : String(x));
  const head = `CONCURSO: ${v(info.name, "[nome do concurso]")}${info.name ? " (use exatamente este nome na linha CONCURSO)" : ""}
ÓRGÃO: ${v(info.organ, "[órgão]")}
CARGO(S): ${v(info.role, "[cargo]")}
BANCA DO EDITAL ATUAL: ${v(info.board, "[banca, se souber]")}
ANO DO EDITAL ATUAL: ${v(info.year, "[ano]")}
PROVAS A ANALISAR: [ex.: as 2 ou 3 últimas provas objetivas do mesmo cargo]${info.program ? `

CONTEÚDO PROGRAMÁTICO EXTRAÍDO DO EDITAL ATUAL (use estes nomes de disciplinas e assuntos sempre que corresponderem):
${info.program}` : ""}`;
  return `# PAPEL
Você é um analista de provas de concursos públicos. Sua tarefa é catalogar o RAIO-X do concurso abaixo, no formato exato que o sistema APROVUM importa. Não é para explicar nem resumir: é para devolver dados.

# CONCURSO
${head}

# O QUE FAZER (siga nesta ordem)
1. Localize as provas e os resultados do concurso (use os arquivos que eu anexei; se não houver anexo, pesquise nas fontes oficiais da banca e do órgão).
2. Para cada prova, conte quantas questões cada DISCIPLINA tem.
3. Dentro de cada disciplina, classifique cada questão em um ASSUNTO e conte quantas questões cada assunto teve.
4. Localize as notas de corte (mínima de aprovação, corte da 1ª fase, último classificado etc.) com a fonte de cada uma.
5. Monte as recomendações de estudo (FOCO) a partir da incidência real dos assuntos.
6. Confira as regras de validação abaixo e só então responda.

# REGRAS OBRIGATÓRIAS
- NUNCA invente números. Questões e notas só com base em fonte que você consiga indicar (edital, resultado, prova, gabarito).
- Em DISCIPLINA e ASSUNTO, o número de questões é OBRIGATÓRIO e deve ser inteiro (nunca "-", "?" ou texto). Se não conseguir contar as questões de um assunto, NÃO crie a linha ASSUNTO e explique em LIMITAÇÕES.
- Se não localizar uma nota de corte, NÃO crie a linha NOTA.
- Campos opcionais (url, página, datas, candidatos, critério): use "-" quando não souber.
- A classificação das questões por assunto é análise própria: registre como FONTE do tipo PROPRIA.
- Toda linha NOTA aponta para a chave de uma FONTE que exista.
- A soma das DISCIPLINAS não passa do total de questões da PROVA; a soma dos ASSUNTOS não passa das questões da DISCIPLINA.
- Use os nomes de disciplina e de assunto do edital atual sempre que corresponderem, para o sistema ligar com as aulas.
- Datas em DD/MM/AAAA. Separe os campos com " | " (barra vertical). Não use " | " dentro de um campo.

# FORMATO DA RESPOSTA
Responda SOMENTE com as linhas abaixo, dentro de UM único bloco de código de texto puro (para eu copiar com um toque). Sem tabelas, sem markdown, sem títulos e sem nenhum comentário antes ou depois do bloco.

Cabeçalho (uma vez):
CONCURSO: nome | órgão
CARGOS: cargo 1; cargo 2
LIMITAÇÕES: o que a análise não cobre ou não conseguiu confirmar
FONTE: chave | OFICIAL, EXTRAIDO ou PROPRIA | nome do documento | url | página | órgão/banca | data de publicação | data de consulta | conferido por

Depois, para CADA prova, repita este bloco (da mais recente para a mais antiga):
PROVA: ano | banca | total de questões | regra de contagem (ex.: anuladas pontuam para todos)
NOTA: cargo | AMPLA, PCD ou NEGROS | etapa | MINIMA_APROVACAO, CORTE_1FASE, ULTIMO_CLASSIFICADO, ULTIMO_CONVOCADO ou ULTIMO_DENTRO_VAGAS | nota | nota máxima | nº de candidatos | critério | chave da fonte | página | data da verificação
DISCIPLINA: nome | nº de questões | nº de anuladas
ASSUNTO: título do assunto | nº de questões | nº de anuladas
(cada DISCIPLINA vem seguida dos seus ASSUNTOS)

No final (uma vez):
FOCO: MAXIMA, ALTA ou COMPLEMENTAR | disciplina | assunto | justificativa curta baseada na incidência

# CONFIRA ANTES DE RESPONDER
- Existe ao menos uma linha CONCURSO e uma linha PROVA?
- Cada NOTA cita uma chave de FONTE que está na lista?
- Nenhuma soma passa do total (assuntos <= disciplina <= prova)?
- Todo número de questões é inteiro?
- A resposta contém apenas linhas no formato, dentro de um único bloco de código?

# EXEMPLO DE SAÍDA
${IMPORT_EXAMPLE_TEXT}`;
}

export const CHATGPT_STRATEGIC_PROMPT = buildStrategicPrompt();
