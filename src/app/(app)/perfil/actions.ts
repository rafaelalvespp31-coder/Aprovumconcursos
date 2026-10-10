"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { createUserClient } from "@/server/supabase";

export interface ProfileState { ok?: boolean; error?: string }

const optionalInt = (min: number, max: number, msg: string) =>
  z.union([z.literal(""), z.coerce.number().int().min(min, msg).max(max, msg)]).transform((v) => (v === "" ? null : v));

/** Atualiza o próprio perfil pelo cliente do usuário: RLS e privilégios de coluna limitam o que pode mudar. */
export async function updateProfileAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = z
    .object({
      display_name: z.string().trim().min(1, "Informe seu nome.").max(80),
      daily_questions_goal: optionalInt(1, 500, "Meta diária entre 1 e 500 questões."),
      weekly_lessons_goal: optionalInt(1, 100, "Meta semanal entre 1 e 100 aulas."),
    })
    .safeParse({
      display_name: form.get("display_name"),
      daily_questions_goal: form.get("daily_questions_goal") ?? "",
      weekly_lessons_goal: form.get("weekly_lessons_goal") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const db = await createUserClient();
  const { error } = await db.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar agora." };
  revalidatePath("/perfil");
  revalidatePath("/painel");
  return { ok: true };
}
