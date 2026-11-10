"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/services/catalog";
import { setRewardStatus } from "@/server/services/referral";

export async function setRewardStatusAction(id: string, to: "pendente" | "enviado" | "cancelado") {
  const admin = await requireAdmin();
  if (to !== "pendente" && to !== "enviado" && to !== "cancelado") return;
  await setRewardStatus(admin.id, id, to);
  revalidatePath("/admin/indicacoes");
}
