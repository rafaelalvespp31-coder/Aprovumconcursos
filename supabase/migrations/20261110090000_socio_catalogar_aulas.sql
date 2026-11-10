-- Sócio administrativo: nova permissão "catalogar_aulas" (telas Plano de tópicos e Catalogar aula).
-- Rollback: recriar partner_permission_keys() sem o último item (e remover 'catalogar_aulas' dos sócios).
create or replace function public.partner_permission_keys() returns text[]
language sql immutable set search_path = '' as $$
  select array[
    'visualizar_total_cadastrados', 'visualizar_usuarios_ativos', 'visualizar_usuarios_inativos',
    'visualizar_cadastros_diarios', 'visualizar_crescimento', 'visualizar_pagantes',
    'visualizar_assinaturas_mensais', 'visualizar_assinaturas_semestrais', 'visualizar_assinaturas_anuais',
    'visualizar_assinaturas_ativas', 'visualizar_assinaturas_vencidas', 'visualizar_faturamento',
    'visualizar_taxa_conversao', 'visualizar_lista_pagantes', 'visualizar_historico_pagamentos',
    'catalogar_aulas'
  ]::text[];
$$;
