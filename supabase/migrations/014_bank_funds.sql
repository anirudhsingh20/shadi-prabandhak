-- Bank fund ledger (replaces manual money_in_bank editing in UI)

create table if not exists bank_funds (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  label text not null,
  instrument text not null check (instrument in ('bank', 'rd', 'fd', 'cash', 'other')),
  availability text not null check (availability in ('now', 'scheduled', 'expected')),
  amount numeric not null check (amount >= 0),
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

alter table bank_funds enable row level security;

drop policy if exists "Authenticated full access bank_funds" on bank_funds;
create policy "Authenticated full access bank_funds"
  on bank_funds for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Migrate existing money_in_bank into one "now" entry per wedding
insert into bank_funds (wedding_id, label, payment_source, availability, amount, sort_order)
select id, 'Total in bank', null, 'now', money_in_bank, 0
from weddings
where money_in_bank > 0
  and not exists (
    select 1 from bank_funds bf where bf.wedding_id = weddings.id
  );
