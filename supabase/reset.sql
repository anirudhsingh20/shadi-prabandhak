-- Full reset: drop old tables + recreate schema + seed
-- Run in Supabase SQL Editor (all at once)
-- Includes: side (bride|groom|common), headcount, created_at, updated_at

-- ─── 1. Drop old objects ───
drop table if exists decisions cascade;
drop table if exists checklist_items cascade;
drop table if exists vendors cascade;
drop table if exists budget_categories cascade;
drop table if exists guests cascade;
drop table if exists events cascade;
drop table if exists weddings cascade;
drop function if exists set_guests_updated_at() cascade;

-- ─── 2. Schema ───
create extension if not exists "pgcrypto";

create table weddings (
  id uuid primary key default gen_random_uuid(),
  bride_name text not null,
  groom_name text not null,
  wedding_date date not null,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  event_date date not null,
  time_label text,
  venue text,
  tag text,
  sort_order int not null default 0
);

create table guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  side text not null check (side in ('bride', 'groom', 'common')),
  rsvp_status text not null check (rsvp_status in ('confirmed', 'pending', 'declined')),
  headcount int not null default 1 check (headcount >= 1),
  events_attending text,
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

create trigger guests_set_updated_at
  before update on guests
  for each row execute function set_guests_updated_at();

create table budget_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  allocated numeric not null default 0 check (allocated >= 0),
  spent numeric not null default 0 check (spent >= 0),
  sort_order int not null default 0
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  type text not null,
  name text not null,
  phone text,
  email text,
  notes text,
  status text not null check (status in ('booked', 'shortlisted'))
);

create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  group_label text not null,
  title text not null,
  due_label text,
  status text not null check (status in ('done', 'next', 'later')),
  sort_order int not null default 0
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  decision_date date not null,
  text text not null,
  created_at timestamptz not null default now()
);

alter table weddings enable row level security;
alter table events enable row level security;
alter table guests enable row level security;
alter table budget_categories enable row level security;
alter table vendors enable row level security;
alter table checklist_items enable row level security;
alter table decisions enable row level security;

create policy "Authenticated full access weddings" on weddings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access events" on events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access guests" on guests for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access budget" on budget_categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access vendors" on vendors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access checklist" on checklist_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access decisions" on decisions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ─── 3. Seed ───
insert into weddings (id, bride_name, groom_name, wedding_date)
values ('00000000-0000-0000-0000-000000000001', 'Anjali', 'Anirudh', '2026-11-20');

insert into events (wedding_id, name, event_date, time_label, venue, tag, sort_order) values
('00000000-0000-0000-0000-000000000001', 'Mehendi', '2026-11-17', '4:00 PM onwards', 'Bride''s side venue · Henna, music, light bites', 'Day 1', 1),
('00000000-0000-0000-0000-000000000001', 'Haldi', '2026-11-18', '10:00 AM', 'Home / lawn · Turmeric ceremony, family rituals', 'Day 2', 2),
('00000000-0000-0000-0000-000000000001', 'Sangeet', '2026-11-19', '7:00 PM', 'Banquet hall · Dance performances, dinner', 'Day 3', 3),
('00000000-0000-0000-0000-000000000001', 'Wedding (Vivah)', '2026-11-20', '11:00 AM', 'Mandap · Pheras, baraat, lunch', 'Main', 4),
('00000000-0000-0000-0000-000000000001', 'Reception', '2026-11-20', '7:00 PM', 'Same venue · Grand dinner, stage, photo ops', 'Evening', 5);

