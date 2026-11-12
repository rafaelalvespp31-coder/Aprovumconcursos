import "server-only";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";
import { UserFacingError, enforceRateLimit } from "./trails";
import { OFFERS, isOfferKey, type OfferKey } from "@/domain/plans/offers";
import { accessEnd, isValidCpf, mapStatus, toCents, type PayStatus } from "@/domain/payments/mercadopago";
import { effectivePlan } from "@/domain/plans/limits";
import { cancelOnRefund, rewardOnPurchase } from "./referral";

/** Configuração do Mercado Pago (o Access Token fica só no servidor). */
export function mpConfigured(): boolean {
  return !!process.env.MERCADO_PAGO_ACCESS_TOKEN;
}
function payments(): Payment {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new UserFacingError("O pagamento online ainda não está disponível. Tente mais tarde.", "mp_not_configured");
  return new Payment(new MercadoPagoConfig({ accessToken: token, options: { timeout: 15000 } }));
}
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aprovumconcursos.com.br").replace(/\/$/, "");

interface Row {
  id: string;
  user_id: string;
  offer: OfferKey;
  amount_cents: number;
  status: PayStatus;
  mp_payment_id: number | null;
  mp_status: string | null;
  mp_status_detail: string | null;
  method: string | null;
  installments: number | null;
  total_paid_cents: number | null;
  pix_qr_code: string | null;
  pix_qr_base64: string | null;
  pix_expires_at: string | null;
  approved_at: string | null;
  applied_at: string | null;
  created_at: string;
}
const COLS = "id, user_id, offer, amount_cents, status, mp_payment_id, mp_status, mp_status_detail, method, installments, total_paid_cents, pix_qr_code, pix_qr_base64, pix_expires_at, approved_at, applied_at, created_at";

/** Resposta do Mercado Pago (só os campos que usamos). */
interface MpPayment {
  id?: number;
  status?: string;
  status_detail?: string;
  currency_id?: string;
  transaction_amount?: number;
  external_reference?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  installments?: number;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  transaction_details?: { total_paid_amount?: number };
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
}

const str = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export interface CreateInput {
  offer: unknown;
  formData: unknown;
  /** Identificador do dispositivo (antifraude do Mercado Pago). */
  deviceId?: unknown;
  email: string | null;
}

export interface PublicPayment {
  id: string;
  offer: OfferKey;
  status: PayStatus;
  method: string | null;
  installments: number | null;
  amountCents: number;
  totalPaidCents: number | null;
  statusDetail: string | null;
  pix: { qrCode: string; qrBase64: string | null; expiresAt: string | null } | null;
  createdAt: string;
}

function toPublic(r: Row): PublicPayment {
  return {
    id: r.id,
    offer: r.offer,
    status: r.status,
    method: r.method,
    installments: r.installments,
    amountCents: r.amount_cents,
    totalPaidCents: r.total_paid_cents,
    statusDetail: r.mp_status_detail,
    pix: r.status === "pendente" && r.pix_qr_code ? { qrCode: r.pix_qr_code, qrBase64: r.pix_qr_base64, expiresAt: r.pix_expires_at } : null,
    createdAt: r.created_at,
  };
}

