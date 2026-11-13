/**
 * Plano de estudo "modo gabarito": montado só com o que o Raio-X sabe (peso de cada disciplina nas provas,
 * assuntos mais cobrados, nota de corte). Nada aqui inventa estatística: onde o dado falta, o plano diz que é uma regra de método.
 */

export interface PlanoDisciplina { name: string; pct: number }
export interface PlanoAlvo { subject: string | null; topic: string; priority: string; why: string }
export interface PlanoInput {
  disciplines: PlanoDisciplina[];
  /** Último corte (em % do máximo) e a projeção por tendência, quando existirem. */
  lastCutPct: number | null;
  projectedCutPct: number | null;
  targets: PlanoAlvo[];
  weeks?: number;
  hoursPerWeek?: number;
}

export interface PlanoDisc { name: string; pct: number; tier: "A" | "B" | "C"; timePct: number; hours: number; goalPct: number; blocks: number }
export interface PlanoFase { n: number; name: string; short: string; weeks: [number, number]; goal: string; split: string; exit: string; rules: string[] }
export interface PlanoSemana { week: number; phase: string; focus: string[]; questions: number; checkpoint: string }
export interface Plano {
  weeks: number;
  hoursPerWeek: number;
  targetPct: number;
  targetWhy: string;
  disciplines: PlanoDisc[];
  phases: PlanoFase[];
  routine: Array<{ day: string; blocks: string[] }>;
  schedule: PlanoSemana[];
  rules: string[];
  review: Array<{ when: string; what: string }>;
  examiner: string[];
  triggers: Array<{ signal: string; action: string }>;
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Distribui `total` blocos entre os pesos pelo maior resto (cada disciplina com ao menos 1 quando couber). */
export function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map((r) => Math.floor(r));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f);
  for (const o of order) { if (left <= 0) break; out[o.i]!++; left--; }
  return out;
}

