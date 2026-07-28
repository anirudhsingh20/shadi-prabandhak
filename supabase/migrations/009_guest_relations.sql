-- Allow any relation value on guests (managed via guest_relations catalog)
alter table guests drop constraint if exists guests_relation_check;

create table if not exists guest_relations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  key text not null,
  label text not null,
  sort_order int not null default 0,
  unique (wedding_id, key)
);

alter table guest_relations enable row level security;

drop policy if exists "Authenticated full access guest_relations" on guest_relations;
create policy "Authenticated full access guest_relations"
  on guest_relations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Migrate existing guest.relation values into the catalog (no hardcoded list)
insert into guest_relations (wedding_id, key, label, sort_order)
select
  g.wedding_id,
  g.relation as key,
  initcap(replace(g.relation, '_', ' ')) as label,
  (row_number() over (partition by g.wedding_id order by min(g.created_at), g.relation) - 1)::int as sort_order
from guests g
where g.relation is not null
  and trim(g.relation) <> ''
group by g.wedding_id, g.relation
on conflict (wedding_id, key) do nothing;
