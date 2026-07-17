-- Timestamps for guest sort (created / modified)
alter table guests
  add column if not exists created_at timestamptz not null default now();

alter table guests
  add column if not exists updated_at timestamptz not null default now();

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