export function buildPlano(input: PlanoInput): Plano {
  const weeks = clamp(Math.round(input.weeks ?? 16), 8, 40);
  const hoursPerWeek = clamp(Math.round(input.hoursPerWeek ?? 25), 10, 60);

  // Meta: acima do último corte e da projeção, com margem de segurança.
  const ref = Math.max(input.lastCutPct ?? 0, input.projectedCutPct ?? 0);
  const targetPct = ref > 0 ? clamp(Math.ceil(ref + 10), 75, 95) : 85;
  const targetWhy = ref > 0
    ? `O corte catalogado chegou a ${Math.round(ref)}% do máximo. Quem mira o corte cai com qualquer prova mais difícil: a meta é o corte mais 10 pontos: ${targetPct}%.`
    : "Sem nota de corte catalogada, a meta de método é 85% de acerto: é o patamar que sobrevive a prova mais difícil e a anulações.";

  const base = input.disciplines.filter((d) => d.pct > 0).sort((a, b) => b.pct - a.pct);
  const n = Math.max(1, base.length);
  const mixed = base.map((d) => 0.7 * d.pct + 0.3 * (100 / n));
  const mixSum = mixed.reduce((a, b) => a + b, 0) || 1;
  const blocksTotal = 10; // 5 dias úteis x 2 blocos de disciplina
  const blocks = apportion(mixed, blocksTotal);
  const disciplines: PlanoDisc[] = base.map((d, i) => {
    const tier: PlanoDisc["tier"] = d.pct >= 15 ? "A" : d.pct >= 7 ? "B" : "C";
    const timePct = Math.round((mixed[i]! / mixSum) * 1000) / 10;
    return { name: d.name, pct: Math.round(d.pct * 10) / 10, tier, timePct, hours: Math.round(((mixed[i]! / mixSum) * hoursPerWeek * 0.8) * 10) / 10, goalPct: tier === "A" ? Math.max(targetPct, 90) : tier === "B" ? Math.max(targetPct - 3, 85) : Math.max(targetPct - 8, 80), blocks: blocks[i]! };
  });

  const w1 = Math.max(2, Math.round(weeks * 0.4));
  const w2 = Math.max(w1 + 2, Math.round(weeks * 0.75));
  const w3 = Math.max(w2 + 1, weeks - Math.max(1, Math.round(weeks * 0.07)));
  const phases: PlanoFase[] = [
    { n: 1, short: "Base", name: "Base: ler, entender e fixar", weeks: [1, w1], goal: "Passar por todo o edital, disciplina por disciplina, começando pelas de maior peso. Nenhum assunto fica sem ao menos uma aula completa.", split: "50% aula e lei seca, 35% questões do assunto, 15% revisão", exit: "Só avança quem tem 70% de acerto nas questões de cada assunto. Abaixo disso, o assunto volta para a fila da semana seguinte.", rules: ["Termine cada aula com as questões dela no mesmo dia.", "Cada erro vai para o caderno de erros com a causa, não só a resposta."] },
    { n: 2, short: "Domínio", name: "Domínio: questões e lacunas", weeks: [w1 + 1, w2], goal: "Transformar conhecimento em pontos: bateria diária de questões no estilo da banca, revisão dirigida pelos erros e ataque às lacunas.", split: "25% aula só do que errou, 55% questões, 20% revisão", exit: "Acerto médio de 80% em cada disciplina A e B, medido em blocos de 30 questões, por duas semanas seguidas.", rules: ["Questão errada é refeita em 24 horas e em 7 dias.", "Nenhuma disciplina fica mais de 7 dias sem aparecer na rotina."] },
    { n: 3, short: "Simulados", name: "Simulados e correção cirúrgica", weeks: [w2 + 1, w3], goal: "Treinar a prova real: tempo, ordem de resolução, controle emocional e chute estratégico. O simulado é a avaliação; o estudo da semana é a correção dele.", split: "15% revisão de teoria, 45% simulado e correção, 40% questões das piores disciplinas", exit: `Dois simulados seguidos com ${targetPct}% ou mais, no tempo da prova.`, rules: ["Simulado cronometrado, sem consulta, no mesmo horário da prova.", "Correção do simulado no mesmo dia: cada erro vira causa, regra e uma questão refeita."] },
    { n: 4, short: "Reta final", name: "Reta final: consolidar, não aprender", weeks: [w3 + 1, weeks], goal: "Revisar o que cai e o que você erra. Não abra assunto novo.", split: "60% revisão ativa do caderno de erros e dos resumos, 40% questões e simulado curto", exit: "Caderno de erros revisado inteiro pelo menos duas vezes; sono e rotina ajustados ao horário da prova.", rules: ["Sem assunto novo na última semana.", "Lei seca e súmulas alteradas: revisão final com a versão vigente."] },
  ];
  if (phases[3]!.weeks[0] > weeks) phases[3]!.weeks = [weeks, weeks];

  // Rotina semanal: 5 dias x 2 blocos de disciplina, preenchidos pela distribuição de blocos.
  const queue: string[] = [];
  const left = disciplines.map((d) => ({ name: d.name, b: d.blocks }));
  while (left.some((x) => x.b > 0)) for (const x of left) if (x.b > 0) { queue.push(x.name); x.b--; }
  const take = (k: number) => Array.from({ length: k }, (_, i) => queue[i % Math.max(1, queue.length)] ?? "Disciplina de maior peso");
  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
  const routine = days.map((day, i) => { const two = [queue[(i * 2) % Math.max(1, queue.length)], queue[(i * 2 + 1) % Math.max(1, queue.length)]]; return { day, blocks: [`Bloco 1 (2 h): ${two[0] ?? "disciplina de maior peso"}. Teoria e lei seca só do que está no plano da semana.`, `Bloco 2 (2 h): ${two[1] ?? "segunda disciplina"}. Mínimo de 30 questões com correção comentada.`, "Bloco 3 (1 h): revisão do caderno de erros do dia e das 24 horas anteriores."] }; });
  const top = take(2);
  routine.push({ day: "Sábado", blocks: ["Manhã: simulado cronometrado (a partir da Fase 2, quinzenal; na Fase 3, semanal), sem consulta.", `Tarde: correção completa do simulado e reforço em ${top[0] ?? "disciplina de maior peso"}.`] });
  routine.push({ day: "Domingo", blocks: ["Revisão ativa (sem reler): refaça questões erradas, recite os resumos e preencha o caderno de erros.", "Planeje a semana seguinte: quais assuntos entram, quais voltam por nota abaixo da meta."] });

  // Cronograma semana a semana
  const names = disciplines.map((d) => d.name);
  const schedule: PlanoSemana[] = [];
  for (let w = 1; w <= weeks; w++) {
    const ph = phases.find((p) => w >= p.weeks[0] && w <= p.weeks[1]) ?? phases[3]!;
    const focusN = ph.n === 1 ? 2 : ph.n === 2 ? 3 : 2;
    const focus = names.length ? Array.from({ length: Math.min(focusN, names.length) }, (_, i) => names[((w - 1) * focusN + i) % names.length]!) : [];
    const baseQ = ph.n === 1 ? 120 : ph.n === 2 ? 250 : ph.n === 3 ? 300 : 150;
    const checkpoint = ph.n === 1 ? (w % 2 === 0 ? "Bloco de 30 questões: mínimo de 70%" : "Revisão 7 dias dos assuntos da semana anterior")
      : ph.n === 2 ? (w % 2 === 0 ? "Simulado parcial: mínimo de 75%" : "Bloco de 30 questões por disciplina A: mínimo de 80%")
      : ph.n === 3 ? `Simulado completo: mínimo de ${targetPct}%`
      : "Simulado curto e revisão do caderno de erros";
    schedule.push({ week: w, phase: ph.short, focus, questions: baseQ, checkpoint });
  }

  const hot = input.targets.slice(0, 6);
  const examiner = [
    "A banca não pergunta o que você estudou: pergunta onde você vai errar. Cada assertiva certa foi trocada em uma palavra (sempre, nunca, somente, exclusivamente, apenas) ou em uma exceção. Estude a exceção antes da regra.",
    "Lei seca e alterações recentes: o examinador adora o dispositivo que mudou. Toda aula de lei é revisada na versão vigente, com a data da última alteração.",
    "Súmulas e teses de repercussão geral e recursos repetitivos: decore o enunciado e o que ele NÃO diz. É onde a banca esconde a pegadinha.",
    "Institutos parecidos caem em par (A x B). Para cada par, monte uma tabela de diferenças e treine só questões que misturam os dois.",
    "Questão de caso concreto: identifique o fato, o dispositivo e a exceção, nessa ordem. Quem lê a alternativa antes de ler o enunciado cai na isca.",
    "Certo ou errado (Cebraspe e similares): erro custa o ponto do acerto. Em dúvida real, não pratique chute sem critério; treine o limite do seu conhecimento em simulado.",
    ...hot.map((t) => `Alvo da banca: ${t.subject ? `${t.subject} - ` : ""}${t.topic} (${t.priority}). ${t.why}`),
  ];

  const rules = [
    "Sem aula nova antes de fechar as questões da anterior: estudo sem questão não conta como estudo.",
    "Todo erro vai para o caderno de erros no mesmo dia, com a causa (lacuna, atenção, pegadinha ou tempo).",
    "Meta mínima de acerto: 80% em cada bloco de 30 questões. Abaixo disso, o assunto repete, sem negociação.",
    "Nenhuma disciplina some por mais de 7 dias, nem as de peso pequeno: elas decidem o desempate.",
    "Celular fora da mesa durante os blocos. Pausa só depois do bloco, nunca no meio.",
    "Simulado vale como prova: cronometrado, sem consulta, no horário real. Quem não faz simulado não conhece a própria nota.",
    "Semana perdida não é compensada com a seguinte: refaça o planejamento e corte o menos importante, nunca o simulado.",
    "Sono, alimentação e exercício fazem parte do plano. Estudo de madrugada rende metade e custa o dia seguinte.",
  ];
  const review = [
    { when: "24 horas depois", what: "Refazer as questões erradas e reler o resumo do assunto (10 a 15 minutos)." },
    { when: "7 dias depois", what: "Bloco de 15 questões novas do mesmo assunto; erro volta ao caderno." },
    { when: "30 dias depois", what: "Revisão ativa do resumo e simulado parcial com o assunto." },
    { when: "60 dias depois", what: "Questões difíceis do assunto e conferência da lei seca vigente." },
  ];
  const triggers = [
    { signal: "Acerto abaixo de 70% em um assunto", action: "Volta para a aula, refaz as questões erradas e só então segue." },
    { signal: "Disciplina A com média abaixo de 80% por 2 semanas", action: "Corta 20% do tempo das disciplinas C e coloca nela até recuperar." },
    { signal: "Simulado abaixo da meta", action: "Dedica o sábado seguinte à correção completa e dobra as questões da pior disciplina na semana." },
    { signal: "Dois dias seguidos sem cumprir o plano", action: "Refaz o planejamento no domingo, sem culpa e sem acumular: corta o supérfluo e mantém simulado e revisão." },
    { signal: "Erro repetido no caderno 3 vezes", action: "Vira cartão de revisão diária até acertar 5 vezes seguidas." },
  ];
  return { weeks, hoursPerWeek, targetPct, targetWhy, disciplines, phases, routine, schedule, rules, review, examiner, triggers };
}
