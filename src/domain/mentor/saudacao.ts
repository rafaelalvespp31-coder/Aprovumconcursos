/**
 * Abertura do Mentor na tela inicial: UMA mensagem curta (20 a 40 palavras, 8 a 15 segundos) com um dado real do aluno.
 * Aqui só há regras puras: quais "ângulos" valem para este aluno, qual escolher (sem repetir o do acesso anterior)
 * e o texto da instrução. Nenhum número entra se não estiver em `DadosSaudacao`, que o servidor monta com dados reais.
 */

export type AnguloSaudacao = "primeiro_acesso" | "sem_objetivo" | "retomada" | "revisoes" | "aula_andamento" | "materia_fraca" | "desempenho" | "objetivo";

export interface DadosSaudacao {
  nome: string | null;
  /** Concurso que o aluno escolheu (profiles.preferences.mentor_goal). */
  objetivo: string | null;
  /** Não há aula iniciada nem questão respondida. */
  semAtividade: boolean;
  /** Dias desde o último dia com estudo; null = sem registro. */
  diasSemEstudar: number | null;
  /** Dias seguidos estudando, contando até ontem ou hoje. */
  sequencia: number;
  revisoesVencidas: number;
  materiaFraca: { nome: string; pct: number; questoes: number } | null;
  aulaAndamento: { titulo: string; pct: number } | null;
  respondidas: number;
  acertoPct: number | null;
  /** Dias até a prova do concurso escolhido, quando a plataforma souber. */
  provaEmDias?: number | null;
}

/** Ângulos que valem para este aluno, do mais importante ao menos. O último (objetivo) é o padrão de quem tem concurso. */
export function angulosAplicaveis(d: DadosSaudacao): AnguloSaudacao[] {
  if (d.semAtividade && !d.objetivo) return ["primeiro_acesso"];
  const out: AnguloSaudacao[] = [];
  if (!d.objetivo) out.push("sem_objetivo");
  if (d.diasSemEstudar !== null && d.diasSemEstudar >= 3) out.push("retomada");
  if (d.revisoesVencidas > 0) out.push("revisoes");
  if (d.aulaAndamento) out.push("aula_andamento");
  if (d.materiaFraca) out.push("materia_fraca");
  if (d.respondidas >= 20 && d.acertoPct !== null) out.push("desempenho");
  if (d.objetivo) out.push("objetivo");
  if (!out.length) out.push(d.objetivo ? "objetivo" : "sem_objetivo");
  return out;
}

/** Escolhe o ângulo deste acesso: o mais importante, pulando o do acesso anterior quando houver outro. */
export function escolherAngulo(d: DadosSaudacao, ultimo: string | null): AnguloSaudacao {
  const lista = angulosAplicaveis(d);
  const alvo = lista.find((a) => a !== ultimo) ?? lista[0]!;
  return alvo;
}

const num = (n: number) => String(Math.round(n));
const dias = (n: number) => `${num(n)} ${n === 1 ? "dia" : "dias"}`;

