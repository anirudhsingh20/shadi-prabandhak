-- Checklist priority (high / medium / low), separate from done checkbox status

alter table checklist_items
  add column if not exists priority text;

update checklist_items
set priority = case
  when status = 'next' then 'high'
  when status = 'later' then 'medium'
  else 'medium'
end
where priority is null;

alter table checklist_items
  alter column priority set default 'low';

alter table checklist_items
  alter column priority set not null;

alter table checklist_items
  drop constraint if exists checklist_items_priority_check;

alter table checklist_items
  add constraint checklist_items_priority_check
  check (priority in ('high', 'medium', 'low'));
