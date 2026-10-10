"use client";

import { useActionState } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { updateProfileAction, type ProfileState } from "./actions";

export function ProfileForm({ displayName, dailyQuestions, weeklyLessons }: { displayName: string; dailyQuestions: number | null; weeklyLessons: number | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.ok && <Notice tone="sucesso">Alterações salvas.</Notice>}
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      <Field id="display_name" label="Nome">
        <input id="display_name" name="display_name" defaultValue={displayName} maxLength={80} className={inputClass} />
      </Field>
      <div id="metas" className="grid scroll-mt-6 gap-4 sm:grid-cols-2">
        <Field id="daily_questions_goal" label="Meta diária de questões" hint="Opcional. Aparece no painel.">
          <input id="daily_questions_goal" name="daily_questions_goal" type="number" inputMode="numeric" min={1} max={500} defaultValue={dailyQuestions ?? ""} className={inputClass} />
        </Field>
        <Field id="weekly_lessons_goal" label="Meta semanal de aulas concluídas" hint="Opcional. Conta aulas com leitura concluída.">
          <input id="weekly_lessons_goal" name="weekly_lessons_goal" type="number" inputMode="numeric" min={1} max={100} defaultValue={weeklyLessons ?? ""} className={inputClass} />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="self-start">{pending ? "Salvando…" : "Salvar alterações"}</Button>
    </form>
  );
}
