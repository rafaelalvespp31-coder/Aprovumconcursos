-- Avatar no layout oficial do painel: miniaturas do guarda-roupa (recortadas do layout),
-- ordem do grid "Roupas" e posição no ranking.
--
-- Rollback:
--   drop function if exists public.my_ranking_position();
--   delete from public.avatar_items where id = 'polo_tatica';

update public.avatar_items set name = 'Camiseta oficial APROVUM', preview_path = '/avatar/ui/roupa-camiseta_oficial.webp', meta = meta || '{"roupas":1}' where id = 'camiseta_oficial';
update public.avatar_items set preview_path = '/avatar/ui/roupa-camiseta_preta.webp', meta = meta || '{"roupas":2}' where id = 'camiseta_preta';
update public.avatar_items set preview_path = '/avatar/ui/roupa-uniforme_prf.webp', meta = meta || '{"roupas":3}' where id = 'uniforme_prf';
update public.avatar_items set preview_path = '/avatar/ui/roupa-uniforme_policia_penal.webp', meta = meta || '{"roupas":4}' where id = 'uniforme_policia_penal';
update public.avatar_items set preview_path = '/avatar/ui/roupa-uniforme_tatico_aprovum.webp', meta = meta || '{"roupas":5}' where id = 'uniforme_tatico_aprovum';
update public.avatar_items set preview_path = '/avatar/ui/roupa-uniforme_social.webp', meta = meta || '{"roupas":6}' where id = 'uniforme_social';
update public.avatar_items set preview_path = '/avatar/ui/roupa-moletom_aprovum.webp', meta = meta || '{"roupas":7}' where id = 'moletom_aprovum';
insert into public.avatar_items (id, slot, name, genders, min_level, sort, preview_path, meta)
values ('polo_tatica', 'camiseta', 'Polo tática bege', array['m','f'], 5, 5, '/avatar/ui/roupa-polo_tatica.webp', '{"roupas":8}')
on conflict (id) do update set preview_path = excluded.preview_path, meta = excluded.meta;
update public.avatar_items set preview_path = '/avatar/ui/roupa-jaqueta_camuflada.webp', meta = meta || '{"roupas":9}' where id = 'jaqueta_camuflada';
update public.avatar_items set preview_path = '/avatar/ui/roupa-jaqueta_aprovum.webp', meta = meta || '{"roupas":10}' where id = 'jaqueta_aprovum';
-- a camiseta camuflada virou a camiseta oficial do layout
update public.avatar_items set active = false where id = 'camiseta_camuflada';
update public.avatar_items set preview_path = '/avatar/ui/cabelo-cabelo_m_curto.webp', meta = meta || '{"grade":1}' where id = 'cabelo_m_curto';
update public.avatar_items set preview_path = '/avatar/ui/cabelo-cabelo_m_degrade.webp', meta = meta || '{"grade":2}' where id = 'cabelo_m_degrade';
update public.avatar_items set preview_path = '/avatar/ui/cabelo-cabelo_m_cacheado.webp', meta = meta || '{"grade":3}' where id = 'cabelo_m_cacheado';
update public.avatar_items set preview_path = '/avatar/ui/cabelo-cabelo_m_crespo.webp', meta = meta || '{"grade":4}' where id = 'cabelo_m_crespo';
update public.avatar_items set preview_path = '/avatar/ui/barba-barba_rala.webp', meta = meta || '{"grade":2}' where id = 'barba_rala';
update public.avatar_items set preview_path = '/avatar/ui/barba-barba_cheia.webp', meta = meta || '{"grade":3}' where id = 'barba_cheia';
update public.avatar_items set name = 'Barba lenhador', preview_path = '/avatar/ui/barba-cavanhaque.webp', meta = meta || '{"grade":4}' where id = 'cavanhaque';

-- Posição no ranking: XP calculado só com atividade real (mesma regra do app:
-- 10 por resposta certa, 100 por tema aprovado, 150 por tema dominado, 20 por dia de estudo).
-- Devolve só a posição e o total de alunos (nenhum dado de outra pessoa).
create or replace function public.my_ranking_position()
returns jsonb
language sql stable security definer set search_path = '' as $$
  with students as (
    select u.id from auth.users u
    where not exists (select 1 from public.admin_roles a where a.user_id = u.id)
      and not exists (select 1 from public.partner_accounts s where s.user_id = u.id)
  ), correct as (
    select user_id, count(*) filter (where is_correct) as n from public.answer_attempts group by user_id
  ), lp as (
    select user_id,
           count(*) filter (where state in ('aguardando_dominio','dominada')) as passed,
           count(*) filter (where state = 'dominada') as mastered
    from public.learning_progress group by user_id
  ), days as (
    select user_id, count(distinct (created_at at time zone 'America/Sao_Paulo')::date) as n
    from (select user_id, created_at from public.answer_attempts union all select user_id, created_at from public.quiz_attempts) x
    group by user_id
  ), xp as (
    select s.id, coalesce(c.n, 0) * 10 + coalesce(l.passed, 0) * 100 + coalesce(l.mastered, 0) * 150 + coalesce(d.n, 0) * 20 as xp
    from students s left join correct c on c.user_id = s.id left join lp l on l.user_id = s.id left join days d on d.user_id = s.id
  )
  select case when (select auth.uid()) is null then jsonb_build_object('posicao', null, 'total', 0)
    else jsonb_build_object(
      'posicao', (select 1 + count(*) from xp where xp.xp > coalesce((select x2.xp from xp x2 where x2.id = (select auth.uid())), 0)),
      'total', (select count(*) from xp)) end;
$$;
revoke all on function public.my_ranking_position() from public, anon;
grant execute on function public.my_ranking_position() to authenticated;

-- Feminino e acessórios (miniaturas do layout feminino).
update public.avatar_items set preview_path = '/avatar/ui/cabelo-cabelo_f_rabo.webp', meta = meta || '{"grade":1}' where id = 'cabelo_f_rabo';
update public.avatar_items set preview_path = '/avatar/ui/cabelo-cabelo_f_liso_longo.webp', meta = meta || '{"grade":2}' where id = 'cabelo_f_liso_longo';
update public.avatar_items set preview_path = '/avatar/ui/cabelo-cabelo_f_medio.webp', meta = meta || '{"grade":3}' where id = 'cabelo_f_medio';
update public.avatar_items set preview_path = '/avatar/ui/cabelo-cabelo_f_cacheado.webp', meta = meta || '{"grade":4}' where id = 'cabelo_f_cacheado';
update public.avatar_items set preview_path = '/avatar/ui/acessorio-bone_aprovum.webp', meta = meta || '{"grade":1}' where id = 'bone_aprovum';
update public.avatar_items set preview_path = '/avatar/ui/acessorio-oculos_taticos.webp', meta = meta || '{"grade":2}' where id = 'oculos_taticos';
update public.avatar_items set preview_path = '/avatar/ui/acessorio-headset_tatico.webp', meta = meta || '{"grade":3}' where id = 'headset_tatico';
update public.avatar_items set preview_path = '/avatar/ui/acessorio-balaclava.webp', meta = meta || '{"grade":4}' where id = 'balaclava';
