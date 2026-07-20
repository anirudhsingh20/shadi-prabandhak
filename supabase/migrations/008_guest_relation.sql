-- Guest relation: how they relate (father, mother, friends, other)
alter table guests
  add column if not exists relation text;

alter table guests drop constraint if exists guests_relation_check;
alter table guests add constraint guests_relation_check
  check (relation is null or relation in ('father', 'mother', 'friends', 'other'));
