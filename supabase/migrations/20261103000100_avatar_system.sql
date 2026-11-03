-- AVATAR DO ALUNO — personagem 3D personalizável (masculino ou feminino).
--
-- * avatar_items: catálogo do guarda-roupa (peças, cabelos, barbas e os modelos-base).
--   Requisitos de desbloqueio (nível e XP) ficam aqui e podem ser ajustados pela equipe.
--   Os arquivos 3D (.glb) e as miniaturas ficam no Storage (bucket avatar-assets); a tabela só
--   guarda o caminho. Peça sem modelo 3D ainda não aparece no personagem.
-- * avatar_profiles: o avatar de cada aluno (gênero, pele, cabelo, rosto, corpo e peças).
--   O aluno LÊ só o próprio. Gravação só pelo servidor, que confere o catálogo e o progresso real
--   (assim ninguém equipa peça bloqueada nem altera o avatar de outra pessoa).
--
-- Rollback:
--   drop table if exists public.avatar_profiles;
--   drop table if exists public.avatar_items;

create table if not exists public.avatar_items (
  id          text primary key check (id ~ '^[a-z0-9_]{2,60}$'),
  slot        text not null check (slot in ('base','cabelo','barba','camiseta','uniforme','jaqueta','calca','calcado','bone','oculos','acessorio')),
  name        text not null check (length(name) between 2 and 80),
  genders     text[] not null default array['m','f'] check (genders <@ array['m','f'] and cardinality(genders) > 0),
  min_level   integer not null default 1 check (min_level between 1 and 999),
  min_xp      integer not null default 0 check (min_xp >= 0),
  is_default  boolean not null default false,
  active      boolean not null default true,
  preview_path text,
  model_path  text,
  meta        jsonb not null default '{}'::jsonb,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.avatar_items enable row level security;
create policy "avatar_items: catálogo ativo" on public.avatar_items for select to authenticated using (active);

create table if not exists public.avatar_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  gender     text not null check (gender in ('m','f')),
  skin       text not null check (skin in ('muito_clara','clara','morena_clara','morena','morena_media','morena_escura','negra')),
  hair_color text not null check (hair_color in ('preto','castanho_escuro','castanho','ruivo','loiro','loiro_claro','grisalho')),
  face       jsonb not null default '{}'::jsonb check (jsonb_typeof(face) = 'object'),
  body       jsonb not null default '{}'::jsonb check (jsonb_typeof(body) = 'object'),
  equipped   jsonb not null default '{}'::jsonb check (jsonb_typeof(equipped) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.avatar_profiles enable row level security;
create policy "avatar_profiles: dono lê" on public.avatar_profiles for select to authenticated using (user_id = (select auth.uid()));

-- Catálogo inicial (requisitos ajustáveis). Sem arquivo 3D até os modelos serem entregues.
insert into public.avatar_items (id, slot, name, genders, min_level, min_xp, is_default, sort, meta) values
  ('base_masculino', 'base', 'Modelo masculino', array['m'], 1, 0, true, 0, '{}'),
  ('base_feminino', 'base', 'Modelo feminino', array['f'], 1, 0, true, 0, '{}'),
  ('cabelo_m_curto', 'cabelo', 'Curto clássico', array['m'], 1, 0, true, 1, '{"tipo":"curto"}'),
  ('cabelo_m_degrade', 'cabelo', 'Degradê', array['m'], 1, 0, false, 2, '{"tipo":"curto"}'),
  ('cabelo_m_raspado', 'cabelo', 'Raspado', array['m'], 1, 0, false, 3, '{"tipo":"raspado"}'),
  ('cabelo_m_crespo', 'cabelo', 'Crespo', array['m'], 1, 0, false, 4, '{"tipo":"crespo"}'),
  ('cabelo_m_cacheado', 'cabelo', 'Cacheado médio', array['m'], 1, 0, false, 5, '{"tipo":"cacheado"}'),
  ('cabelo_f_rabo', 'cabelo', 'Rabo de cavalo', array['f'], 1, 0, true, 1, '{"tipo":"longo"}'),
  ('cabelo_f_liso_longo', 'cabelo', 'Liso longo', array['f'], 1, 0, false, 2, '{"tipo":"liso"}'),
  ('cabelo_f_medio', 'cabelo', 'Médio ondulado', array['f'], 1, 0, false, 3, '{"tipo":"medio"}'),
  ('cabelo_f_cacheado', 'cabelo', 'Cacheado', array['f'], 1, 0, false, 4, '{"tipo":"cacheado"}'),
  ('cabelo_f_crespo', 'cabelo', 'Crespo volumoso', array['f'], 1, 0, false, 5, '{"tipo":"crespo"}'),
  ('cabelo_f_curto', 'cabelo', 'Curto', array['f'], 1, 0, false, 6, '{"tipo":"curto"}'),
  ('barba_rala', 'barba', 'Barba rala', array['m'], 1, 0, false, 1, '{}'),
  ('barba_cheia', 'barba', 'Barba cheia', array['m'], 1, 0, false, 2, '{}'),
  ('bigode', 'barba', 'Bigode', array['m'], 1, 0, false, 3, '{}'),
  ('cavanhaque', 'barba', 'Cavanhaque', array['m'], 1, 0, false, 4, '{}'),
  ('camiseta_oficial', 'camiseta', 'Camiseta oficial APROVUM', array['m','f'], 1, 0, true, 1, '{"marca":"aprovum"}'),
  ('camiseta_preta', 'camiseta', 'Camiseta preta básica', array['m','f'], 1, 0, false, 2, '{}'),
  ('camiseta_camuflada', 'camiseta', 'Camiseta camuflada APROVUM', array['m','f'], 5, 0, false, 3, '{"marca":"aprovum"}'),
  ('camiseta_tatica_vermelha', 'camiseta', 'Camiseta tática detalhe vermelho', array['m','f'], 8, 0, false, 4, '{"marca":"aprovum"}'),
  ('uniforme_tatico_aprovum', 'uniforme', 'Uniforme tático APROVUM', array['m','f'], 10, 0, false, 1, '{"marca":"aprovum"}'),
  ('uniforme_policia_penal', 'uniforme', 'Inspirado na Polícia Penal', array['m','f'], 10, 0, false, 2, '{"cosmetico":true}'),
  ('uniforme_guarda_municipal', 'uniforme', 'Inspirado na Guarda Municipal', array['m','f'], 10, 0, false, 3, '{"cosmetico":true}'),
  ('uniforme_policia_militar', 'uniforme', 'Inspirado na Polícia Militar', array['m','f'], 15, 0, false, 4, '{"cosmetico":true}'),
  ('uniforme_policia_civil', 'uniforme', 'Inspirado na Polícia Civil', array['m','f'], 15, 0, false, 5, '{"cosmetico":true}'),
  ('uniforme_prf', 'uniforme', 'Inspirado na Polícia Rodoviária Federal', array['m','f'], 20, 0, false, 6, '{"cosmetico":true}'),
  ('uniforme_bombeiros', 'uniforme', 'Inspirado no Corpo de Bombeiros', array['m','f'], 20, 0, false, 7, '{"cosmetico":true}'),
  ('uniforme_social', 'uniforme', 'Traje social', array['m','f'], 5, 0, false, 8, '{}'),
  ('jaqueta_aprovum', 'jaqueta', 'Jaqueta APROVUM', array['m','f'], 8, 0, false, 1, '{"marca":"aprovum"}'),
  ('moletom_aprovum', 'jaqueta', 'Moletom caveira APROVUM', array['m','f'], 3, 0, false, 2, '{"marca":"aprovum"}'),
  ('jaqueta_camuflada', 'jaqueta', 'Jaqueta camuflada', array['m','f'], 12, 0, false, 3, '{}'),
  ('calca_tatica', 'calca', 'Calça tática preta', array['m','f'], 1, 0, true, 1, '{}'),
  ('calca_camuflada', 'calca', 'Calça camuflada', array['m','f'], 5, 0, false, 2, '{}'),
  ('bermuda_cargo', 'calca', 'Bermuda cargo', array['m','f'], 1, 0, false, 3, '{}'),
  ('calca_jeans', 'calca', 'Calça jeans', array['m','f'], 1, 0, false, 4, '{}'),
  ('coturno_tatico', 'calcado', 'Coturno tático', array['m','f'], 1, 0, true, 1, '{}'),
  ('tenis_preto', 'calcado', 'Tênis preto', array['m','f'], 1, 0, false, 2, '{}'),
  ('tenis_aprovum', 'calcado', 'Tênis APROVUM vermelho', array['m','f'], 6, 0, false, 3, '{"marca":"aprovum"}'),
  ('bone_aprovum', 'bone', 'Boné caveira APROVUM', array['m','f'], 3, 0, false, 1, '{"marca":"aprovum"}'),
  ('oculos_taticos', 'oculos', 'Óculos táticos', array['m','f'], 6, 0, false, 1, '{}'),
  ('oculos_grau', 'oculos', 'Óculos de grau', array['m','f'], 1, 0, false, 2, '{}'),
  ('relogio_tatico', 'acessorio', 'Relógio tático', array['m','f'], 1, 0, false, 1, '{}'),
  ('headset_tatico', 'acessorio', 'Abafador tático', array['m','f'], 10, 0, false, 2, '{}'),
  ('balaclava', 'acessorio', 'Balaclava', array['m','f'], 15, 0, false, 3, '{}')
on conflict (id) do nothing;

-- Bucket público de leitura para os arquivos do avatar (modelos .glb e miniaturas).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('avatar-assets', 'avatar-assets', true) on conflict (id) do nothing;
  end if;
end $$;

revoke all on public.avatar_items from anon;
revoke insert, update, delete on public.avatar_items from authenticated;
grant select on public.avatar_items to authenticated;
revoke all on public.avatar_profiles from anon;
revoke insert, update, delete on public.avatar_profiles from authenticated;
grant select on public.avatar_profiles to authenticated;
