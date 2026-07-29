-- Dynamic payment catalogs: who made the payment, and payment source (cash / bank / etc.)

alter table budget_payments
  add column if not exists made_by text,
  add column if not exists payment_source text;

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

alter table payment_makers enable row level security;
alter table payment_sources enable row level security;

drop policy if exists "Authenticated full access payment_makers" on payment_makers;
create policy "Authenticated full access payment_makers"
  on payment_makers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated full access payment_sources" on payment_sources;
create policy "Authenticated full access payment_sources"
  on payment_sources for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
