-- Post-its de revisão (trechos que o aluno marca na aula) e versões do "Meu PDF de Revisão".
-- Só cria tabelas novas: nada existente é alterado ou apagado.

create table if not exists public.lesson_postits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  lesson_id     uuid not null,
  trail_id      uuid,
  subject_key   text check (char_length(subject_key) <= 80),
  -- A seção pode ser regenerada: guardamos o id e o título como âncora estável.
  section_id    uuid,
  section_title text check (char_length(section_title) <= 200),
  -- Trecho original escolhido pelo aluno e sua posição dentro do texto da seção.
  quote         text not null check (char_length(quote) between 2 and 1500),
  quote_hash    text generated always as (md5(quote)) stored,
  quote_start   integer not null default 0 check (quote_start >= 0),
  note          text not null default '' check (char_length(note) <= 2000),
  -- 'ativo' entra no PDF; 'excluido' sai da próxima geração (o conteúdo da aula nunca é tocado).
  status        text not null default 'ativo' check (status in ('ativo', 'excluido')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade
);
create index if not exists lesson_postits_user_lesson on public.lesson_postits (user_id, lesson_id, status, created_at);
-- Evita duplicidade acidental: o mesmo trecho, no mesmo ponto da mesma seção, só uma vez ativo.
create unique index if not exists lesson_postits_sem_duplicidade
  on public.lesson_postits (user_id, lesson_id, coalesce(section_id, '00000000-0000-0000-0000-000000000000'::uuid), quote_hash, quote_start)
  where status = 'ativo';
drop trigger if exists lesson_postits_updated on public.lesson_postits;
create trigger lesson_postits_updated before update on public.lesson_postits
  for each row execute function public.set_updated_at();

alter table public.lesson_postits enable row level security;
alter table public.lesson_postits force row level security;
drop policy if exists "dono le" on public.lesson_postits;
create policy "dono le" on public.lesson_postits for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "dono cria" on public.lesson_postits;
create policy "dono cria" on public.lesson_postits for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "dono edita" on public.lesson_postits;
create policy "dono edita" on public.lesson_postits for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.lesson_postits to authenticated;
grant insert (lesson_id, trail_id, subject_key, section_id, section_title, quote, quote_start, note) on public.lesson_postits to authenticated;
grant update (note, status) on public.lesson_postits to authenticated;

-- Versões do PDF de revisão: cada geração é uma linha nova (nunca sobrescreve a anterior).
create table if not exists public.postit_pdfs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  lesson_id    uuid not null,
  pdf_version  integer not null check (pdf_version >= 1),
  snapshot     jsonb not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at   timestamptz not null default now(),
  unique (lesson_id, user_id, pdf_version),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade
);
create index if not exists postit_pdfs_user_lesson on public.postit_pdfs (user_id, lesson_id, created_at desc);
alter table public.postit_pdfs enable row level security;
alter table public.postit_pdfs force row level security;
drop policy if exists "dono le" on public.postit_pdfs;
create policy "dono le" on public.postit_pdfs for select to authenticated using (user_id = (select auth.uid()));
grant select on public.postit_pdfs to authenticated;
-- Escrita só pelo servidor (service_role): o aluno não cria PDFs por conta própria.
