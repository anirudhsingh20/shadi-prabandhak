-- Shadi Prabandhak schema
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- Wedding config
create table if not exists weddings (
  id uuid primary key default gen_random_uuid(),
  bride_name text not null,
  groom_name text not null,
  wedding_date date not null,
  money_in_bank numeric not null default 0 check (money_in_bank >= 0),
  total_budget numeric not null default 0 check (total_budget >= 0),
  created_at timestamptz not null default now()
);

-- Events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  event_date date not null,
  time_label text,
  venue text,
  tag text,
  sort_order int not null default 0
);

-- Guests
create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  side text not null check (side in ('bride', 'groom', 'common')),
  rsvp_status text not null check (rsvp_status in ('confirmed', 'pending', 'declined')),
  headcount int not null default 1 check (headcount >= 1),
  events_attending text,
  relation text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guest_relations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  key text not null,
  label text not null,
  sort_order int not null default 0,
  unique (wedding_id, key)
);

create or replace function set_guests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists guests_set_updated_at on guests;
create trigger guests_set_updated_at
  before update on guests
  for each row execute function set_guests_updated_at();

-- Budget
create table if not exists budget_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  description text,
  allocated numeric not null default 0 check (allocated >= 0),
  spent numeric not null default 0 check (spent >= 0),
  sort_order int not null default 0
);

create table if not exists budget_payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  category_id uuid references budget_categories(id) on delete set null,
  title text not null,
  amount numeric not null default 0 check (amount >= 0),
  status text not null check (status in ('done', 'pending', 'may_come')),
  due_date date,
  notes text,
  image_urls text[] not null default '{}',
  made_by text,
  payment_source text,
  created_at timestamptz not null default now()
);

create table if not exists payment_makers (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  key text not null,
  label text not null,
  sort_order int not null default 0,
  unique (wedding_id, key)
);

create table if not exists payment_sources (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  key text not null,
  label text not null,
  sort_order int not null default 0,
  unique (wedding_id, key)
);

create table if not exists bank_funds (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  label text not null,
  payment_source text,
  made_by text,
  availability text not null check (availability in ('now', 'scheduled', 'expected')),
  amount numeric not null,
  expected_date date,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (
    (availability = 'now' and expected_date is null)
    or (availability = 'scheduled' and expected_date is not null)
    or (availability = 'expected')
  )
);

create table if not exists bank_fund_outflows (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  payment_id uuid not null references budget_payments(id) on delete cascade,
  fund_id uuid not null references bank_funds(id) on delete restrict,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, fund_id)
);

-- Vendors
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  type text not null,
  name text not null,
  phone text,
  email text,
  notes text,
  status text not null check (status in ('booked', 'shortlisted'))
);

-- Checklist
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  group_label text not null,
  title text not null,
  due_label text,
  status text not null check (status in ('done', 'next', 'later')),
  priority text not null default 'low' check (priority in ('high', 'medium', 'low')),
  sort_order int not null default 0
);

-- Decisions
create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  decision_date date not null,
  text text not null,
  created_at timestamptz not null default now()
);

-- Ideas whiteboard (tldraw document snapshot in state.document)
create table if not exists idea_boards (
  wedding_id uuid primary key references weddings(id) on delete cascade,
  state jsonb not null default '{"document": null}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS
alter table weddings enable row level security;
alter table events enable row level security;
alter table guests enable row level security;
alter table guest_relations enable row level security;
alter table budget_categories enable row level security;
alter table budget_payments enable row level security;
alter table payment_makers enable row level security;
alter table payment_sources enable row level security;
alter table bank_funds enable row level security;
alter table bank_fund_outflows enable row level security;
alter table vendors enable row level security;
alter table checklist_items enable row level security;
alter table decisions enable row level security;
alter table idea_boards enable row level security;

create policy "Authenticated full access weddings" on weddings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access events" on events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access guests" on guests for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access guest_relations" on guest_relations for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access budget" on budget_categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access budget_payments" on budget_payments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access payment_makers" on payment_makers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access payment_sources" on payment_sources for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access bank_funds" on bank_funds for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access bank_fund_outflows" on bank_fund_outflows for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access vendors" on vendors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access checklist" on checklist_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access decisions" on decisions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access idea_boards" on idea_boards for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Payment receipt images
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', true)
on conflict (id) do nothing;

create policy "Authenticated read payment receipts" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-receipts');

create policy "Authenticated upload payment receipts" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-receipts');

create policy "Authenticated update payment receipts" on storage.objects
  for update to authenticated
  using (bucket_id = 'payment-receipts');

create policy "Authenticated delete payment receipts" on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-receipts');

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