/** Cria o pagamento no Mercado Pago. O valor vem do catálogo do servidor, nunca do navegador. */
export async function createPayment(userId: string, input: CreateInput): Promise<PublicPayment> {
  if (!isOfferKey(input.offer)) throw new UserFacingError("Plano inválido.", "invalid_plan");
  const offer = input.offer;
  const fd = (input.formData && typeof input.formData === "object" ? input.formData : {}) as Record<string, unknown>;
  const methodId = str(fd.payment_method_id, 40).toLowerCase();
  if (!/^[a-z0-9_]{2,40}$/.test(methodId)) throw new UserFacingError("Escolha a forma de pagamento.", "invalid_input");
  const isPix = methodId === "pix";
  const token = str(fd.token, 200);
  if (!isPix && !token) throw new UserFacingError("Dados do cartão incompletos.", "invalid_input");
  const installments = isPix ? 1 : Number(fd.installments);
  if (!Number.isInteger(installments) || installments < 1 || installments > 12) throw new UserFacingError("Parcelamento inválido.", "invalid_input");
  const payerIn = (fd.payer && typeof fd.payer === "object" ? fd.payer : {}) as Record<string, unknown>;
  const email = str(payerIn.email, 120) || input.email || "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new UserFacingError("Informe um e-mail válido para o pagamento.", "invalid_input");
  const idIn = (payerIn.identification && typeof payerIn.identification === "object" ? payerIn.identification : null) as Record<string, unknown> | null;
  const identification = idIn && str(idIn.number, 20) ? { type: str(idIn.type, 10) || "CPF", number: str(idIn.number, 20).replace(/\D/g, "") } : undefined;

  // PIX: o CPF do pagador é obrigatório (o antifraude do Mercado Pago recusa PIX sem ele).
  if (isPix && !isValidCpf(identification?.number)) throw new UserFacingError("Informe um CPF válido para gerar o PIX.", "invalid_input");

  await enforceRateLimit(userId, "pay_create", 8);
  const price = OFFERS[offer];
  const db = createAdminClient();
  const ins = await db.from("mp_payments").insert({ user_id: userId, offer, amount_cents: price.cents, method: isPix ? "pix" : "cartao", installments }).select(COLS).single();
  if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "falha ao registrar o pagamento");
  const row = ins.data as unknown as Row;

  // Dados que o antifraude do Mercado Pago usa para confiar no pagamento: nome do pagador e dispositivo.
  const prof = await db.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  const fullName = str(prof.data?.display_name, 80);
  const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
  const lastName = rest.join(" ");
  const deviceId = str(input.deviceId, 120).replace(/[^\w.\-:]/g, "");

  let mp: MpPayment;
  try {
    const body: Record<string, unknown> = {
      transaction_amount: price.cents / 100,
      description: `APROVUM — ${price.label}`,
      payment_method_id: methodId,
      installments,
      payer: { email, ...(firstName ? { first_name: firstName } : {}), ...(lastName ? { last_name: lastName } : {}), ...(identification ? { identification } : {}) },
      additional_info: {
        items: [{ id: offer, title: `APROVUM — ${price.label}`, description: `Acesso à plataforma APROVUM (${price.label})`, category_id: "learnings", quantity: 1, unit_price: price.cents / 100 }],
        ...(firstName ? { payer: { first_name: firstName, ...(lastName ? { last_name: lastName } : {}) } } : {}),
      },
      external_reference: row.id,
      notification_url: `${siteUrl()}/api/webhooks/mercadopago`,
      statement_descriptor: "APROVUM",
      metadata: { user_id: userId, offer },
    };
    if (!isPix) {
      body.token = token;
      const issuer = str(fd.issuer_id, 20);
      if (/^\d+$/.test(issuer)) body.issuer_id = Number(issuer);
    } else {
      body.date_of_expiration = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("Z", "-00:00");
    }
    mp = (await payments().create({ body: body as never, requestOptions: { idempotencyKey: row.id, ...(deviceId ? { meliSessionId: deviceId } : {}) } })) as MpPayment;
  } catch (e) {
    const err = e as { message?: string; error?: string; status?: number; cause?: unknown };
    // Motivo devolvido pelo Mercado Pago (sem dados sensíveis): ajuda a diagnosticar no banco.
    let why = String(err?.message ?? e);
    try {
      const c = Array.isArray(err?.cause) ? (err.cause as Array<{ code?: unknown; description?: unknown }>).map((x) => `${x?.code ?? ""}:${x?.description ?? ""}`).join(" | ") : "";
      why = `${err?.status ?? ""} ${why} ${c}`.trim();
    } catch {
      /* mantém a mensagem simples */
    }
    await db.from("mp_payments").update({ status: "recusado", mp_status: "error", mp_status_detail: why.slice(0, 280), updated_at: new Date().toISOString() }).eq("id", row.id);
    await logEvent("payments.create.failed", { error: why.slice(0, 300) });
    if (e instanceof UserFacingError) throw e;
    throw new UserFacingError("Não foi possível processar o pagamento. Confira os dados e tente novamente.", "payment_failed");
  }
  const updated = await recordFromMp(row, mp);
  return toPublic(updated);
}

