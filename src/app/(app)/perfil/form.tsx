"use client";

import { useActionState } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { updateProfileAction, type ProfileState } from "./actions";

export function ProfileForm({ displayName, dailyGoal }: { displayName: string; dailyGoal: number | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.ok && <Notice tone="sucesso">Alterações salvas.</Notice>}
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      <Field id="display_name" label="Nome">
        <input id="display_name" name="display_name" defaultValue={displayName} maxLength={80} className={inputClass} />
      </Field>
      <Field id="daily_goal_minutes" label="Meta diária de estudo (minutos)" hint="Opcional. Usada para organizar suas revisões.">
        <input id="daily_goal_minutes" name="daily_goal_minutes" type="number" min={5} max={600} defaultValue={dailyGoal ?? ""} className={`${inputClass} max-w-40`} />
      </Field>
      <Button type="submit" disabled={pending} className="self-start">{pending ? "Salvando…" : "Salvar alterações"}</Button>
    </form>
  );
}
