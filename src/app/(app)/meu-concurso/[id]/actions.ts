"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { updatePreparationInfo } from "@/server/services/edital";
import { chooseExam } from "@/server/services/strategic";

export async function updateInfoAction(id: string, form: FormData) {
  const user = await requireUser(`/meu-concurso/${id}`);
  const y = String(form.get("year") ?? "").trim();
  const year = y ? Number(y) : null;
  await updatePreparationInfo(user.id, id, {
    contestName: String(form.get("contestName") ?? "").slice(0, 160),
    roleName: String(form.get("roleName") ?? "").slice(0, 160),
    board: String(form.get("board") ?? "").slice(0, 80),
    year: year && year >= 1990 && year <= 2100 ? year : null,
  });
  revalidatePath(`/meu-concurso/${id}`);
}

export async function chooseExamAction(id: string, form: FormData) {
  const user = await requireUser(`/meu-concurso/${id}`);
  const v = String(form.get("exam") ?? "");
  await chooseExam(user.id, id, v || null);
  revalidatePath(`/meu-concurso/${id}`);
}
