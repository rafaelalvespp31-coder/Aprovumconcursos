"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { createUserClient } from "@/server/supabase";

export interface ProfileState { ok?: boolean; error?: string }

/** Atualiza o próprio perfil pelo cliente do usuário: a RLS e os privilégios de coluna limitam o que pode mudar. */
export async function updateProfileAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = z
    .object({
      display_name: z.string().trim().min(1, "Informe seu nome.").max(80),
      daily_goal_minutes: z.union([z.literal(""), z.coerce.number().int().min(5, "Meta mínima de 5 minutos.").max(600, "Meta máxima de 600 minutos.")]),
    })
    .safeParse({ display_name: form.get("display_name"), daily_goal_minutes: form.get("daily_goal_minutes") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const db = await createUserClient();
  const { error } = await db
    .from("profiles")
    .update({ display_name: parsed.data.display_name, daily_goal_minutes: parsed.data.daily_goal_minutes === "" ? null : parsed.data.daily_goal_minutes })
    .eq("id", user.id);
  if (error) return { error: "Não foi possível salvar agora." };
  revalidatePath("/perfil");
  return { ok: true };
}
