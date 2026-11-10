-- Meu Estudo: ícone escolhido pelo aluno para a pasta. Nulo = ícone automático pelo nome
-- (comportamento atual), então as pastas existentes continuam iguais.
alter table public.study_folders
  add column if not exists icon text
  check (icon is null or icon in ('balanca','escudo','calculadora','conversa','livro','colunas','predio','monitor','alvo','globo'));
