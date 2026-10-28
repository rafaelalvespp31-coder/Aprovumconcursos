/**
 * Mentor APROVUM — assistente conversacional guiado (sem IA): reconhece a intenção da pergunta
 * e responde só com o que o motor calculou a partir dos dados reais. Sem dado, diz que não há.
 * Puro: mesma pergunta + mesmos dados → mesma resposta.
 */
import { normalizeText } from "@/domain/catalog/match";
import { lessonAfter, type MentorLesson, type MentorResult, type Recommendation } from "./engine";

export const MENTOR_INTENTS = [
  "porque",
  "depois_aula",
  "revisoes",
  "erros",
  "melhorar",
  "terminar_materia",
  "concluidas",
  "pendente",
  "hoje",
  "saudacao",
  "ajuda",
  "fallback",
] as const;
export type MentorIntent = (typeof MENTOR_INTENTS)[number];

/** Perguntas rápidas (botões no chat). */
export const QUICK_QUESTIONS: Array<{ label: string; text: string }> = [
  { label: "O que estudar hoje?", text: "O que devo estudar hoje?" },
  { label: "O que está pendente?", text: "O que está pendente?" },
  { label: "Onde estou errando mais?", text: "Em quais assuntos estou errando mais?" },
  { label: "Revisões vencidas", text: "Quais revisões estão vencidas?" },
  { label: "Por que essa recomendação?", text: "Por que você está recomendando essa atividade?" },
  { label: "O que já concluí?", text: "Quais tarefas já concluí?" },
];

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));

/** Reconhece a intenção (as mais específicas primeiro). */
export function detectIntent(raw: string): MentorIntent {
  const t = ` ${normalizeText(raw)} `;
  if (!t.trim()) return "fallback";
  if (has(t, " por que ", " porque ", " por qual motivo", " motivo", " razao", " justifica")) return "porque";
  if (has(t, "depois de concluir", "depois que eu concluir", "depois de terminar", "depois dessa aula", "depois desta aula", "proxima aula", "o que vem depois")) return "depois_aula";
  if (has(t, "revis")) return "revisoes";
  if (has(t, "errando", "erro mais", "erros", "erro ", "onde erro", "mais erro")) return "erros";
  if (has(t, "desempenho", "melhorar", "fraco", "fraca", "dificuldade", "acerto")) return "melhorar";
  if (has(t, "terminar", "concluir", "finalizar") && has(t, "materia", "aula", "assunto", "qual")) return "terminar_materia";
  if (has(t, "conclui", "concluidas", "concluidos", "ja fiz", "terminei", "finalizei", "completei")) return "concluidas";
  if (has(t, "pendente", "pendencia", "falta ", "faltando", "atrasad")) return "pendente";
  if (has(t, "estudar hoje", "estudo hoje", "estudar agora", "o que estudar", "o que devo", "por onde comec", "o que faco", "o que eu faco", "proximo passo", "hoje")) return "hoje";
  if (/^\s*(oi|ola|bom dia|boa tarde|boa noite|e ai|opa)\b/.test(t)) return "saudacao";
  if (has(t, "ajuda", "o que voce faz", "como funciona", "o que voce sabe")) return "ajuda";
  return "fallback";
}

export interface MentorReply {
  intent: MentorIntent;
  /** Parágrafos da resposta. */
  text: string[];
  /** Itens (lista) com ação opcional. */
  items: Array<{ title: string; detail: string; href?: string; actionLabel?: string }>;
}

export interface ChatContext {
  result: MentorResult;
  /** As recomendações apresentadas agora (já sem as dispensadas). */
  visible: Recommendation[];
  lessons: MentorLesson[];
}

const asItem = (r: Recommendation) => ({ title: r.explanation, detail: r.reason, href: r.href, actionLabel: r.actionLabel });
const NO_DATA = "Ainda não tenho dados seus suficientes para isso. Comece um estudo ou resolva algumas questões e eu acompanho daqui.";

