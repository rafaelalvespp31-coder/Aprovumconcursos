-- Publicação direta de questões catalogadas pelo administrador (Banco › Cadastrar questões).
-- Não afrouxa as regras do gatilho: percorre as mesmas etapas (revisão → checklist → aprovação →
-- publicação) em nome do administrador, que é quem decide ao colar e enviar. Só para administradores
-- e só pelo servidor (service_role). Questão sem justificativa (mín. 10 caracteres) não é publicada.
create or replace function public.bank_quick_publish(p_actor uuid, p_id uuid)
returns text
language plpgsql
set search_path to ''
as $$
declare
  cur record;
begin
  if not exists (select 1 from public.admin_roles r where r.user_id = p_actor and r.role = 'admin') then
    raise exception 'Somente administradores publicam direto.' using errcode = 'insufficient_privilege';
  end if;
  select q.status, q.justification into cur from public.bank_questions q where q.id = p_id for update;
  if not found then
    raise exception 'Questão não encontrada.' using errcode = 'no_data_found';
  end if;
  if cur.status = 'publicada' then
    return 'publicada';
  end if;
  if coalesce(char_length(btrim(cur.justification)), 0) < 10 then
    return cur.status;
  end if;
  if cur.status in ('rascunho', 'importada') then
    update public.bank_questions set status = 'aguardando_conferencia', status_changed_by = p_actor, change_reason = 'Catalogada pelo administrador' where id = p_id;
    cur.status := 'aguardando_conferencia';
  end if;
  if cur.status in ('aguardando_conferencia', 'correcao_necessaria') then
    update public.bank_questions set status = 'em_revisao', status_changed_by = p_actor, change_reason = 'Catalogada pelo administrador' where id = p_id;
    cur.status := 'em_revisao';
  end if;
  if cur.status = 'em_revisao' then
    update public.bank_questions set content_checked = true, answer_checked = true, source_checked = true, rights_checked = true where id = p_id;
    update public.bank_questions set status = 'aprovada', approved_by = p_actor, status_changed_by = p_actor, change_reason = 'Catalogada e aprovada pelo administrador' where id = p_id;
    cur.status := 'aprovada';
  end if;
  if cur.status = 'aprovada' then
    update public.bank_questions set status = 'publicada', status_changed_by = p_actor, change_reason = 'Publicada pelo administrador ao catalogar' where id = p_id;
    return 'publicada';
  end if;
  return cur.status;
end $$;

revoke all on function public.bank_quick_publish(uuid, uuid) from public, anon, authenticated;
grant execute on function public.bank_quick_publish(uuid, uuid) to service_role;
