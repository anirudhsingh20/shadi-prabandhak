-- Editable overall wedding budget target
alter table weddings
  add column if not exists total_budget numeric not null default 0 check (total_budget >= 0);
