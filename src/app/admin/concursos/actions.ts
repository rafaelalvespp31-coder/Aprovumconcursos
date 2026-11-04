"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/services/catalog";
import { saveContest } from "@/server/services/gamification";
import { UserFacingError } from "@/server/services/trails";

export async function saveContestAction(id: string | null, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const get = (k: string) => form.get(k);
  try {
    await saveContest(admin.id, id, {
      name: get("name"),
      institution: get("institution"),
      role_name: get("role_name"),
      status: get("status"),
      vacancies: get("vacancies"),
      salary: get("salary"),
      exam_date: get("exam_date"),
      exam_date_confirmed: get("exam_date_confirmed") === "on",
      info_confirmed: get("info_confirmed") === "on",
      source_name: get("source_name"),
      source_url: get("source_url"),
      active: get("active") === "on",
      uf: get("uf"), orgao: get("orgao"), banca: get("banca"), education: get("education"), city: get("city"), location: get("location"),
      description: get("description"), registration_start: get("registration_start"), registration_end: get("registration_end"), detail_url: get("detail_url"),
      featured: get("featured") === "on", forecast: get("forecast") === "on",
    }, { file: get("imagem") instanceof File ? (get("imagem") as File) : null, remove: get("remover_imagem") === "on" });
    revalidatePath("/admin/concursos");
    revalidatePath("/painel");
    revalidatePath("/concursos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível salvar." };
  }
}