/** Grava o que o Mercado Pago informou e, se aprovado e conferido, libera o plano. */
async function recordFromMp(row: Row, mp: MpPayment): Promise<Row> {
  const db = createAdminClient();
  const status = mapStatus(mp.status);
  const amountOk = toCents(mp.transaction_amount) === row.amount_cents && (mp.currency_id ?? "BRL") === "BRL";
  const qr = mp.point_of_interaction?.transaction_data;
  const upd = {
    mp_payment_id: typeof mp.id === "number" ? mp.id : row.mp_payment_id,
    mp_status: mp.status ?? null,
    mp_status_detail: mp.status_detail ?? null,
    method: mp.payment_method_id === "pix" ? "pix" : (mp.payment_type_id ?? row.method),
    installments: mp.installments ?? row.installments,
    total_paid_cents: toCents(mp.transaction_details?.total_paid_amount),
    pix_qr_code: qr?.qr_code ?? row.pix_qr_code,
    pix_qr_base64: qr?.qr_code_base64 ?? row.pix_qr_base64,
    pix_expires_at: mp.date_of_expiration ?? row.pix_expires_at,
    // Valor ou moeda diferentes do pedido: nunca vira aprovado.
    status: status === "aprovado" && !amountOk ? ("pendente" as PayStatus) : status,
    approved_at: status === "aprovado" && amountOk ? (mp.date_approved ?? new Date().toISOString()) : row.approved_at,
    updated_at: new Date().toISOString(),
  };
  if (status === "aprovado" && !amountOk) await logEvent("payments.amount_mismatch", { paymentId: row.id, mp: mp.transaction_amount, expected: row.amount_cents });
  const { data, error } = await db.from("mp_payments").update(upd).eq("id", row.id).select(COLS).single();
  if (error || !data) throw new Error(error?.message ?? "falha ao atualizar o pagamento");
  const out = data as unknown as Row;
  if (out.status === "aprovado") await activate(out);
  else if (out.status === "reembolsado" && out.applied_at) await revoke(out);
  return out;
}

/** Libera o plano uma única vez (idempotente): quem "reivindica" o applied_at é quem aplica. */
async function activate(row: Row): Promise<void> {
  const db = createAdminClient();
  const claim = await db.from("mp_payments").update({ applied_at: new Date().toISOString() }).eq("id", row.id).eq("status", "aprovado").is("applied_at", null).select("id");
  if (claim.error) throw new Error(claim.error.message);
  if (!claim.data?.length) return; // já aplicado
  try {
    const { data: cur } = await db.from("subscriptions").select("plan_id, status, current_period_end").eq("user_id", row.user_id).maybeSingle();
    const eff = effectivePlan(cur ? { planId: cur.plan_id as string, status: cur.status as string, currentPeriodEnd: cur.current_period_end as string | null } : null);
    const end = accessEnd(row.offer, { end: (cur?.current_period_end as string | null) ?? null, paid: eff.paid });
    const now = new Date().toISOString();
    const lifetime = end === null;
    const up = await db.from("subscriptions").upsert(
      { user_id: row.user_id, plan_id: lifetime ? "premium" : "pro", status: "active", current_period_end: end, billing_period: lifetime ? null : row.offer, paid_at: now, updated_at: now },
      { onConflict: "user_id" },
    );
    if (up.error) throw new Error(up.error.message);
    const rec = await db.from("subscription_payments").insert({
      user_id: row.user_id,
      plan_id: lifetime ? "premium" : "pro",
      period: row.offer === "vitalicio" ? "anual" : row.offer,
      amount_cents: row.amount_cents,
      paid_at: now,
      period_end: end ?? new Date("2099-12-31T23:59:59Z").toISOString(),
      note: `Mercado Pago #${row.mp_payment_id ?? "?"} — ${OFFERS[row.offer].label}${lifetime ? " (vitalício)" : ""}`,
    });
    if (rec.error) throw new Error(rec.error.message);
    await logEvent("payments.activated", { paymentId: row.id, offer: row.offer });
    // Indicação: plano pago do indicado dá copo + camisa a quem indicou e a ele (nunca derruba a liberação do plano).
    await rewardOnPurchase(row.user_id, row.id, row.offer).catch((e) => logEvent("referral.reward_failed", { paymentId: row.id, error: String((e as Error).message).slice(0, 200) }));
  } catch (e) {
    await db.from("mp_payments").update({ applied_at: null }).eq("id", row.id); // permite nova tentativa
    throw e;
  }
}

