/**
 * Análise estratégica do concurso (modelo "ANÁLISE COMPLETA DO EDITAL"): estrutura da prova, análise por disciplina
 * (questões, prioridade, focos, estratégia), distribuição, grupos de dificuldade, organização do estudo, material e conclusão.
 * O admin gera esse texto no ChatGPT com um comando fixo e cola aqui; este módulo lê o texto, confere os números
 * e devolve um objeto estruturado. Puro: sem banco e sem React.
 */

export const ANALISE_VERSAO = 1;
const MAX_TEXTO = 200_000;
const MAX_DISCIPLINAS = 60;

export interface AnaliseBloco { nome: string; disciplinas: number | null; questoes: number | null; percentual: number | null }
export interface AnaliseDisciplina {
  ordem: number;
  nome: string;
  bloco: string;
  questoes: number | null;
  /** Calculado: questões ÷ total da prova. */
  percentual: number | null;
  prioridade: string;
  descricao: string;
  focos: string[];
  estrategia: string;
  /** Peso e assuntos mais cobrados pela banca (raio-x). */
  incidencia?: string;
}
export interface AnaliseConcurso {
  versao: number;
  titulo: string;
  estrutura: { blocos: AnaliseBloco[]; total: { disciplinas: number | null; questoes: number | null } | null; notas: string[] };
  disciplinas: AnaliseDisciplina[];
  distribuicao: { classificacao: Array<{ nivel: string; disciplinas: string[] }>; notas: string[] };
  dificuldades: Array<{ grupo: string; disciplinas: string[]; texto: string }>;
  organizacao: { horas: Array<{ disciplina: string; horas: number }>; totalHoras: number | null; ciclo: Array<{ etapa: string; texto: string }>; notas: string[] };
  material: { itens: Array<{ titulo: string; texto: string }>; notas: string[] };
  conclusao: { decisoes: Array<{ titulo: string; texto: string }>; recomendacao: string[]; observacao: string | null; notas: string[] };
  /** Nota de corte do concurso analisado e das últimas edições (raio-x). */
  corte?: string[];
}
export interface ResumoAnalise { disciplinas: number; questoes: number | null; blocos: number; grupos: number; horas: number | null }
export type ResultadoAnalise = { ok: true; analise: AnaliseConcurso; resumo: ResumoAnalise; avisos: string[] } | { ok: false; erros: string[] };

