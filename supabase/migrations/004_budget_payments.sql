-- Money in bank + payment tracker

alter table weddings
  add column if not exists money_in_bank numeric not null default 0 check (money_in_bank >= 0);

alter table weddings
  add column if not exists total_budget numeric not null default 0 check (total_budget >= 0);

create table if not exists budget_payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  category_id uuid references budget_categories(id) on delete set null,
  title text not null,
  amount numeric not null default 0 check (amount >= 0),
  status text not null check (status in ('done', 'pending', 'may_come')),
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);

alter table budget_payments enable row level security;

drop policy if exists "Authenticated full access budget_payments" on budget_payments;
create policy "Authenticated full access budget_payments" on budget_payments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
