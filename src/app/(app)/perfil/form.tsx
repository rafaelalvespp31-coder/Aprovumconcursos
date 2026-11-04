"use client";

import { useActionState } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { formatWhatsapp } from "@/domain/contact/whatsapp";
import { updateProfileAction, type ProfileState } from "./actions";

export function ProfileForm({ displayName, dailyQuestions, weeklyLessons, avatarGender, whatsapp, motto }: { whatsapp?: string | null; motto?: string | null; displayName: string; dailyQuestions: number | null; weeklyLessons: number | null; avatarGender?: "m" | "f" | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.ok && <Notice tone="sucesso">Alterações salvas.</Notice>}
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      <Field id="display_name" label="Nome">
        <input id="display_name" name="display_name" defaultValue={displayName} maxLength={80} className={inputClass} />
      </Field>
      <Field id="whatsapp" label="WhatsApp" hint="Para te adicionar ao grupo VIP. Só você e a equipe veem.">
        <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999" defaultValue={formatWhatsapp(whatsapp)} maxLength={25} className={inputClass} data-testid="perfil-whatsapp" />
      </Field>
      <Field id="motto" label="Frase no ranking" hint="Curta e livre (até 60 caracteres). Aparece ao lado do seu nome no Ranking APROVUM.">
        <input id="motto" name="motto" defaultValue={motto ?? ""} maxLength={60} placeholder="Ex.: Disciplina vence talento." className={inputClass} data-testid="perfil-frase" />
      </Field>
      <Field id="avatar_gender" label="Gênero do avatar" hint="Define o personagem que aparece no painel.">
        <select id="avatar_gender" name="avatar_gender" defaultValue={avatarGender ?? "m"} className={inputClass} data-testid="perfil-genero">
          <option value="m">Masculino</option>
          <option value="f">Feminino</option>
        </select>
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