/** O comando do RAIO-X: o modelo "ANÁLISE COMPLETA DO EDITAL" (padrão do concurso da PCMG) + incidência, conteúdo programático completo e nota de corte. {CARGO} é trocado pelo cargo. */
export const COMANDO_ANALISE = `Você é um analista sênior de editais de concursos públicos brasileiros. Leia o PDF do edital anexado, do início ao fim, e produza o RAIO-X COMPLETO E MINUCIOSO do concurso para o cargo: {CARGO}. Se você tiver acesso à internet, pesquise também as provas anteriores da mesma banca para a incidência e a nota de corte; se não tiver, use só o edital e escreva NÃO ENCONTRADO onde não houver dado confiável.

REGRAS:
1. Use somente fatos do edital e fontes que você consiga citar. Não invente número de questões, pesos, datas, incidência, nota de corte nem numeração. Se o edital não informar as questões por disciplina, escreva "QUESTÕES NÃO INFORMADAS" no lugar da quantidade e deixe de fora as contas que dependam dela.
2. Inclua TODAS as disciplinas do cargo (conhecimentos básicos, gerais e específicos), na ordem do edital.
3. Em cada disciplina, inclua TODO o conteúdo programático, item por item, na ordem do edital, copiado EXATAMENTE como está no edital (mesmas palavras e pontuação), um item por linha, com a numeração original (1., 1.1, 1.1.1, a)…). Não resuma, não agrupe, não pule nenhum item. Se o edital não numerar, numere 1., 2., 3. em sequência.
4. Responda em texto simples, SEM markdown (sem #, sem **), sem JSON e sem blocos de código, seguindo EXATAMENTE este modelo e estes títulos. Tabelas com colunas separadas por TAB.
5. Seja minucioso: cada disciplina precisa de prioridade, incidência, focos, estratégia e o conteúdo programático completo. Faça a leitura estratégica de verdade, citando o que a banca costuma cobrar.

MODELO:

ANÁLISE COMPLETA DO EDITAL — SIGLA DO ÓRGÃO | CARGO
CONCURSO: nome completo do concurso
BANCA: banca organizadora
ANO: ano do edital
EDITAL: número do edital

1. ESTRUTURA GERAL DA PROVA
(1 parágrafo sobre os blocos e a distribuição, citando o número do edital)
Bloco[TAB]Disciplinas[TAB]Questões[TAB]Percentual
Conhecimentos Básicos[TAB]0[TAB]0[TAB]0,00%
Conhecimentos Específicos[TAB]0[TAB]0[TAB]0,00%
TOTAL[TAB]0[TAB]0[TAB]100%
(1 a 2 parágrafos de leitura estratégica, incluindo nota mínima por bloco e eliminações, se houver)

⸻

2. ANÁLISE POR DISCIPLINA

CONHECIMENTOS BÁSICOS

1. NOME DA DISCIPLINA — 10 QUESTÕES
PRIORIDADE: MUITO ALTA | ALTA | ESTRATÉGICA | CONTEÚDO TÉCNICO
(1 parágrafo: por que importa)
Principais focos de preparação:
* foco 1.
* foco 2.
ESTRATÉGIA:
(1 parágrafo: como estudar)
INCIDÊNCIA:
(o peso da disciplina na prova e os assuntos que a banca mais cobrou nas provas anteriores, do mais ao menos cobrado, com percentuais quando houver dado confiável; sem dado: NÃO ENCONTRADO)
CONTEÚDO PROGRAMÁTICO COMPLETO:
1. Título exato do item do edital
1.1 Título exato do subitem
1.1.1 Título exato do sub-subitem
a) Título exato
(se quiser marcar a incidência de um item, ponha no fim da linha [ALTA], [MÉDIA] ou [BAIXA]; marque só onde houver dado ou critério real)

(repita para cada disciplina, numerando em sequência; ao mudar de bloco escreva CONHECIMENTOS ESPECÍFICOS em linha própria)

⸻

3. DISTRIBUIÇÃO DE QUESTÕES E PRIORIDADES
Disciplina[TAB]Questões[TAB]Percentual
(uma linha por disciplina)
TOTAL[TAB]0[TAB]100%
CLASSIFICAÇÃO ESTRATÉGICA
PRIORIDADE MUITO ALTA:
* disciplina.
PRIORIDADE ALTA:
* disciplina.
PRIORIDADE ESTRATÉGICA:
* disciplina.
(1 parágrafo: a prioridade serve para distribuir o tempo, não para abandonar disciplinas)

⸻

4. ONDE ESTÁ A MAIOR DIFICULDADE DO EDITAL?
GRUPO 1 — TÍTULO DO GRUPO
Disciplinas:
* disciplina.
(1 parágrafo)
(3 a 5 grupos)

⸻

5. COMO ORGANIZAR O ESTUDO
(1 parágrafo: distribuição inicial para 30 horas semanais)
Disciplina[TAB]Horas por semana
(uma linha por disciplina, ex.: 2,5h)
TOTAL[TAB]30h
CICLO RECOMENDADO
1. APRENDIZADO: …
2. FIXAÇÃO: …
3. CORREÇÃO: …
4. REVISÃO: …
5. SIMULADO: …

⸻

6. O QUE DEVE ENTRAR NO MATERIAL DE PREPARAÇÃO
* CONTEÚDO PROGRAMÁTICO LITERAL: …
* AULAS POR ASSUNTO: …
* LEI SECA: …
* QUESTÕES COMENTADAS: …
* REVISÕES: …
* CONTROLE DE DESEMPENHO: …
* SIMULADOS: …

⸻

7. CONCLUSÃO ESTRATÉGICA
(1 parágrafo)
1. TÍTULO DA DECISÃO: texto.
(5 decisões)
RECOMENDAÇÃO FINAL:
(1 parágrafo)
* status de estudo.
OBSERVAÇÃO: a distribuição de questões é a da prova do Edital nº X. Não deve ser atribuída a outro edital.

⸻

8. NOTA DE CORTE
NOTA DE CORTE DO CONCURSO ANALISADO: a nota de corte (ou nota mínima de aprovação) do concurso analisado, com a pontuação máxima, a fonte e o ano. Sem dado confiável: NÃO ENCONTRADO.
ÚLTIMAS EDIÇÕES DA MESMA BANCA/CARGO: uma linha por edição, no formato "ANO — nota de corte de pontuação máxima (fonte)".
LEITURA DA NOTA DE CORTE: 1 parágrafo sobre quantas questões é preciso acertar e onde estão os pontos mais fáceis de ganhar.

Se a resposta for cortada, eu peço "continue"; retome do ponto exato onde parou, sem repetir o que já enviou, e escreva de novo o rótulo da disciplina em andamento (ex.: "3. INFORMÁTICA BÁSICA — 8 QUESTÕES") antes de seguir com os itens.`;

