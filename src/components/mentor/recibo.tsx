import { Check, CheckCheck } from "lucide-react";

/** Recibo de uma mensagem enviada por mim: Enviado (✓), Recebido (✓✓) ou Lido (✓✓ azul). */
export function Recibo({ deliveredAt, readAt, escuro = false, compacto = false }: { deliveredAt: string | null; readAt: string | null; escuro?: boolean; /** Só os tiques, sem a palavra (estilo WhatsApp). */ compacto?: boolean }) {
  const [rotulo, Icone, cor] = readAt ? (["Lido", CheckCheck, escuro ? "#7fd0ff" : "#1f78d1"] as const) : deliveredAt ? (["Recebido", CheckCheck, "currentColor"] as const) : (["Enviado", Check, "currentColor"] as const);
  return (
    <span className="inline-flex items-center gap-0.5 align-middle" aria-label={rotulo} data-testid="recibo" data-estado={rotulo.toLowerCase()} style={{ color: cor, WebkitTextFillColor: cor }}>
      <Icone className="h-3.5 w-3.5" aria-hidden />{!compacto && <> <span>{rotulo}</span></>}
    </span>
  );
}