/** Reembolso/estorno de um pagamento já liberado: volta ao gratuito se foi o último pagamento aplicado. */
async function revoke(row: Row): Promise<void> {
  const db = createAdminClient();
  const { data: last } = await db.from("mp_payments").select("id").eq("user_id", row.user_id).not("applied_at", "is", null).in("status", ["aprovado", "reembolsado"]).order("applied_at", { ascending: false }).limit(1);
  if (last?.[0]?.id !== row.id) return;
  const { error } = await db.from("subscriptions").update({ plan_id: "free", current_period_end: null, billing_period: null, updated_at: new Date().toISOString() }).eq("user_id", row.user_id);
  if (error) throw new Error(error.message);
  await logEvent("payments.revoked", { paymentId: row.id });
  await cancelOnRefund(row.id).catch(() => undefined);
}

/** Consulta o pagamento direto na API do Mercado Pago e atualiza o nosso registro (webhook e status). */
export async function syncPayment(mpId: number | string): Promise<{ ok: boolean; reason?: string }> {
  const id = Number(mpId);
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, reason: "id inválido" };
  const mp = (await payments().get({ id })) as MpPayment;
  const ref = mp.external_reference ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return { ok: false, reason: "sem referência" };
  const db = createAdminClient();
  const { data } = await db.from("mp_payments").select(COLS).eq("id", ref).maybeSingle();
  if (!data) return { ok: false, reason: "pedido desconhecido" };
  const row = data as unknown as Row;
  if (row.mp_payment_id && row.mp_payment_id !== id) return { ok: false, reason: "pagamento não corresponde ao pedido" };
  await recordFromMp(row, mp);
  return { ok: true };
}

/** Estado do pagamento do aluno; se ainda pendente, confirma agora direto no Mercado Pago. */
export async function getPaymentStatus(userId: string, id: string): Promise<PublicPayment | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = createAdminClient();
  let { data } = await db.from("mp_payments").select(COLS).eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  let row = data as unknown as Row;
  if (row.status === "pendente" && row.mp_payment_id && mpConfigured()) {
    await syncPayment(row.mp_payment_id).catch(() => undefined);
    ({ data } = await db.from("mp_payments").select(COLS).eq("id", id).eq("user_id", userId).maybeSingle());
    if (data) row = data as unknown as Row;
  }
  return toPublic(row);
}

export async function listMyPayments(userId: string): Promise<PublicPayment[]> {
  const { data, error } = await createAdminClient().from("mp_payments").select(COLS).eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).filter((r) => r.mp_payment_id || r.status !== "pendente").map(toPublic);
}

/** Registro de eventos de webhook já processados (evita processar duas vezes). Devolve false se já existia. */
export async function claimWebhookEvent(key: string, mpId: number | null): Promise<boolean> {
  const { error } = await createAdminClient().from("mp_webhook_events").insert({ event_key: key.slice(0, 200), mp_payment_id: mpId });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}
export async function releaseWebhookEvent(key: string): Promise<void> {
  await createAdminClient().from("mp_webhook_events").delete().eq("event_key", key.slice(0, 200));
}