export function answer(raw: string, ctx: ChatContext): MentorReply {
  const intent = detectIntent(raw);
  const { result, visible } = ctx;
  const pend = result.all.filter((r) => r.kind !== "manutencao");
  const reply = (text: string[], items: MentorReply["items"] = []): MentorReply => ({ intent, text, items });

  switch (intent) {
    case "hoje": {
      if (result.insufficientData) return reply([NO_DATA]);
      if (!visible.length) return reply(["Você não tem pendências agora. Escolha um novo assunto em Estudos ou resolva um caderno de questões."]);
      return reply([`Minha sugestão para hoje, em ordem de prioridade:`], visible.map(asItem));
    }
    case "pendente": {
      if (result.insufficientData) return reply([NO_DATA]);
      if (!pend.length) return reply(["Não encontrei pendências: nenhuma aula iniciada sem concluir, nenhuma revisão vencida e nenhum caderno pela metade."]);
      return reply([`Encontrei ${pend.length} ${pend.length === 1 ? "pendência" : "pendências"}:`], pend.slice(0, 8).map(asItem));
    }
    case "terminar_materia": {
      const open = result.all.filter((r) => r.kind === "aula_pendente" || r.kind === "questoes_pendentes");
      if (!open.length) return reply([result.insufficientData ? NO_DATA : "Não há aula iniciada esperando conclusão."]);
      return reply([`Termine ${open.length === 1 ? "esta aula" : "estas aulas"} (a primeira é a mais urgente):`], open.slice(0, 5).map(asItem));
    }
    case "erros":
    case "melhorar": {
      const ranked = result.topics.filter((t) => t.band === "reforco" || t.band === "consolidacao").sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0) || b.valid - a.valid);
      const small = result.topics.filter((t) => t.band === "amostra_insuficiente");
      if (!ranked.length) {
        if (small.length) return reply([`Ainda não dá para dizer onde você erra mais: ${small.length === 1 ? "o assunto que você praticou tem" : "os assuntos que você praticou têm"} menos de 10 respostas válidas. Resolva mais questões e eu faço o diagnóstico.`], small.slice(0, 5).map((t) => ({ title: t.subject ? `${t.subject} — ${t.label}` : t.label, detail: `${t.valid} ${t.valid === 1 ? "resposta válida" : "respostas válidas"} até agora`, href: t.href, actionLabel: "Praticar" })));
        return reply([result.topics.some((t) => t.valid > 0) ? "Seu desempenho está a partir de 85% em todos os assuntos com amostra suficiente. Mantenha com revisões." : NO_DATA]);
      }
      return reply(
        [intent === "erros" ? "Os assuntos em que você mais erra (com pelo menos 10 respostas válidas):" : "Onde seu desempenho precisa melhorar:"],
        ranked.slice(0, 5).map((t) => ({
          title: t.subject ? `${t.subject} — ${t.label}` : t.label,
          detail: `${t.correct} de ${t.valid} certas (${String(t.pct).replace(".", ",")}%) — ${t.band === "reforco" ? "reforço prioritário" : "consolidação"}`,
          href: t.href,
          actionLabel: t.band === "reforco" ? "Reforçar" : "Praticar",
        })),
      );
    }
    case "revisoes": {
      const due = result.all.filter((r) => r.kind === "revisao_vencida");
      if (!due.length) return reply(["Nenhuma revisão vencida pelas datas registradas. Quando uma revisão vencer, ela aparece aqui."]);
      return reply([`${due.length} ${due.length === 1 ? "revisão vencida" : "revisões vencidas"}:`], due.map(asItem));
    }
    case "depois_aula": {
      const current = result.all.find((r) => r.kind === "aula_pendente" || r.kind === "questoes_pendentes");
      if (!current) {
        const next = result.all.find((r) => r.kind === "proxima_aula");
        return next ? reply(["Você não tem aula em andamento. A próxima na sequência é:"], [asItem(next)]) : reply([result.insufficientData ? NO_DATA : "Não encontrei uma próxima aula liberada nos seus estudos."]);
      }
      const after = lessonAfter(ctx.lessons, current.entity.id);
      const steps = [`Primeiro, conclua ${current.entity.label}: a leitura e os três níveis de questões (fácil, médio e difícil), cada um com 90% de acertos.`];
      if (after) return reply([...steps, `Depois, a próxima aula do mesmo estudo é ${after.title}.`], [asItem(current), { title: `Depois: ${after.title}`, detail: `Próxima aula de "${after.trailTitle}" na sequência.`, href: `/aula/${after.id}`, actionLabel: "Ver aula" }]);
      return reply([...steps, "Ela é a última aula pendente deste estudo: depois, revise ou escolha um novo assunto."], [asItem(current)]);
    }
    case "porque": {
      if (!visible.length) return reply([result.insufficientData ? NO_DATA : "Não estou recomendando nenhuma atividade agora porque não encontrei pendências."]);
      return reply(["Cada recomendação vem de um dado real seu:"], visible.map((r) => ({ title: r.explanation, detail: `Motivo: ${r.reason} (regra ${r.rule})`, href: r.href, actionLabel: r.actionLabel })));
    }
    case "concluidas": {
      const done = result.completedLessons;
      if (!done.length) return reply([result.insufficientData ? NO_DATA : "Você ainda não concluiu nenhuma aula (leitura + três níveis de questões aprovados)."]);
      return reply([`Você concluiu ${done.length} ${done.length === 1 ? "aula" : "aulas"}:`], done.slice(0, 10).map((l) => ({ title: l.subject ? `${l.subject} — ${l.title}` : l.title, detail: "Leitura concluída e três níveis de questões aprovados.", href: `/aula/${l.id}`, actionLabel: "Rever" })));
    }
    case "saudacao":
      return reply(["Olá! Sou o seu Mentor APROVUM. Olho o seu progresso real e digo o que fazer a seguir. Pergunte, por exemplo: “O que devo estudar hoje?”"]);
    case "ajuda":
      return reply(["Eu respondo com base nos seus dados: aulas em andamento, questões de fixação, desempenho por assunto, revisões e cadernos. Use as perguntas rápidas abaixo."]);
    default:
      return reply(["Ainda não sei responder a isso. Posso dizer o que estudar hoje, o que está pendente, onde você erra mais, quais revisões venceram, o que vem depois da aula atual, por que recomendei algo e o que você já concluiu."]);
  }
}
