-- Allow guests shared by both families
alter table guests drop constraint if exists guests_side_check;
alter table guests add constraint guests_side_check
  check (side in ('bride', 'groom', 'common'));
