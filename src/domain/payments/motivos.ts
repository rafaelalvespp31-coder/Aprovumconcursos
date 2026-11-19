/** Motivos de recusa do Mercado Pago (campo status_detail) em português, para o admin entender o que houve. */
const MOTIVOS: Record<string, string> = {
  cc_rejected_insufficient_amount: "Saldo/limite insuficiente no cartão",
  cc_rejected_bad_filled_card_number: "Número do cartão digitado errado",
  cc_rejected_bad_filled_date: "Validade do cartão errada",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) errado",
  cc_rejected_bad_filled_other: "Dados do cartão preenchidos errado",
  cc_rejected_blacklist: "Cartão bloqueado pelo Mercado Pago (lista de risco)",
  cc_rejected_call_for_authorize: "O banco exige autorização por telefone",
  cc_rejected_card_disabled: "Cartão desabilitado: o aluno precisa ativá-lo no banco",
  cc_rejected_card_error: "Não foi possível processar o cartão",
  cc_rejected_duplicated_payment: "Pagamento duplicado (mesma compra já enviada)",
  cc_rejected_high_risk: "Recusado pelo antifraude (risco alto)",
  cc_rejected_invalid_installments: "Parcelamento não aceito por esse cartão",
  cc_rejected_max_attempts: "Limite de tentativas atingido com esse cartão",
  cc_rejected_other_reason: "O banco emissor recusou, sem informar o motivo",
  cc_rejected_rejected_by_bank: "Recusado pelo banco emissor",
  cc_rejected_rejected_by_regulations: "Recusado por regulamentação",
  cc_rejected_fraud: "Recusado por suspeita de fraude",
  cc_rejected_3ds_mandatory: "O banco exige autenticação 3D Secure",
  cc_rejected_3ds_challenge: "Autenticação 3D Secure não concluída",
  rejected_by_bank: "Recusado pelo banco",
  rejected_insufficient_data: "Dados insuficientes para o pagamento",
  rejected_high_risk: "Recusado pelo antifraude (risco alto)",
  rejected_other_reason: "Recusado sem motivo informado",
  pending_waiting_transfer: "Aguardando o aluno pagar o PIX",
  pending_waiting_payment: "Aguardando o pagamento",
  pending_contingency: "Em processamento pelo Mercado Pago",
  pending_review_manual: "Em análise manual do Mercado Pago",
  expired: "PIX expirou sem pagamento",
  cancelled_by_user: "Cancelado pelo aluno",
  accredited: "Pagamento creditado",
};

/** Texto do motivo; devolve o código original quando não conhecemos (e vazio quando não há nada). */
export function motivoPagamento(detail: string | null | undefined): string {
  const d = (detail ?? "").trim();
  if (!d) return "";
  const k = MOTIVOS[d];
  if (k) return k;
  if (/^401\b/.test(d)) return "Falha de credencial do Mercado Pago (chave de produção inválida na época)";
  if (/^cc_rejected/.test(d)) return `Cartão recusado (${d})`;
  return d;
}