/** O que dizer neste ângulo, só com fatos que estão em `d`. */
export function fatoDoAngulo(a: AnguloSaudacao, d: DadosSaudacao): string {
  switch (a) {
    case "primeiro_acesso":
      return "É o PRIMEIRO acesso do aluno e ele ainda não escolheu o concurso. Dê boas-vindas e convide-o a digitar, no campo logo abaixo na tela, o concurso que quer passar; diga que a partir daí você monta a direção da preparação dele. Não cite desempenho nem pendências: ainda não existem.";
    case "sem_objetivo":
      return "O aluno já estuda na plataforma, mas ainda não escolheu o concurso. Peça para ele digitar o concurso no campo abaixo para você direcionar a preparação. Se couber, cite UM dado real (abaixo) só como gancho, sem cobrar.";
    case "retomada":
      return `O aluno está há ${dias(d.diasSemEstudar ?? 0)} sem estudar. Receba-o de volta com naturalidade, SEM cobrar e SEM comentar a ausência como falha; proponha uma retomada leve e concreta (uma revisão curta ou uma aula) para hoje.${d.objetivo ? ` O objetivo dele é ${d.objetivo}.` : ""}`;
    case "revisoes":
      return `O aluno tem ${num(d.revisoesVencidas)} ${d.revisoesVencidas === 1 ? "revisão pendente" : "revisões pendentes"}. Cite isso e oriente fazer as revisões primeiro, porque é o que fixa o conteúdo.${d.sequencia >= 2 ? ` Ele vem de ${dias(d.sequencia)} seguidos de estudo: pode reconhecer isso numa meia frase.` : ""}`;
    case "aula_andamento":
      return `O aluno tem uma aula em andamento: "${d.aulaAndamento?.titulo}", com ${num(d.aulaAndamento?.pct ?? 0)}% feito. Oriente a terminá-la hoje antes de abrir outra.`;
    case "materia_fraca":
      return `O ponto que mais pede reforço é ${d.materiaFraca?.nome}: ${num(d.materiaFraca?.pct ?? 0)}% de acerto em ${num(d.materiaFraca?.questoes ?? 0)} questões. Cite isso de forma construtiva e oriente um bloco curto de questões desse assunto hoje.`;
    case "desempenho":
      return `O aluno respondeu ${num(d.respondidas)} questões, com ${num(d.acertoPct ?? 0)}% de acerto. Comente o número com honestidade, sem bajular, e dê o próximo passo prático para subir esse índice.`;
    case "objetivo":
      return `O aluno está se preparando para ${d.objetivo}.${d.provaEmDias != null && d.provaEmDias >= 0 ? ` Faltam ${dias(d.provaEmDias)} para a prova.` : ""} Diga que a missão de hoje é avançar nesse concurso e dê UMA orientação prática de estudo para hoje, com base nos dados abaixo e no plano semanal.`;
  }
}

/** Instrução acrescentada ao Mentor quando a conversa abre pela tela inicial. */
export function regraSaudacao(a: AnguloSaudacao, d: DadosSaudacao): string {
  const nome = d.nome?.trim().split(/\s+/)[0];
  return [
    "ABERTURA DESTA CONVERSA (o aluno acabou de tocar em \"Falar com o Mentor\" na tela inicial do app). Esta regra tem prioridade sobre as anteriores SÓ nesta primeira fala.",
    `Fale UMA única mensagem de 20 a 40 palavras (8 a 15 segundos), em voz de conversa natural${nome ? `, começando pelo nome dele (${nome})` : ""}. Nada de tom de atendente virtual, nada de discurso motivacional, nada de lista.`,
    "Nesta abertura você PODE citar, por iniciativa própria, UM único dado real do aluno, o do tema abaixo. Nunca invente número, nota, prazo ou histórico: use só o que está nos DADOS REAIS.",
    `TEMA DESTA VEZ: ${fatoDoAngulo(a, d)}`,
    "Termine com UMA orientação prática de um passo. Não constranja o aluno por dias sem estudar e não cobre nada.",
    "Depois dessa fala, FIQUE EM SILÊNCIO e escute o aluno: não faça outra pergunta nem emende outra mensagem. Só continue se ele falar.",
  ].join(" ");
}

/** Dias corridos entre duas datas "AAAA-MM-DD" (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);
}

/** Dias seguidos de estudo terminando hoje ou ontem (`days` em qualquer ordem, "AAAA-MM-DD"). */
export function sequenciaDe(days: readonly string[], hoje: string): number {
  const set = new Set(days);
  let d = set.has(hoje) ? hoje : null;
  if (!d) {
    const ontem = new Date(Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10)) - 86_400_000).toISOString().slice(0, 10);
    d = set.has(ontem) ? ontem : null;
  }
  let n = 0;
  while (d && set.has(d)) {
    n++;
    d = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - 86_400_000).toISOString().slice(0, 10);
  }
  return n;
}
