import { AlertTriangle, BookOpen, Calculator, CheckCircle2, Clock, Gavel, HelpCircle, Landmark, Lightbulb, ListChecks, MessageSquareQuote, NotebookPen, Pin, Scale, ScrollText, ShieldAlert, Sparkles, SplitSquareHorizontal, Star, Target, type LucideIcon } from "lucide-react";
import type { CalloutKind } from "@/domain/content/callout-kind";

export const CALLOUT: Record<CalloutKind, { Icon: LucideIcon; tone: string; name: string }> = {
  pegadinha: { Icon: ShieldAlert, tone: "#C77700", name: "Pegadinha" },
  atencao: { Icon: AlertTriangle, tone: "#B3261E", name: "Atenção" },
  observacao: { Icon: NotebookPen, tone: "#1F5FBF", name: "Observação" },
  dica: { Icon: Lightbulb, tone: "#1E8E5A", name: "Dica" },
  exemplo: { Icon: Sparkles, tone: "#8A3FC4", name: "Exemplo" },
  importante: { Icon: Star, tone: "#B3261E", name: "Importante" },
  conceito: { Icon: BookOpen, tone: "#1F5FBF", name: "Conceito" },
  regra: { Icon: Pin, tone: "#2A2D33", name: "Regra" },
  excecao: { Icon: SplitSquareHorizontal, tone: "#C77700", name: "Exceção" },
  prazo: { Icon: Clock, tone: "#1F5FBF", name: "Prazo" },
  pena: { Icon: Scale, tone: "#B3261E", name: "Pena" },
  jurisprudencia: { Icon: Gavel, tone: "#2A2D33", name: "Jurisprudência" },
  doutrina: { Icon: Landmark, tone: "#8A3FC4", name: "Doutrina" },
  mnemonico: { Icon: ListChecks, tone: "#1E8E5A", name: "Mnemônico" },
  resumo: { Icon: Target, tone: "#B3261E", name: "Resumo" },
  comparacao: { Icon: Calculator, tone: "#1F5FBF", name: "Comparação" },
  lembrar: { Icon: CheckCircle2, tone: "#1E8E5A", name: "Lembre" },
  duvida: { Icon: HelpCircle, tone: "#8A3FC4", name: "Dúvida" },
  resolucao: { Icon: CheckCircle2, tone: "#1E8E5A", name: "Resolução" },
  enunciado: { Icon: MessageSquareQuote, tone: "#2A2D33", name: "Enunciado" },
  fundamento: { Icon: ScrollText, tone: "#2A2D33", name: "Fundamento" },
};

/** Ícone redondo da explicação (decorativo: o texto já diz o tipo). */
export function CalloutIcon({ kind, size = 16 }: { kind: CalloutKind; size?: number }) {
  const { Icon, tone } = CALLOUT[kind];
  return (
    <span className="ap-ico" style={{ background: tone }} aria-hidden>
      <Icon size={size} strokeWidth={2.2} />
    </span>
  );
}
