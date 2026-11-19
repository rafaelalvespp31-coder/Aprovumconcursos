import { OFFERS, installmentOf } from "./offers";
import { sortear, type Rand } from "../mentor/variar";

/** Valores sempre vêm da tabela oficial de planos (nada digitado à mão aqui). */
const brl = (cents: number) => `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Mensagens de convite aos planos pagos para quem usa a conta gratuita. Sem urgência falsa. */
export function mensagensPlanos(): Array<{ title: string; body: string }> {
  const op = installmentOf("semestral");
  const el = installmentOf("anual");
  const porDia = brl(Math.round(OFFERS.mensal.cents / 30));
  const eliteDia = brl(Math.round(OFFERS.anual.cents / 365));
  return [
    { title: "Sua aprovação merece mais", body: `Combatente por ${OFFERS.mensal.price} ${OFFERS.mensal.per}. São só ${porDia} por dia para estudar sem travar. Toque e escolha seu plano.` },
    { title: "Menos de R$ 1 por dia", body: `${OFFERS.anual.label}: ${OFFERS.anual.price} ${OFFERS.anual.per}, cerca de ${eliteDia} por dia${el ? ` (ou 12x de ${el.value})` : ""}. Estude o ano todo sem limites.` },
    { title: "Jogue com 5 vidas", body: `No plano pago o Modo Jogo tem 5 vidas, e não 2. Comece no Combatente por ${OFFERS.mensal.price} ${OFFERS.mensal.per}.` },
    { title: "Pague uma vez, estude para sempre", body: `${OFFERS.vitalicio.label}: ${OFFERS.vitalicio.price}, ${OFFERS.vitalicio.per}. Sem mensalidade até a sua posse.` },
    { title: "Cabe no seu bolso", body: `${OFFERS.semestral.label}${op ? `: 12x de ${op.value} (${op.cash} à vista)` : ""}. Seis meses de estudo organizado. Toque para ver os planos.` },
    { title: "Concurso não se ganha no improviso", body: `Escolha seu plano: Combatente ${OFFERS.mensal.price}/mês, Operador ${OFFERS.semestral.price}, Elite Tática ${OFFERS.anual.price} ou Comando Supremo ${OFFERS.vitalicio.price}.` },
  ];
}

export const mensagemPlanos = (rand: Rand = Math.random) => sortear(mensagensPlanos(), rand);
