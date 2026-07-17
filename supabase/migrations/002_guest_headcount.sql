-- People count per guest entry (family / plus-ones)
alter table guests
  add column if not exists headcount int not null default 1;

alter table guests drop constraint if exists guests_headcount_check;
alter table guests add constraint guests_headcount_check check (headcount >= 1);
