import { embaralhar, sortear, type Rand } from "./mentor/variar";

export const AVISO_KINDS = ["motivacao", "concursos", "revisoes", "planos", "mentor", "novidades"] as const;
export type AvisoKind = (typeof AVISO_KINDS)[number];

export const AVISO_ROTULO: Record<AvisoKind, string> = {
  motivacao: "Frase motivacional",
  concursos: "Concursos abertos e previstos",
  revisoes: "Lembrete de revisões",
  planos: "Convite aos planos (contas gratuitas)",
  mentor: "Recado do Mentor",
  novidades: "Dica do APROVUM",
};

export interface Slot { slot: number; kind: AvisoKind; hour: number; variant: number }

/** Avisos "de conteúdo" que saem no máximo uma vez por dia cada; as dicas do app completam as demais horas. */
const UNICOS = ["concursos", "revisoes", "planos", "mentor"] as const;

/**
 * Monta o dia: um aviso a cada `intervalo` horas dentro da janela [horaIni, horaFim], alternando
 * frase motivacional (1º, 3º, 5º…) com aviso informativo (2º, 4º, 6º…). Os informativos vêm embaralhados:
 * concursos/revisões/planos/Mentor uma vez cada (se elegíveis) e dicas do app nas horas que sobram.
 * `variant` escolhe a frase ou a dica sem repetir no mesmo dia.
 */
export function montarAgenda(
  opts: { intervalo: number; horaIni: number; horaFim: number; elegiveis: readonly AvisoKind[]; frases: number; dicas: number },
  rand: Rand = Math.random,
): Slot[] {
  const horas: number[] = [];
  for (let h = opts.horaIni; h <= opts.horaFim; h += Math.max(1, opts.intervalo)) horas.push(h);
  const nInfo = Math.floor(horas.length / 2);
  const unicos = embaralhar(UNICOS.filter((k) => opts.elegiveis.includes(k)), rand).slice(0, nInfo);
  const fila = embaralhar<AvisoKind>([...unicos, ...Array.from({ length: nInfo - unicos.length }, () => "novidades" as const)], rand);
  const frases = embaralhar(Array.from({ length: opts.frases }, (_, i) => i), rand);
  const dicas = embaralhar(Array.from({ length: opts.dicas }, (_, i) => i), rand);
  let fi = 0, di = 0, ii = 0;
  return horas.map((hour, i) => {
    if (i % 2 === 0) return { slot: i + 1, kind: "motivacao", hour, variant: frases.length ? (frases[fi++ % frases.length] as number) : 0 };
    const kind = fila[ii++] ?? "novidades";
    return { slot: i + 1, kind, hour, variant: kind === "novidades" && dicas.length ? (dicas[di++ % dicas.length] as number) : 0 };
  });
}

/** Hora cheia (0 a 23) em Brasília. */
export function horaBr(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(now)) % 24;
}

/** Dicas sobre o próprio APROVUM. Só falam de recursos que existem no app e levam direto à tela certa. */
export const NOVIDADES: ReadonlyArray<{ title: string; body: string; url: string }> = [
  { title: "Caderno de erros", body: "Anote por que você errou cada questão. Quem entende o erro não repete na prova.", url: "/questoes" },
  { title: "Monte seu caderno de questões", body: "Filtre por banca, órgão, cargo e tópico e resolva só o que cai no seu concurso.", url: "/questoes" },
  { title: "Seu Mentor está de olho", body: "O Mentor APROVUM indica o que estudar hoje com base no seu desempenho. Toque e veja a prioridade.", url: "/mentor" },
  { title: "Revisão fixa o conteúdo", body: "Revisar no dia certo faz o conteúdo ficar. Veja o que está esperando por você.", url: "/revisoes" },
  { title: "Acompanhe seu concurso", body: "Cadastre seu edital e veja o plano de estudo organizado por tópico.", url: "/meu-concurso" },
  { title: "Concursos no radar", body: "Veja os concursos abertos e previstos e favorite os que combinam com você.", url: "/concursos" },
  { title: "Estude um pouquinho todo dia", body: "Constância vence maratona. Abra uma aula hoje, mesmo que seja curta.", url: "/painel" },
  { title: "Teste o que aprendeu", body: "Faça um quiz rápido e descubra o que ainda precisa reforçar.", url: "/quiz" },
];
export const novidadeAleatoria = (rand: Rand = Math.random) => sortear(NOVIDADES, rand);

/** Frases para incentivar o aluno. Textos próprios, sem promessa de resultado; levam ao painel. */
export const MOTIVACAO: ReadonlyArray<{ title: string; body: string }> = [
  { title: "Um passo de cada vez", body: "Quem estuda um pouco todo dia chega mais longe do que quem estuda muito de vez em quando." },
  { title: "Hoje conta", body: "Cada aula concluída hoje é uma a menos entre você e a sua vaga. Vamos?" },
  { title: "Constância vence", body: "Não precisa de um dia perfeito. Precisa de um dia de estudo. Abra o app e comece." },
  { title: "Você já começou", body: "O mais difícil é sentar para estudar. Depois que começa, o ritmo vem." },
  { title: "Foco no próximo cargo", body: "Lembre por que você escolheu esse concurso. Essa razão aguenta o cansaço de hoje." },
  { title: "Pequenas vitórias", body: "Uma questão certa, uma revisão feita, uma aula assistida. É assim que a aprovação se constrói." },
  { title: "Disciplina é decisão", body: "A motivação oscila, a rotina sustenta. Faça o básico de hoje e siga em frente." },
  { title: "Errar faz parte", body: "Cada erro de hoje é um erro a menos na prova. Estude o motivo e avance." },
  { title: "Sua vaga está sendo construída", body: "Enquanto você estuda, o seu futuro cargo fica mais perto. Continue." },
  { title: "Respire e retome", body: "Se o dia foi corrido, 15 minutos de estudo já mantêm o ritmo. Volte agora." },
  { title: "Quem insiste, chega", body: "Concurso é maratona. O seu ritmo de hoje decide o seu resultado de amanhã." },
  { title: "Você é capaz", body: "Você já aprendeu muita coisa aqui. Mais uma sessão de estudo e o avanço aparece." },
  { title: "Comece pelo mais simples", body: "Sem vontade? Abra uma revisão rápida. O resto do estudo costuma vir junto." },
  { title: "Seu futuro agradece", body: "A versão de você aprovada vai lembrar do estudo de hoje. Faça valer." },
  { title: "Rotina é o segredo", body: "Defina o horário, abra o app e estude. Repetir todo dia é o que faz a diferença." },
  { title: "Não desista agora", body: "O cansaço passa, a aprovação fica. Mais um bloco de estudo e você fecha o dia bem." },
  { title: "Evolução de verdade", body: "Olhe quanto você já avançou desde o começo. Falta menos do que ontem." },
  { title: "Foco total por 25 minutos", body: "Silencie o celular, abra uma aula e estude sem pausa. Depois descanse." },
  { title: "Quem treina, acerta", body: "Resolver questões é o melhor treino para a prova. Faça algumas agora." },
  { title: "Mais perto a cada dia", body: "Aprovação é soma de dias comuns bem usados. Faça o de hoje contar." },
  { title: "Confie no processo", body: "Estudar com método traz resultado. Siga o seu plano e não pule a revisão." },
  { title: "O melhor momento é agora", body: "Não espere a motivação chegar. Comece e ela aparece no caminho." },
  { title: "Orgulho do esforço", body: "Você escolheu estudar quando podia desistir. Isso já diz muito sobre você." },
  { title: "Bora estudar!", body: "Seu plano de hoje está pronto e esperando por você. Toque e comece." },
];
