-- Cupom: uso atômico (trava a linha do cupom), limite por aluno e contagem que inclui pagamentos em andamento.
-- Antes: o limite era lido e comparado fora de transação e só contava usos aprovados (vários pagamentos
-- simultâneos passavam do limite), e o mesmo aluno podia reutilizar o cupom sem limite.
-- Regra: cada aluno usa cada cupom uma vez (aprovado) e não pode ter dois pagamentos simultâneos com o mesmo cupom
-- (iniciado há menos de 15 minutos: dá tempo de tentar de novo se desistir). Para o limite total de usos do cupom,
-- um pagamento iniciado ocupa a vaga por 2 horas (um Pix abandonado libera a vaga depois disso).

create or replace function public.registrar_uso_cupom(
  p_coupon uuid, p_partner uuid, p_user uuid, p_payment uuid, p_offer text,
  p_original int, p_discount int, p_final int, p_commission_pct numeric,
  p_source text, p_referral uuid
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_max int;
  v_usados int;
begin
  -- Trava o cupom: usos simultâneos do mesmo cupom passam um de cada vez.
  select c.max_uses into v_max from public.partner_coupons c where c.id = p_coupon for update;
  if not found then raise exception 'cupom_invalido'; end if;

  -- Mesma tentativa repetida (mesmo pagamento): nada a fazer.
  if exists (select 1 from public.partner_coupon_redemptions r where r.payment_id = p_payment) then return; end if;

  if p_user is not null and exists (
    select 1 from public.partner_coupon_redemptions r
    where r.coupon_id = p_coupon and r.user_id = p_user
      and (r.status = 'aprovado' or (r.status = 'iniciado' and r.created_at > now() - interval '15 minutes'))
  ) then raise exception 'cupom_ja_usado'; end if;

  if v_max is not null then
    select count(*) into v_usados from public.partner_coupon_redemptions r
    where r.coupon_id = p_coupon
      and (r.status = 'aprovado' or (r.status = 'iniciado' and r.created_at > now() - interval '2 hours'));
    if v_usados >= v_max then raise exception 'cupom_esgotado'; end if;
  end if;

  insert into public.partner_coupon_redemptions
    (coupon_id, partner_id, user_id, payment_id, offer, original_cents, discount_cents, final_cents, commission_pct, commission_cents, source, referral_id)
  values
    (p_coupon, p_partner, p_user, p_payment, p_offer, p_original, p_discount, p_final, p_commission_pct, 0, p_source, p_referral);
end $$;

revoke all on function public.registrar_uso_cupom(uuid, uuid, uuid, uuid, text, int, int, int, numeric, text, uuid) from public, anon, authenticated;
grant execute on function public.registrar_uso_cupom(uuid, uuid, uuid, uuid, text, int, int, int, numeric, text, uuid) to service_role;