-- Guests with staggered timestamps (for created / modified sort demos)
insert into guests (wedding_id, name, side, rsvp_status, headcount, events_attending, notes, created_at, updated_at) values
('00000000-0000-0000-0000-000000000001', 'Rajesh & Sunita Sharma', 'bride', 'confirmed', 2, 'All', 'Uncle & aunt — front row', '2026-06-01 10:00:00+05:30', '2026-07-10 14:00:00+05:30'),
('00000000-0000-0000-0000-000000000001', 'Vikram Mehta', 'groom', 'confirmed', 1, 'Wedding (Vivah), Reception', 'College friend', '2026-06-02 11:00:00+05:30', '2026-06-02 11:00:00+05:30'),
('00000000-0000-0000-0000-000000000001', 'Priya & Arjun Kapoor', 'bride', 'pending', 2, 'All', 'Cousins from Delhi', '2026-06-05 09:30:00+05:30', '2026-07-15 18:20:00+05:30'),
('00000000-0000-0000-0000-000000000001', 'Dr. Anil Verma', 'groom', 'confirmed', 1, 'Wedding (Vivah)', 'Family pandit referral', '2026-06-08 16:00:00+05:30', '2026-06-20 12:00:00+05:30'),
('00000000-0000-0000-0000-000000000001', 'Neha & Rohit Agarwal', 'bride', 'declined', 2, null, 'Traveling abroad', '2026-06-10 08:00:00+05:30', '2026-07-01 09:00:00+05:30'),
('00000000-0000-0000-0000-000000000001', 'Sanjay Iyer', 'groom', 'pending', 1, 'Sangeet, Reception', 'Office colleague', '2026-06-12 13:00:00+05:30', '2026-06-12 13:00:00+05:30'),
('00000000-0000-0000-0000-000000000001', 'Meera & Kartik Joshi', 'bride', 'confirmed', 2, 'Mehendi, Sangeet, Wedding (Vivah)', 'Close friends', '2026-06-15 19:00:00+05:30', '2026-07-16 10:30:00+05:30'),
('00000000-0000-0000-0000-000000000001', 'Ramesh & Lakshmi Nair', 'groom', 'pending', 2, 'All', 'Parents'' neighbours', '2026-06-18 10:00:00+05:30', '2026-07-12 16:45:00+05:30'),
('00000000-0000-0000-0000-000000000001', 'College batch 2018', 'common', 'confirmed', 6, 'Sangeet, Reception', 'Mutual friends', '2026-06-20 15:00:00+05:30', '2026-07-17 11:00:00+05:30'),
('00000000-0000-0000-0000-000000000001', 'Office team leads', 'common', 'pending', 4, 'Reception', 'Shared workplace', '2026-06-22 12:00:00+05:30', '2026-07-18 08:15:00+05:30');

insert into budget_categories (wedding_id, name, allocated, spent, sort_order) values
('00000000-0000-0000-0000-000000000001', 'Venue & Decor', 800000, 420000, 1),
('00000000-0000-0000-0000-000000000001', 'Catering', 600000, 180000, 2),
('00000000-0000-0000-0000-000000000001', 'Photography & Video', 250000, 150000, 3),
('00000000-0000-0000-0000-000000000001', 'Outfits & Jewellery', 300000, 90000, 4),
('00000000-0000-0000-0000-000000000001', 'Mehendi & Makeup', 100000, 40000, 5),
('00000000-0000-0000-0000-000000000001', 'Music & Entertainment', 150000, 50000, 6),
('00000000-0000-0000-0000-000000000001', 'Invites & Gifts', 100000, 20000, 7),
('00000000-0000-0000-0000-000000000001', 'Misc & Buffer', 200000, 0, 8);

