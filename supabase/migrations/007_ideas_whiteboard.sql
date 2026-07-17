-- Replace list ideas with a whiteboard JSON board
drop table if exists ideas cascade;

create table if not exists idea_boards (
  wedding_id uuid primary key references weddings(id) on delete cascade,
  state jsonb not null default '{"boxes":[],"lines":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table idea_boards enable row level security;

drop policy if exists "Authenticated full access idea_boards" on idea_boards;
create policy "Authenticated full access idea_boards" on idea_boards
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
