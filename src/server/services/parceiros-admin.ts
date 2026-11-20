import "server-only";
import { z } from "zod";
import { createAdminClient } from "../supabase";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";
import { attributionWindowDays } from "./referrals";
import { ALL_OFFERS, normalizeCouponCode, partnerLink } from "@/domain/partners/coupon";

// Link do parceiro sempre no endereço oficial, independente de variável de ambiente.
const site = () => "https://aprovumconcursos.com.br";
const pct = (min: number) => z.coerce.number().min(min, "Percentual inválido.").max(100, "Percentual inválido.");
const optInt = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().positive("Limite inválido.").nullable());
const optDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Data inválida.").nullable());

export const partnerInput = z.object({
  name: z.string().trim().min(2, "Informe o nome do parceiro.").max(120),
  code: z.string().transform((v) => normalizeCouponCode(v)).refine((v): v is string => !!v, "Código do cupom inválido (3 a 40 letras ou números)."),
  discountPct: pct(0.01),
  commissionPct: pct(0),
  status: z.enum(["ativo", "inativo"]),
  maxUses: optInt,
  expiresAt: optDate,
  stackable: z.coerce.boolean().default(false),
  offers: z.array(z.string()).min(1, "Escolha ao menos um plano elegível.").refine((a) => a.every((o) => (ALL_OFFERS as readonly string[]).includes(o)), "Plano inválido."),
});
export type PartnerInput = z.infer<typeof partnerInput>;
const slugOf = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export async function createPartnerWithCoupon(adminId: string, raw: unknown): Promise<string> {
  const i = partnerInput.parse(raw);
  const db = createAdminClient();
  const [dupC, dupP] = await Promise.all([
    db.from("partner_coupons").select("id").eq("code", i.code).maybeSingle(),
    db.from("partners").select("id").ilike("display_name", i.name).maybeSingle(),
  ]);
  if (dupC.data) throw new UserFacingError("Já existe um cupom com esse código.", "dup_code");
  if (dupP.data) throw new UserFacingError("Já existe um parceiro com esse nome.", "dup_name");
  const { data: p, error } = await db.from("partners").insert({ display_name: i.name, slug: slugOf(i.name) || i.code.toLowerCase(), status: i.status, commission_pct: i.commissionPct }).select("id").single();
  if (error) throw new UserFacingError(error.code === "23505" ? "Esse parceiro já existe." : "Não foi possível cadastrar o parceiro.", "partner_insert");
  const { error: e2 } = await db.from("partner_coupons").insert({ partner_id: p.id, code: i.code, discount_pct: i.discountPct, status: i.status, max_uses: i.maxUses, expires_at: i.expiresAt, stackable: false, eligible_offers: i.offers });
  if (e2) {
    await db.from("partners").delete().eq("id", p.id); // desfaz: o parceiro acabou de ser criado e não tem nada ligado
    throw new UserFacingError(e2.code === "23505" ? "Já existe um cupom com esse código." : "Não foi possível criar o cupom.", "coupon_insert");
  }
  await auditLog(db, { actorId: adminId, userId: null, action: "partners.created", entity: "partners", entityId: p.id as string, meta: { code: i.code, discountPct: i.discountPct, commissionPct: i.commissionPct } });
  return p.id as string;
}

export async function updatePartnerWithCoupon(adminId: string, partnerId: string, couponId: string, raw: unknown): Promise<void> {
  const i = partnerInput.parse(raw);
  const db = createAdminClient();
  const { data: clash } = await db.from("partner_coupons").select("id").eq("code", i.code).neq("id", couponId).maybeSingle();
  if (clash) throw new UserFacingError("Já existe outro cupom com esse código.", "dup_code");
  const { data: before } = await db.from("partner_coupons").select("code, discount_pct, status, max_uses, expires_at, eligible_offers, partners(display_name, commission_pct, status)").eq("id", couponId).eq("partner_id", partnerId).maybeSingle();
  if (!before) throw new UserFacingError("Cupom não encontrado.", "not_found");
  const now = new Date().toISOString();
  const a = await db.from("partners").update({ display_name: i.name, status: i.status, commission_pct: i.commissionPct, updated_at: now }).eq("id", partnerId);
  const b = await db.from("partner_coupons").update({ code: i.code, discount_pct: i.discountPct, status: i.status, max_uses: i.maxUses, expires_at: i.expiresAt, eligible_offers: i.offers, updated_at: now }).eq("id", couponId);
  if (a.error || b.error) throw new UserFacingError("Não foi possível salvar. Tente novamente.", "update");
  await auditLog(db, { actorId: adminId, userId: null, action: "partners.updated", entity: "partners", entityId: partnerId, meta: { before, after: { code: i.code, discountPct: i.discountPct, commissionPct: i.commissionPct, status: i.status, maxUses: i.maxUses, expiresAt: i.expiresAt, offers: i.offers } } });
}

