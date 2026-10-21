import type { BankStatus } from "./labels";

export interface BankRoles {
  autor: boolean;
  revisor: boolean;
  admin: boolean;
}

export interface BankAction {
  to: BankStatus;
  label: string;
  /** Exige motivo registrado. */
  needsReason: boolean;
  /** Ação de revisor. */
  reviewer: boolean;
  tone: "primario" | "secundario" | "perigo";
  /** Motivo pelo qual está indisponível (ou null). */
  blocked: string | null;
}

/** Espelha a máquina de estados do banco (bank_questions_guard / bank_decide). */
const TRANSITIONS: Record<BankStatus, Array<Omit<BankAction, "blocked">>> = {
  rascunho: [
    { to: "em_revisao", label: "Enviar para revisão", needsReason: false, reviewer: false, tone: "primario" },
    { to: "arquivada", label: "Arquivar", needsReason: true, reviewer: false, tone: "perigo" },
  ],
  importada: [
    { to: "aguardando_conferencia", label: "Mandar para conferência", needsReason: false, reviewer: false, tone: "primario" },
    { to: "arquivada", label: "Arquivar", needsReason: true, reviewer: false, tone: "perigo" },
  ],
  aguardando_conferencia: [
    { to: "em_revisao", label: "Conferida: enviar para revisão", needsReason: false, reviewer: false, tone: "primario" },
    { to: "correcao_necessaria", label: "Pedir correção", needsReason: true, reviewer: true, tone: "secundario" },
    { to: "arquivada", label: "Arquivar", needsReason: true, reviewer: false, tone: "perigo" },
  ],
  em_revisao: [
    { to: "aprovada", label: "Aprovar", needsReason: false, reviewer: true, tone: "primario" },
    { to: "correcao_necessaria", label: "Pedir correção", needsReason: true, reviewer: true, tone: "secundario" },
    { to: "arquivada", label: "Rejeitar e arquivar", needsReason: true, reviewer: false, tone: "perigo" },
  ],
  correcao_necessaria: [
    { to: "em_revisao", label: "Corrigida: reenviar para revisão", needsReason: false, reviewer: false, tone: "primario" },
    { to: "arquivada", label: "Arquivar", needsReason: true, reviewer: false, tone: "perigo" },
  ],
  aprovada: [
    { to: "publicada", label: "Publicar", needsReason: false, reviewer: true, tone: "primario" },
    { to: "em_revisao", label: "Reencaminhar para revisão", needsReason: true, reviewer: true, tone: "secundario" },
    { to: "suspensa", label: "Suspender", needsReason: true, reviewer: true, tone: "perigo" },
    { to: "arquivada", label: "Arquivar", needsReason: true, reviewer: true, tone: "perigo" },
  ],
  publicada: [
    { to: "em_revisao", label: "Reencaminhar para revisão (nova versão)", needsReason: true, reviewer: true, tone: "secundario" },
    { to: "suspensa", label: "Suspender", needsReason: true, reviewer: true, tone: "perigo" },
    { to: "arquivada", label: "Arquivar", needsReason: true, reviewer: true, tone: "perigo" },
  ],
  suspensa: [
    { to: "em_revisao", label: "Reencaminhar para revisão", needsReason: true, reviewer: true, tone: "secundario" },
    { to: "arquivada", label: "Arquivar", needsReason: true, reviewer: true, tone: "perigo" },
  ],
  arquivada: [{ to: "rascunho", label: "Reabrir como rascunho", needsReason: false, reviewer: false, tone: "secundario" }],
};

export const EDITABLE_STATUSES: ReadonlySet<BankStatus> = new Set([
  "rascunho",
  "importada",
  "aguardando_conferencia",
  "em_revisao",
  "correcao_necessaria",
]);

export interface Checklist {
  content: boolean;
  answer: boolean;
  source: boolean;
  rights: boolean;
}

export function availableActions(
  status: BankStatus,
  roles: BankRoles,
  ctx: { isCreator: boolean; checklist: Checklist; rightsOk: boolean },
): BankAction[] {
  const reviewer = roles.revisor || roles.admin;
  const anyRole = reviewer || roles.autor;
  const locked = status === "aprovada" || status === "publicada" || status === "suspensa";
  return TRANSITIONS[status].map((a) => {
    let blocked: string | null = null;
    if ((a.reviewer || locked) && !reviewer) blocked = "Somente revisores.";
    else if (!anyRole) blocked = "Sem permissão.";
    else if (a.to === "aprovada") {
      // O administrador pode validar o gabarito de questões que ele mesmo cadastrou.
      if (ctx.isCreator && !roles.admin) blocked = "Quem criou não pode aprovar: é preciso outro revisor.";
      else if (!(ctx.checklist.content && ctx.checklist.answer && ctx.checklist.source && ctx.checklist.rights)) blocked = "Marque os 4 itens do checklist.";
      else if (!ctx.rightsOk) blocked = "Direito de uso precisa ser “autorizado” ou “próprio”.";
    }
    return { ...a, needsReason: a.needsReason || (locked && a.to !== "publicada"), blocked };
  });
}