insert into vendors (wedding_id, type, name, phone, email, notes, status) values
('00000000-0000-0000-0000-000000000001', 'Venue', 'Grand Heritage Banquet', '+91 98765 43210', 'venue@example.com', 'Capacity 500 · Lawn + hall', 'shortlisted'),
('00000000-0000-0000-0000-000000000001', 'Photography', 'Lens & Light Studio', '+91 91234 56789', 'hello@lenslight.in', 'Candid + traditional · 2 photographers', 'booked'),
('00000000-0000-0000-0000-000000000001', 'Catering', 'Royal Rasoi Caterers', '+91 99887 76655', 'info@royalrasoi.com', 'North Indian · Live counters · 400 pax', 'shortlisted'),
('00000000-0000-0000-0000-000000000001', 'Decorator', 'Floral Dreams Decor', '+91 97654 32109', 'contact@floraldreams.in', 'Mandap, stage, entrance', 'booked'),
('00000000-0000-0000-0000-000000000001', 'Mehendi Artist', 'Henna by Priya', '+91 96543 21098', null, 'Bridal + family · Mehendi night', 'booked'),
('00000000-0000-0000-0000-000000000001', 'Makeup', 'Glam by Ananya', '+91 95432 10987', 'ananya@glamstudio.in', 'Bridal + bridesmaids · All events', 'shortlisted'),
('00000000-0000-0000-0000-000000000001', 'DJ & Music', 'Beat Box Entertainment', '+91 94321 09876', 'dj@beatbox.in', 'Sangeet + Reception', 'shortlisted'),
('00000000-0000-0000-0000-000000000001', 'Pandit', 'Pt. Ram Sharma', '+91 93210 98765', null, 'Vivah sanskar · Muhurat confirmed', 'booked');

insert into checklist_items (wedding_id, group_label, title, due_label, status, sort_order) values
('00000000-0000-0000-0000-000000000001', 'July – August 2026', 'Fix wedding date & muhurat with pandit', 'Done', 'done', 1),
('00000000-0000-0000-0000-000000000001', 'July – August 2026', 'Book photographer & decorator', 'Done', 'done', 2),
('00000000-0000-0000-0000-000000000001', 'July – August 2026', 'Finalize venue — sign contract', 'By Aug 2026', 'next', 3),
('00000000-0000-0000-0000-000000000001', 'July – August 2026', 'Draft guest list (both families)', 'By Aug 2026', 'next', 4),
('00000000-0000-0000-0000-000000000001', 'July – August 2026', 'Shortlist caterers — tasting session', 'Sep 2026', 'later', 5),
('00000000-0000-0000-0000-000000000001', 'September – October 2026', 'Send save-the-date / digital invites', 'Sep 2026', 'later', 6),
('00000000-0000-0000-0000-000000000001', 'September – October 2026', 'Book mehendi artist & makeup trial', 'Sep 2026', 'later', 7),
('00000000-0000-0000-0000-000000000001', 'September – October 2026', 'Finalize outfits — bride, groom, family', 'Oct 2026', 'later', 8),
('00000000-0000-0000-0000-000000000001', 'September – October 2026', 'Sangeet choreography & song list', 'Oct 2026', 'later', 9),
('00000000-0000-0000-0000-000000000001', 'September – October 2026', 'Confirm DJ, dhol, and baraat route', 'Oct 2026', 'later', 10),
('00000000-0000-0000-0000-000000000001', 'November 2026 — Wedding week', 'Final headcount to caterer', '1 week before', 'later', 11),
('00000000-0000-0000-0000-000000000001', 'November 2026 — Wedding week', 'Vendor walkthrough at venue', '3 days before', 'later', 12),
('00000000-0000-0000-0000-000000000001', 'November 2026 — Wedding week', 'Mehendi & Haldi prep — supplies, seating', '2 days before', 'later', 13),
('00000000-0000-0000-0000-000000000001', 'November 2026 — Wedding week', 'Wedding day timeline — share with family & vendors', '1 day before', 'later', 14),
('00000000-0000-0000-0000-000000000001', 'November 2026 — Wedding week', 'Enjoy the celebrations!', '20 Nov 2026', 'later', 15);

insert into decisions (wedding_id, decision_date, text) values
('00000000-0000-0000-0000-000000000001', '2026-07-01', 'Wedding date fixed: 20 November 2026'),
('00000000-0000-0000-0000-000000000001', '2026-07-05', 'Five-event Indian ceremony: Mehendi → Haldi → Sangeet → Wedding → Reception'),
('00000000-0000-0000-0000-000000000001', '2026-07-10', 'Venue shortlist in progress — final visit scheduled'),
('00000000-0000-0000-0000-000000000001', '2026-07-15', 'Guest list draft: ~250 families (both sides combined)');