export async function setPartnerStatus(adminId: string, partnerId: string, status: "ativo" | "inativo"): Promise<void> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const a = await db.from("partners").update({ status, updated_at: now }).eq("id", partnerId);
  const b = await db.from("partner_coupons").update({ status, updated_at: now }).eq("partner_id", partnerId);
  if (a.error || b.error) throw new UserFacingError("Não foi possível alterar a situação.", "status");
  await auditLog(db, { actorId: adminId, userId: null, action: status === "ativo" ? "partners.activated" : "partners.suspended", entity: "partners", entityId: partnerId });
}

/** Comissão por etapas: calculada → aprovada → paga. Só a partir de venda paga; sem pagamento automático. */
export async function setCommissionStatus(adminId: string, redemptionId: string, to: "aprovada" | "paga"): Promise<void> {
  const db = createAdminClient();
  const { data } = await db.from("partner_coupon_redemptions").select("id, status, commission_status, commission_cents, partner_id").eq("id", redemptionId).maybeSingle();
  if (!data || data.status !== "aprovado") throw new UserFacingError("A comissão só vale para venda aprovada.", "not_approved");
  const from = data.commission_status as string;
  const ok = (to === "aprovada" && from === "calculada") || (to === "paga" && from === "aprovada");
  if (!ok) throw new UserFacingError("Etapa de comissão inválida.", "bad_step");
  const { error } = await db.from("partner_coupon_redemptions").update({ commission_status: to, updated_at: new Date().toISOString() }).eq("id", redemptionId).eq("commission_status", from);
  if (error) throw new UserFacingError("Não foi possível atualizar a comissão.", "commission");
  await auditLog(db, { actorId: adminId, userId: null, action: `partners.commission_${to}`, entity: "partner_coupon_redemptions", entityId: redemptionId, meta: { cents: data.commission_cents } });
}

export async function setAttributionWindow(adminId: string, raw: unknown): Promise<void> {
  const days = z.coerce.number().int().min(1, "Janela inválida (1 a 365 dias).").max(365, "Janela inválida (1 a 365 dias).").parse(raw);
  const db = createAdminClient();
  const { error } = await db.from("partner_program_settings").update({ attribution_window_days: days, updated_at: new Date().toISOString() }).eq("singleton", true);
  if (error) throw new UserFacingError("Não foi possível salvar a janela.", "window");
  await auditLog(db, { actorId: adminId, userId: null, action: "partners.window_changed", entity: "partner_program_settings", meta: { days } });
}

export interface PartnerRow {
  id: string; name: string; status: string; commissionPct: number;
  couponId: string | null; code: string | null; discountPct: number; maxUses: number | null; expiresAt: string | null; offers: string[]; link: string | null;
  referrals: number; sales: number; grossCents: number; discountCents: number; commissionDueCents: number;
}
export interface Kpis { partners: number; active: number; referrals: number; sales: number; grossCents: number; discountCents: number; commissionDueCents: number }

export async function partnersList(opts: { q?: string; status?: string; page?: number; perPage?: number }): Promise<{ rows: PartnerRow[]; total: number; kpis: Kpis; windowDays: number }> {
  const db = createAdminClient();
  const [ps, cs, rs, rf, windowDays] = await Promise.all([
    db.from("partners").select("id, display_name, status, commission_pct").order("created_at"),
    db.from("partner_coupons").select("id, partner_id, code, discount_pct, max_uses, expires_at, eligible_offers").order("created_at"),
    db.from("partner_coupon_redemptions").select("partner_id, status, final_cents, discount_cents, commission_cents, commission_status").limit(20000),
    db.from("partner_referrals").select("partner_id").limit(50000),
    attributionWindowDays(),
  ]);
  for (const r of [ps, cs, rs, rf]) if (r.error) throw new Error(r.error.message);
  const all: PartnerRow[] = (ps.data ?? []).map((p) => {
    const c = (cs.data ?? []).find((x) => x.partner_id === p.id);
    const ok = (rs.data ?? []).filter((r) => r.partner_id === p.id && r.status === "aprovado");
    return {
      id: p.id as string, name: p.display_name as string, status: p.status as string, commissionPct: Number(p.commission_pct),
      couponId: (c?.id as string) ?? null, code: (c?.code as string) ?? null, discountPct: Number(c?.discount_pct ?? 0), maxUses: (c?.max_uses as number | null) ?? null, expiresAt: (c?.expires_at as string | null) ?? null, offers: (c?.eligible_offers as string[]) ?? [], link: c ? partnerLink(c.code as string, site()) : null,
      referrals: (rf.data ?? []).filter((r) => r.partner_id === p.id).length,
      sales: ok.length,
      grossCents: ok.reduce((n, r) => n + Number(r.final_cents), 0),
      discountCents: ok.reduce((n, r) => n + Number(r.discount_cents), 0),
      commissionDueCents: ok.filter((r) => r.commission_status === "calculada" || r.commission_status === "aprovada").reduce((n, r) => n + Number(r.commission_cents), 0),
    };
  });
  const kpis: Kpis = {
    partners: all.length, active: all.filter((p) => p.status === "ativo").length, referrals: (rf.data ?? []).length,
    sales: all.reduce((n, p) => n + p.sales, 0), grossCents: all.reduce((n, p) => n + p.grossCents, 0), discountCents: all.reduce((n, p) => n + p.discountCents, 0), commissionDueCents: all.reduce((n, p) => n + p.commissionDueCents, 0),
  };
  const q = (opts.q ?? "").trim().toLowerCase();
  const filtered = all.filter((p) => (!opts.status || p.status === opts.status) && (!q || p.name.toLowerCase().includes(q) || (p.code ?? "").toLowerCase().includes(q)));
  const per = opts.perPage ?? 10;
  const page = Math.max(1, opts.page ?? 1);
  return { rows: filtered.slice((page - 1) * per, page * per), total: filtered.length, kpis, windowDays };
}

