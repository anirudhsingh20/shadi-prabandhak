-- Track paid payment deductions from Available (now) bank funds

create table if not exists bank_fund_outflows (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  payment_id uuid not null references budget_payments(id) on delete cascade,
  fund_id uuid not null references bank_funds(id) on delete restrict,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, fund_id)
);

create index if not exists bank_fund_outflows_payment_id_idx on bank_fund_outflows (payment_id);
create index if not exists bank_fund_outflows_fund_id_idx on bank_fund_outflows (fund_id);

alter table bank_fund_outflows enable row level security;

create policy "Authenticated full access bank_fund_outflows"
  on bank_fund_outflows for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

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
  v_remaining numeric;
  v_deduct numeric;
begin
  select * into v_payment from budget_payments where id = p_payment_id;
  if not found then
    return;
  end if;

  -- Restore any prior deductions for this payment
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
    raise exception 'insufficient_bank_funds'
      using detail = format('need %s, short by %s', v_payment.amount, v_remaining);
  end if;
end;
$$;

grant execute on function sync_payment_bank_deduction(uuid, boolean) to authenticated;

-- Backfill existing paid payments (oldest first)
do $$
declare
  v_payment_id uuid;
begin
  for v_payment_id in
    select id
    from budget_payments
    where status = 'done'
    order by created_at, id
  loop
    perform sync_payment_bank_deduction(v_payment_id, false);
  end loop;
end;
$$;
