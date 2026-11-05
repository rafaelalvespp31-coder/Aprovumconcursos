-- Admin "Alunos": o plano vitalício (Comando Supremo) também pode ser registrado como pago.
-- Rollback: reaplicar o check antigo (mensal, semestral, anual) depois de remover linhas 'vitalicio'.
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.subscription_payments'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%mensal%';
  if c is not null then execute format('alter table public.subscription_payments drop constraint %I', c); end if;
end $$;
alter table public.subscription_payments
  add constraint subscription_payments_period_check check (period in ('mensal', 'semestral', 'anual', 'vitalicio'));