export const comandoAnaliseParaCargo = (cargo: string): string => COMANDO_ANALISE.replace("{CARGO}", cargo.trim() || "(informe o cargo)");

// ───────────────────────── utilitários ─────────────────────────
const limpa = (s: string): string => s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
const norm = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const semPonto = (s: string): string => s.replace(/[.;]\s*$/, "").trim();
const num = (s: string | undefined): number | null => {
  if (!s) return null;
  const m = s.replace(/\s/g, "").match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const arredonda = (n: number): number => Math.round(n * 100) / 100;

/** Separador de colunas: o TAB do texto colado vira este caractere antes de limpar os espaços. */
const COL = "\u0001";
const ehMarcador = (t: string): string | null => t.match(/^[*•·▪‣-]\s+(.+)$/)?.[1] ?? null;
const celulas = (t: string): string[] | null => {
  if (/^[\s|:-]+$/.test(t)) return []; // separador de tabela markdown
  if (t.includes(COL)) return t.split(COL).map(limpa);
  if (/^\|.*\|$/.test(t)) return t.slice(1, -1).split("|").map(limpa);
  return null;
};

type Secao = "estrutura" | "disciplinas" | "distribuicao" | "dificuldades" | "organizacao" | "material" | "conclusao" | "corte";
const SECOES: Array<[Secao, RegExp]> = [
  ["estrutura", /^estrutura geral/],
  ["disciplinas", /^analise por disciplina/],
  ["distribuicao", /^distribuicao/],
  ["dificuldades", /^onde esta a maior|^dificuldades? do edital|^grupos? de dificuldade/],
  ["organizacao", /^como organizar/],
  ["material", /^o que deve entrar/],
  ["conclusao", /^conclusao/],
  ["corte", /^notas? de corte/],
];

/** Título de seção: "3. DISTRIBUIÇÃO…", "## 3. DISTRIBUIÇÃO…" ou só "DISTRIBUIÇÃO…" (linha curta, sem ponto final). */
export function secaoDaLinha(t: string): Secao | null {
  if (t.length > 90 || /[.;]$/.test(t)) return null;
  const n = norm(t.replace(/^#+\s*/, "").replace(/^\d+\s*[.)]\s*/, ""));
  for (const [s, re] of SECOES) if (re.test(n)) return s;
  return null;
}

// ───────────────────────── leitura ─────────────────────────
export function lerAnalise(bruto: string): ResultadoAnalise {
  const entrada = bruto.replace(/\u0000/g, "").replace(/\r\n?/g, "\n");
  if (entrada.trim().length < 200) return { ok: false, erros: ["Cole aqui a análise gerada pelo ChatGPT (o texto completo, do título até a observação final)."] };
  if (entrada.length > MAX_TEXTO) return { ok: false, erros: ["Texto grande demais para uma análise."] };

  const linhas = entrada.split("\n").map((l) => limpa(l.replace(/\t+/g, COL))).filter((l) => !/^[\u2E3B—–_=\-\s]{1,}$/.test(l) || l.length < 1);
  const partes = new Map<Secao, string[]>();
  let atual: Secao | null = null;
  let titulo = "";
  // Dentro do "CONTEÚDO PROGRAMÁTICO COMPLETO" de uma disciplina, um item como "3. Distribuição de competências" não é título de seção:
  // lá só vale título em MAIÚSCULAS, numerado ("3. DISTRIBUIÇÃO DE QUESTÕES…").
  let emProg = false;
  for (const l of linhas) {
    if (!l) continue;
    if (atual === "disciplinas") {
      if (/^conteudo programatico/.test(norm(l)) && /:/.test(l)) emProg = true;
      else if (/^\d+\s*[.)]\s+.+[—–-]\s*.*quest/i.test(l)) emProg = false;
    } else emProg = false;
    const s = secaoDaLinha(l);
    const bloqueada = emProg && (/[a-zà-ú]/.test(l) || !/^\d+/.test(l));
    if (s && !partes.has(s) && !bloqueada) {
      atual = s;
      partes.set(s, []);
      continue;
    }
    if (atual) partes.get(atual)!.push(l);
    else if (!titulo) titulo = l.replace(/^#+\s*/, "");
  }

  const erros: string[] = [];
  const avisos: string[] = [];
  const tem = (s: Secao) => partes.has(s);
  if (!tem("disciplinas")) {
    return { ok: false, erros: ['Não achei a seção "ANÁLISE POR DISCIPLINA". Use o modelo do comando (seções numeradas de 1 a 7).'] };
  }
  for (const s of ["estrutura", "distribuicao", "organizacao"] as Secao[]) if (!tem(s)) avisos.push(`Seção ausente: ${{ estrutura: "Estrutura geral da prova", distribuicao: "Distribuição de questões", organizacao: "Como organizar o estudo" }[s as "estrutura"]}.`);

  // 1. estrutura
  const estrutura: AnaliseConcurso["estrutura"] = { blocos: [], total: null, notas: [] };
  for (const l of partes.get("estrutura") ?? []) {
    const c = celulas(l);
    if (c) {
      if (!c.length || norm(c[0] ?? "") === "bloco") continue;
      if (norm(c[0] ?? "") === "total") estrutura.total = { disciplinas: num(c[1]), questoes: num(c[2]) };
      else estrutura.blocos.push({ nome: c[0] ?? "", disciplinas: num(c[1]), questoes: num(c[2]), percentual: num(c[3]) });
    } else estrutura.notas.push(l);
  }

  // 2. disciplinas
  const disciplinas: AnaliseDisciplina[] = [];
  {
    let bloco = "";
    let d: AnaliseDisciplina | null = null;
    let modo: "desc" | "focos" | "estr" | "inc" | "prog" = "desc";
    for (const l of partes.get("disciplinas")!) {
      const m = l.match(/^(\d+)\s*[.)]\s+(.+)$/);
      if (m && (/[—–-]\s*.*quest/i.test(m[2]!) || (!/[a-zà-ú]/.test(m[2]!) && !/:/.test(m[2]!)))) {
        const [nomeBruto, ...resto] = m[2]!.split(/\s+[—–-]+\s+/);
        d = { ordem: disciplinas.length + 1, nome: limpa(nomeBruto ?? ""), bloco, questoes: num(resto.join(" ").match(/(\d+)\s*quest/i)?.[1]), percentual: null, prioridade: "", descricao: "", focos: [], estrategia: "" };
        if (d.questoes == null) avisos.push(`"${d.nome}": número de questões não informado.`);
        disciplinas.push(d);
        modo = "desc";
        continue;
      }
      // Título de bloco: "CONHECIMENTOS BÁSICOS" ou qualquer linha só em maiúsculas, sem dois-pontos.
      if (/^conhecimentos\b/i.test(l) || (!/[a-zà-ú:]/.test(l) && /[A-ZÀ-Ú]{4}/.test(l))) {
        bloco = l;
        d = null;
        continue;
      }
      if (!d) continue;
      if (/^incid[eê]ncia\s*:/i.test(norm(l).replace(/^incidencia/, "incidência"))) {
        modo = "inc";
        const resto = l.replace(/^incid[eê]ncia\s*:?\s*/i, "");
        if (resto) d.incidencia = resto;
        continue;
      }
      if (/^conteudo programatico/.test(norm(l)) && /:/.test(l)) {
        modo = "prog";
        continue;
      }
      const pr = l.match(/^prioridade\s*:\s*(.+)$/i);
      if (pr) {
        d.prioridade = limpa(pr[1]!);
        modo = "desc";
        continue;
      }
      if (/^principais\s+focos|^focos\b/i.test(norm(l)) && /:$/.test(l)) {
        modo = "focos";
        continue;
      }
      if (/^estrat[eé]gia\s*:/i.test(l)) {
        modo = "estr";
        const resto = l.replace(/^estrat[eé]gia\s*:?\s*/i, "");
        if (resto) d.estrategia = resto;
        continue;
      }
      const item = ehMarcador(l);
      if (modo === "prog") continue; // o conteúdo programático completo é lido pela importação do catálogo
      if (modo === "inc") { d.incidencia = d.incidencia ? `${d.incidencia} ${l}` : l; continue; }
      if (modo === "focos" && item) d.focos.push(semPonto(item));
      else if (modo === "estr") d.estrategia = d.estrategia ? `${d.estrategia} ${l}` : l;
      else if (modo === "focos") continue; // texto solto entre os focos: ignora
      else d.descricao = d.descricao ? `${d.descricao} ${l}` : l;
    }
  }
  if (!disciplinas.length) return { ok: false, erros: ['Não achei nenhuma disciplina. Cada uma começa com "1. NOME — 10 QUESTÕES".'] };
  if (disciplinas.length > MAX_DISCIPLINAS) return { ok: false, erros: [`Disciplinas demais (${disciplinas.length}); o limite é ${MAX_DISCIPLINAS}.`] };
  for (const d of disciplinas) {
    if (!d.prioridade) avisos.push(`"${d.nome}": sem PRIORIDADE.`);
    if (!d.focos.length) avisos.push(`"${d.nome}": sem "Principais focos de preparação".`);
    if (!d.estrategia) avisos.push(`"${d.nome}": sem ESTRATÉGIA.`);
  }

  // 3. distribuição
  const distribuicao: AnaliseConcurso["distribuicao"] = { classificacao: [], notas: [] };
  let totalTabela: number | null = null;
  {
    let nivel: { nivel: string; disciplinas: string[] } | null = null;
    let naClassificacao = false;
    for (const l of partes.get("distribuicao") ?? []) {
      const c = celulas(l);
      if (c) {
        if (!c.length || norm(c[0] ?? "") === "disciplina") continue;
        if (norm(c[0] ?? "") === "total") totalTabela = num(c[1]);
        continue;
      }
      if (/^classifica[cç][aã]o/i.test(norm(l)) || /^classificacao/.test(norm(l))) {
        naClassificacao = true;
        continue;
      }
      const pn = l.match(/^prioridade\s+(.+?)\s*:$/i);
      if (pn) {
        nivel = { nivel: pn[1]!, disciplinas: [] };
        distribuicao.classificacao.push(nivel);
        continue;
      }
      const item = ehMarcador(l);
      if (item && nivel) nivel.disciplinas.push(semPonto(item));
      else if (!item && (!naClassificacao || nivel)) distribuicao.notas.push(l);
    }
  }

  // 4. dificuldades
  const dificuldades: AnaliseConcurso["dificuldades"] = [];
  {
    let g: AnaliseConcurso["dificuldades"][number] | null = null;
    for (const l of partes.get("dificuldades") ?? []) {
      const gm = l.match(/^grupo\s+\d+\s*[—–:-]+\s*(.+)$/i);
      if (gm) {
        g = { grupo: gm[1]!, disciplinas: [], texto: "" };
        dificuldades.push(g);
        continue;
      }
      if (!g || /^disciplinas\s*:?$/i.test(l)) continue;
      const item = ehMarcador(l);
      if (item) g.disciplinas.push(semPonto(item));
      else g.texto = g.texto ? `${g.texto} ${l}` : l;
    }
  }

  // 5. organização
  const organizacao: AnaliseConcurso["organizacao"] = { horas: [], totalHoras: null, ciclo: [], notas: [] };
  {
    let noCiclo = false;
    for (const l of partes.get("organizacao") ?? []) {
      const c = celulas(l);
      if (c) {
        if (!c.length || norm(c[0] ?? "") === "disciplina") continue;
        const h = num(c[1]);
        if (norm(c[0] ?? "") === "total") organizacao.totalHoras = h;
        else if (h != null) organizacao.horas.push({ disciplina: c[0] ?? "", horas: h });
        continue;
      }
      if (/^ciclo\b/.test(norm(l))) {
        noCiclo = true;
        continue;
      }
      const cm = l.match(/^(\d+)\s*[.)]\s*([^:]{2,60}):\s*(.+)$/);
      if (noCiclo && cm) organizacao.ciclo.push({ etapa: cm[2]!, texto: cm[3]! });
      else organizacao.notas.push(l);
    }
  }

  // 6. material
  const material: AnaliseConcurso["material"] = { itens: [], notas: [] };
  for (const l of partes.get("material") ?? []) {
    const item = ehMarcador(l);
    if (item) {
      const m = item.match(/^([^:]{2,80}):\s*(.+)$/);
      material.itens.push(m ? { titulo: m[1]!, texto: m[2]! } : { titulo: semPonto(item), texto: "" });
    } else material.notas.push(l);
  }

  // 7. conclusão
  const conclusao: AnaliseConcurso["conclusao"] = { decisoes: [], recomendacao: [], observacao: null, notas: [] };
  {
    let naRecomendacao = false;
    for (const l of partes.get("conclusao") ?? []) {
      const ob = l.match(/^observa[cç][aã]o\s*:\s*(.*)$/i);
      if (ob) {
        conclusao.observacao = ob[1] || null;
        naRecomendacao = false;
        continue;
      }
      if (/^recomenda[cç][aã]o/i.test(l) && /:$/.test(l)) {
        naRecomendacao = true;
        continue;
      }
      const dm = l.match(/^(\d+)\s*[.)]\s*([^:]{2,80}):\s*(.+)$/);
      if (dm && !naRecomendacao) conclusao.decisoes.push({ titulo: dm[2]!, texto: dm[3]! });
      else if (naRecomendacao) conclusao.recomendacao.push(semPonto(ehMarcador(l) ?? l));
      else conclusao.notas.push(l);
    }
  }

  const corte = (partes.get("corte") ?? []).slice(0, 40);

  // ── conferência dos números (só avisos: o admin decide) ──
  const somaQuestoes = disciplinas.reduce((s, d) => s + (d.questoes ?? 0), 0);
  const algumaQuestao = disciplinas.some((d) => d.questoes != null);
  const totalDeclarado = estrutura.total?.questoes ?? totalTabela;
  const totalBase = totalDeclarado ?? (algumaQuestao ? somaQuestoes : null);
  if (totalDeclarado != null && algumaQuestao && somaQuestoes !== totalDeclarado) avisos.push(`As disciplinas somam ${somaQuestoes} questões, mas a prova declara ${totalDeclarado}.`);
  if (estrutura.total?.disciplinas != null && estrutura.total.disciplinas !== disciplinas.length) avisos.push(`A estrutura declara ${estrutura.total.disciplinas} disciplinas, mas foram lidas ${disciplinas.length}.`);
  for (const b of estrutura.blocos) {
    const doBloco = disciplinas.filter((d) => norm(d.bloco) === norm(b.nome));
    if (!doBloco.length) continue;
    const q = doBloco.reduce((s, d) => s + (d.questoes ?? 0), 0);
    if (b.questoes != null && q !== b.questoes) avisos.push(`"${b.nome}": as disciplinas somam ${q} questões, mas o bloco declara ${b.questoes}.`);
    if (b.disciplinas != null && doBloco.length !== b.disciplinas) avisos.push(`"${b.nome}": ${doBloco.length} disciplinas lidas, mas o bloco declara ${b.disciplinas}.`);
  }
  if (organizacao.totalHoras != null && organizacao.horas.length) {
    const h = arredonda(organizacao.horas.reduce((s, x) => s + x.horas, 0));
    if (h !== organizacao.totalHoras) avisos.push(`As horas semanais somam ${h}h, mas o total declarado é ${organizacao.totalHoras}h.`);
  }
  const nomes = new Set<string>();
  for (const d of disciplinas) {
    if (nomes.has(norm(d.nome))) avisos.push(`Disciplina repetida: "${d.nome}".`);
    nomes.add(norm(d.nome));
  }
  for (const d of disciplinas) d.percentual = totalBase && d.questoes != null ? arredonda((d.questoes / totalBase) * 100) : null;
  if (erros.length) return { ok: false, erros };

  const analise: AnaliseConcurso = { versao: ANALISE_VERSAO, titulo, estrutura, disciplinas, distribuicao, dificuldades, organizacao, material, conclusao, ...(corte.length ? { corte } : {}) };
  return {
    ok: true,
    analise,
    avisos,
    resumo: { disciplinas: disciplinas.length, questoes: totalBase, blocos: estrutura.blocos.length, grupos: dificuldades.length, horas: organizacao.totalHoras },
  };
}

/** Tom visual da prioridade (1 = mais urgente) para cores e ordenação. */
export function tomPrioridade(p: string): 1 | 2 | 3 | 4 {
  const n = norm(p);
  if (n.includes("muito alta")) return 1;
  if (n.startsWith("alta")) return 2;
  if (n.includes("estrateg")) return 3;
  return 4;
}

/** Lê o que foi gravado no banco (jsonb) com segurança; devolve null se não for uma análise reconhecível. */
export function analiseDoBanco(v: unknown): AnaliseConcurso | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Partial<AnaliseConcurso>;
  if (a.versao !== ANALISE_VERSAO || !Array.isArray(a.disciplinas) || !a.disciplinas.length) return null;
  return a as AnaliseConcurso;
}
