import "server-only";
import { createAdminClient } from "../supabase";
import { OFFERS, isOfferKey } from "@/domain/plans/offers";
import { motivoPagamento } from "@/domain/payments/motivos";

export type PagamentoSituacao = "pago" | "pix_aguardando" | "pix_expirado" | "recusado" | "reembolsado" | "cancelado" | "pendente";

export interface AdminPagamento {
  id: string;
  userId: string;
  nome: string | null;
  email: string | null;
  whatsapp: string | null;
  plano: string;
  valorCents: number;
  forma: string;
  situacao: PagamentoSituacao;
  motivo: string;
  mpId: number | null;
  criadoEm: string;
}

interface Row {
  id: string; user_id: string; offer: string; amount_cents: number; status: string; mp_payment_id: number | null;
  mp_status: string | null; mp_status_detail: string | null; method: string | null; installments: number | null;
  pix_expires_at: string | null; created_at: string;
}

/** Últimas tentativas de pagamento (pagas, PIX gerados e cartões recusados), com nome e contato do aluno. */
export async function listAdminPayments(limit = 300): Promise<AdminPagamento[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("mp_payments")
    .select("id, user_id, offer, amount_cents, status, mp_payment_id, mp_status, mp_status_detail, method, installments, pix_expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const [profs, users] = await Promise.all([
    ids.length ? db.from("profiles").select("id, display_name, whatsapp").in("id", ids) : Promise.resolve({ data: [] }),
    Promise.all(ids.map((id) => db.auth.admin.getUserById(id).then((r) => [id, r.data.user?.email ?? null] as const, () => [id, null] as const))),
  ]);
  const nome = new Map((profs.data ?? []).map((p) => [p.id as string, p as { display_name: string | null; whatsapp: string | null }]));
  const email = new Map(users);
  const agora = Date.now();
  return rows.map((r) => {
    const pix = r.method === "pix";
    let situacao: PagamentoSituacao;
    if (r.status === "aprovado") situacao = "pago";
    else if (r.status === "reembolsado") situacao = "reembolsado";
    else if (r.status === "recusado") situacao = "recusado";
    else if (r.status === "cancelado") situacao = pix && r.mp_status_detail === "expired" ? "pix_expirado" : "cancelado";
    else if (pix) situacao = r.pix_expires_at && Date.parse(r.pix_expires_at) < agora ? "pix_expirado" : "pix_aguardando";
    else situacao = "pendente";
    const motivo = r.status === "aprovado" ? "" : situacao === "pix_expirado" ? "PIX expirou sem pagamento" : situacao === "pix_aguardando" ? "Aguardando o aluno pagar o PIX" : motivoPagamento(r.mp_status_detail) || (situacao === "recusado" ? "Sem motivo registrado" : "");
    const p = nome.get(r.user_id);
    return {
      id: r.id, userId: r.user_id, nome: p?.display_name ?? null, email: email.get(r.user_id) ?? null, whatsapp: p?.whatsapp ?? null,
      plano: isOfferKey(r.offer) ? OFFERS[r.offer].label : r.offer, valorCents: r.amount_cents,
      forma: pix ? "PIX" : `Cartão${r.installments && r.installments > 1 ? ` ${r.installments}x` : ""}`,
      situacao, motivo, mpId: r.mp_payment_id, criadoEm: r.created_at,
    };
  });
}
