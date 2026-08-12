-- Allow Available funds to go negative when paid expenses exceed in-bank cash

alter table bank_funds drop constraint if exists bank_funds_amount_check;

create or replace function sync_payment_bank_deduction(
  p_payment_id uuid,
  p_restore_only boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_outflow record;
  v_fund record;
  v_target_fund_id uuid;
  v_remaining numeric;
  v_deduct numeric;
begin
  select * into v_payment from budget_payments where id = p_payment_id;
  if not found then
    return;
  end if;

  for v_outflow in
    select o.fund_id, o.amount
    from bank_fund_outflows o
    where o.payment_id = p_payment_id
  loop
    update bank_funds
    set amount = amount + v_outflow.amount
    where id = v_outflow.fund_id;
  end loop;

  delete from bank_fund_outflows where payment_id = p_payment_id;

  if p_restore_only or v_payment.status <> 'done' then
    return;
  end if;

  v_remaining := v_payment.amount;

  for v_fund in
    select id, amount
    from bank_funds
    where wedding_id = v_payment.wedding_id
      and availability = 'now'
      and amount > 0
    order by sort_order, created_at
  loop
    exit when v_remaining <= 0;

    v_deduct := least(v_fund.amount, v_remaining);

    if v_deduct > 0 then
      update bank_funds
      set amount = amount - v_deduct
      where id = v_fund.id;

      insert into bank_fund_outflows (wedding_id, payment_id, fund_id, amount)
      values (v_payment.wedding_id, p_payment_id, v_fund.id, v_deduct);

      v_remaining := v_remaining - v_deduct;
    end if;
  end loop;

  if v_remaining > 0 then
    select id into v_target_fund_id
    from bank_funds
    where wedding_id = v_payment.wedding_id
      and availability = 'now'
    order by sort_order, created_at
    limit 1;

    if v_target_fund_id is null then
      insert into bank_funds (wedding_id, label, availability, amount, sort_order)
      values (v_payment.wedding_id, 'Overdraft', 'now', -v_remaining, 0)
      returning id into v_target_fund_id;
    else
      update bank_funds
      set amount = amount - v_remaining
      where id = v_target_fund_id;
    end if;

    insert into bank_fund_outflows (wedding_id, payment_id, fund_id, amount)
    values (v_payment.wedding_id, p_payment_id, v_target_fund_id, v_remaining)
    on conflict (payment_id, fund_id)
    do update set amount = bank_fund_outflows.amount + excluded.amount;
  end if;
end;
$$;

grant execute on function sync_payment_bank_deduction(uuid, boolean) to authenticated;