export interface SaleRow {
  id: string; referredAt: string | null; boughtAt: string; student: string; offer: string; originalCents: number; discountCents: number; finalCents: number; code: string;
  status: string; source: string; mpPaymentId: number | null; refundedAt: string | null; commissionCents: number; commissionStatus: string;
}
export async function partnerDetail(id: string): Promise<{ partner: PartnerRow; sales: SaleRow[] } | null> {
  const db = createAdminClient();
  const [{ rows }, red, codes] = await Promise.all([
    partnersList({ perPage: 1000 }),
    db.from("partner_coupon_redemptions").select("id, user_id, payment_id, coupon_id, referral_id, offer, original_cents, discount_cents, final_cents, status, source, commission_cents, commission_status, refunded_at, created_at, partner_referrals(first_seen_at)").eq("partner_id", id).order("created_at", { ascending: false }).limit(500),
    db.from("partner_coupons").select("id, code").eq("partner_id", id),
  ]);
  const partner = rows.find((r) => r.id === id);
  if (!partner) return null;
  if (red.error) throw new Error(red.error.message);
  const ids = (red.data ?? []).map((r) => r.payment_id as string);
  const pays = ids.length ? await db.from("mp_payments").select("id, mp_payment_id").in("id", ids) : { data: [] as Array<{ id: string; mp_payment_id: number | null }> };
  const mp = new Map((pays.data ?? []).map((p) => [p.id as string, (p.mp_payment_id as number | null) ?? null]));
  const codeOf = new Map((codes.data ?? []).map((c) => [c.id as string, c.code as string]));
  const sales: SaleRow[] = (red.data ?? []).map((r) => {
    const ref = Array.isArray(r.partner_referrals) ? r.partner_referrals[0] : r.partner_referrals;
    return {
      id: r.id as string, referredAt: (ref?.first_seen_at as string | undefined) ?? null, boughtAt: r.created_at as string,
      student: r.user_id ? `Aluno …${String(r.user_id).slice(-4)}` : "Aluno removido", // identificação mínima, sem nome nem e-mail
      offer: r.offer as string, originalCents: Number(r.original_cents), discountCents: Number(r.discount_cents), finalCents: Number(r.final_cents), code: codeOf.get(r.coupon_id as string) ?? "?",
      status: r.status as string, source: r.source as string, mpPaymentId: mp.get(r.payment_id as string) ?? null, refundedAt: (r.refunded_at as string | null) ?? null,
      commissionCents: Number(r.commission_cents), commissionStatus: r.commission_status as string,
    };
  });
  return { partner, sales };
}

/** Exclui o parceiro só se ele nunca teve venda registrada (histórico financeiro não se apaga: nesse caso, suspender). */
export async function deletePartner(adminId: string, partnerId: string): Promise<void> {
  const db = createAdminClient();
  const { data: p } = await db.from("partners").select("id, display_name").eq("id", partnerId).maybeSingle();
  if (!p) throw new UserFacingError("Parceiro não encontrado.", "not_found");
  const red = await db.from("partner_coupon_redemptions").select("id", { count: "exact", head: true }).eq("partner_id", partnerId);
  if ((red.count ?? 0) > 0) throw new UserFacingError("Este parceiro já tem vendas registradas e não pode ser excluído. Suspenda o parceiro para desativar o cupom.", "has_sales");
  const a = await db.from("partner_referrals").delete().eq("partner_id", partnerId);
  const b = await db.from("partner_coupons").delete().eq("partner_id", partnerId);
  if (a.error || b.error) throw new UserFacingError("Não foi possível excluir o parceiro.", "delete");
  const c = await db.from("partners").delete().eq("id", partnerId);
  if (c.error) throw new UserFacingError("Não foi possível excluir o parceiro.", "delete");
  await auditLog(db, { actorId: adminId, userId: null, action: "partners.deleted", entity: "partners", entityId: partnerId, meta: { name: p.display_name } });
}
