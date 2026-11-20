"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/services/catalog";
import { enforceRateLimit } from "@/server/services/trails";
import { createAdminClient } from "@/server/supabase";
import { auditLog } from "@/server/observability";

const schema = z
  .object({
    ativo: z.coerce.boolean(),
    intervalo: z.coerce.number().int().min(1).max(6),
    horaIni: z.coerce.number().int().min(0).max(23),
    horaFim: z.coerce.number().int().min(1).max(23),
  })
  .refine((v) => v.horaFim > v.horaIni, "A hora final precisa ser depois da inicial.");

/** Liga/desliga os avisos automáticos e ajusta o intervalo e a janela de horário (Brasília). */
export async function salvarAgendaAction(fd: FormData) {
  const admin = await requireAdmin();
  let msg = "ok=" + encodeURIComponent("Avisos automáticos salvos.");
  try {
    await enforceRateLimit(admin.id, "admin_push_agenda", 20);
    const v = schema.parse({ ativo: fd.get("ativo") === "on", intervalo: fd.get("intervalo"), horaIni: fd.get("horaIni"), horaFim: fd.get("horaFim") });
    const db = createAdminClient();
    const { error } = await db.from("push_agenda_config").update({ ativo: v.ativo, intervalo_horas: v.intervalo, hora_ini: v.horaIni, hora_fim: v.horaFim, updated_at: new Date().toISOString() }).eq("singleton", true);
    if (error) throw new Error(error.message);
    // Muda a regra: a agenda de hoje que ainda não começou é refeita na próxima rodada.
    await db.from("push_agenda").delete().eq("day", new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())).is("done_at", null);
    await auditLog(db, { actorId: admin.id, userId: null, action: "push.agenda_config", entity: "push_agenda_config", meta: v });
  } catch (e) {
    msg = "erro=" + encodeURIComponent(e instanceof z.ZodError ? (e.issues[0]?.message ?? "Dados inválidos.") : "Não foi possível salvar agora.");
  }
  revalidatePath("/admin/avisos-push");
  redirect(`/admin/avisos-push?${msg}`);
}
