-- Ideas board
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  title text not null,
  notes text,
  category text not null default 'other' check (category in (
    'theme', 'venue', 'outfit', 'food', 'decor', 'music', 'photo', 'ritual', 'other'
  )),
  status text not null default 'idea' check (status in ('idea', 'considering', 'chosen', 'dropped')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table ideas enable row level security;

drop policy if exists "Authenticated full access ideas" on ideas;
create policy "Authenticated full access ideas" on ideas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
