import "server-only";
import { z } from "zod";
import { createAdminClient } from "../supabase";
import type { SessionUser } from "../auth";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";
import { generatePassword } from "./students";
import { normalizePermissions, PARTNER_PERMISSIONS, type PartnerPermission } from "@/domain/partner/permissions";

export interface PartnerRow {
  userId: string;
  name: string | null;
  email: string | null;
  active: boolean;
  permissions: PartnerPermission[];
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
}

export interface PartnerAuditRow {
  at: string;
  action: string;
  actorEmail: string | null;
  meta: Record<string, unknown>;
}

/** Sócios cadastrados (só ADMIN MASTER; quem chama confere). */
export async function listPartners(): Promise<PartnerRow[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("partner_accounts").select("user_id, active, permissions, created_at, updated_at").order("created_at");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const profiles = rows.length ? await db.from("profiles").select("id, display_name").in("id", rows.map((r) => r.user_id as string)) : { data: [] };
  const name = new Map(((profiles.data ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name]));
  return Promise.all(
    rows.map(async (r) => {
      const u = await db.auth.admin.getUserById(r.user_id as string);
      return {
        userId: r.user_id as string,
        name: name.get(r.user_id as string) ?? null,
        email: u.data.user?.email ?? null,
        active: r.active as boolean,
        permissions: normalizePermissions((r.permissions as string[]) ?? []),
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
        lastSignInAt: u.data.user?.last_sign_in_at ?? null,
      };
    }),
  );
}

/** Eventos de auditoria do módulo do sócio (mais recentes primeiro). */
export async function listPartnerAudit(limit = 40): Promise<PartnerAuditRow[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("audit_logs").select("actor_id, action, meta, created_at").or("action.like.partner.%,action.like.admin.partner_%").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const ids = [...new Set((data ?? []).map((r) => r.actor_id as string | null).filter((x): x is string => !!x))];
  const emails = new Map<string, string | null>();
  await Promise.all(ids.map(async (id) => emails.set(id, (await db.auth.admin.getUserById(id)).data.user?.email ?? null)));
  return (data ?? []).map((r) => ({ at: r.created_at as string, action: r.action as string, actorEmail: r.actor_id ? (emails.get(r.actor_id as string) ?? null) : null, meta: (r.meta as Record<string, unknown>) ?? {} }));
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do sócio.").max(80),
  email: z.email("E-mail inválido.").transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)), "A senha precisa ter pelo menos 8 caracteres, com letras e números."),
});

/**
 * Cria a conta do sócio (login e senha próprios) ou vincula uma conta já existente pelo e-mail.
 * Começa SEM nenhuma permissão: o ADMIN MASTER libera o que quiser depois.
 */
export async function createPartner(admin: SessionUser, input: { name: string; email: string; password?: string }): Promise<{ userId: string; password: string | null; linked: boolean }> {
  const v = createSchema.parse(input);
  const db = createAdminClient();
  const found = await db.rpc("auth_user_by_email", { p_email: v.email });
  if (found.error) throw new Error(found.error.message);
  let userId = (found.data as Array<{ id: string }> | null)?.[0]?.id ?? null;
  let password: string | null = null;
  const linked = !!userId;
  if (userId) {
    const adm = await db.from("admin_roles").select("user_id").eq("user_id", userId).maybeSingle();
    if (adm.data) throw new UserFacingError("Essa conta é de administrador: use outro e-mail para o sócio.", "conflict");
    const already = await db.from("partner_accounts").select("user_id").eq("user_id", userId).maybeSingle();
    if (already.data) throw new UserFacingError("Esse e-mail já é de um sócio.", "conflict");
    if (v.password) {
      const up = await db.auth.admin.updateUserById(userId, { password: v.password });
      if (up.error) throw new UserFacingError(`Não foi possível definir a senha: ${up.error.message}`, "auth");
      password = v.password;
    }
  } else {
    password = v.password ?? generatePassword();
    const created = await db.auth.admin.createUser({ email: v.email, password, email_confirm: true, user_metadata: { display_name: v.name } });
    if (created.error || !created.data.user) throw new UserFacingError(`Não foi possível criar a conta: ${created.error?.message ?? "erro desconhecido"}`, "auth");
    userId = created.data.user.id;
  }
  await db.from("profiles").update({ display_name: v.name }).eq("id", userId);
  const ins = await db.from("partner_accounts").insert({ user_id: userId, active: true, permissions: [], created_by: admin.id });
  if (ins.error) throw new Error(ins.error.message);
  await auditLog(db, { actorId: admin.id, userId, action: "admin.partner_created", entity: "partner_accounts", entityId: userId, meta: { email: v.email, linked, antes: null, depois: { active: true, permissions: [] } } });
  return { userId, password, linked };
}

const idSchema = z.uuid("Sócio inválido.");

async function current(userId: string) {
  const { data } = await createAdminClient().from("partner_accounts").select("active, permissions").eq("user_id", userId).maybeSingle();
  if (!data) throw new UserFacingError("Sócio não encontrado.", "not_found");
  return { active: data.active as boolean, permissions: normalizePermissions((data.permissions as string[]) ?? []) };
}

/** Ativa ou desativa o acesso (vale na hora, inclusive para sessões abertas). */
export async function setPartnerActive(admin: SessionUser, userIdInput: string, active: boolean) {
  const userId = idSchema.parse(userIdInput);
  const before = await current(userId);
  const db = createAdminClient();
  const { error } = await db.from("partner_accounts").update({ active: !!active, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  // Desativado: encerra as sessões abertas do sócio também.
  if (!active) await db.auth.admin.signOut(userId).catch(() => undefined);
  await auditLog(db, { actorId: admin.id, userId, action: active ? "admin.partner_activated" : "admin.partner_deactivated", entity: "partner_accounts", entityId: userId, meta: { antes: { active: before.active }, depois: { active: !!active } } });
}

/** Define exatamente quais indicadores o sócio vê (vale na hora: o banco confere a cada consulta). */
export async function setPartnerPermissions(admin: SessionUser, userIdInput: string, permissions: string[]) {
  const userId = idSchema.parse(userIdInput);
  const list = z.array(z.enum(PARTNER_PERMISSIONS)).max(PARTNER_PERMISSIONS.length).parse(permissions);
  const next = normalizePermissions(list);
  const before = await current(userId);
  const db = createAdminClient();
  const { error } = await db.from("partner_accounts").update({ permissions: next, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  await auditLog(db, {
    actorId: admin.id,
    userId,
    action: "admin.partner_permissions",
    entity: "partner_accounts",
    entityId: userId,
    meta: { antes: before.permissions, depois: next, liberadas: next.filter((p) => !before.permissions.includes(p)), bloqueadas: before.permissions.filter((p) => !next.includes(p)) },
  });
}
