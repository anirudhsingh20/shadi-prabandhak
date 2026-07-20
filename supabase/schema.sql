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
  relation text check (relation is null or relation in ('father', 'mother', 'friends', 'other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
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
alter table budget_categories enable row level security;
alter table budget_payments enable row level security;
alter table vendors enable row level security;
alter table checklist_items enable row level security;
alter table decisions enable row level security;
alter table idea_boards enable row level security;

create policy "Authenticated full access weddings" on weddings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access events" on events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access guests" on guests for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access budget" on budget_categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access budget_payments" on budget_payments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access vendors" on vendors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access checklist" on checklist_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access decisions" on decisions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access idea_boards" on idea_boards for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
