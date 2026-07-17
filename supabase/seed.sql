-- Seed data for Shadi Prabandhak
-- Run after schema.sql

insert into weddings (id, bride_name, groom_name, wedding_date, money_in_bank, total_budget)
values ('00000000-0000-0000-0000-000000000001', 'Anjali', 'Anirudh', '2026-11-20', 2000000, 2500000)
on conflict (id) do update set
  money_in_bank = excluded.money_in_bank,
  total_budget = excluded.total_budget;

insert into events (wedding_id, name, event_date, time_label, venue, tag, sort_order) values
('00000000-0000-0000-0000-000000000001', 'Mehendi', '2026-11-17', '4:00 PM onwards', 'Bride''s side venue · Henna, music, light bites', 'Day 1', 1),
('00000000-0000-0000-0000-000000000001', 'Haldi', '2026-11-18', '10:00 AM', 'Home / lawn · Turmeric ceremony, family rituals', 'Day 2', 2),
('00000000-0000-0000-0000-000000000001', 'Sangeet', '2026-11-19', '7:00 PM', 'Banquet hall · Dance performances, dinner', 'Day 3', 3),
('00000000-0000-0000-0000-000000000001', 'Wedding (Vivah)', '2026-11-20', '11:00 AM', 'Mandap · Pheras, baraat, lunch', 'Main', 4),
('00000000-0000-0000-0000-000000000001', 'Reception', '2026-11-20', '7:00 PM', 'Same venue · Grand dinner, stage, photo ops', 'Evening', 5);

insert into guests (wedding_id, name, side, rsvp_status, headcount, events_attending, notes) values
('00000000-0000-0000-0000-000000000001', 'Rajesh & Sunita Sharma', 'bride', 'confirmed', 2, 'All', 'Uncle & aunt — front row'),
('00000000-0000-0000-0000-000000000001', 'Vikram Mehta', 'groom', 'confirmed', 1, 'Wedding (Vivah), Reception', 'College friend'),
('00000000-0000-0000-0000-000000000001', 'Priya & Arjun Kapoor', 'bride', 'pending', 2, 'All', 'Cousins from Delhi'),
('00000000-0000-0000-0000-000000000001', 'Dr. Anil Verma', 'groom', 'confirmed', 1, 'Wedding (Vivah)', 'Family pandit referral'),
('00000000-0000-0000-0000-000000000001', 'Neha & Rohit Agarwal', 'bride', 'declined', 2, null, 'Traveling abroad'),
('00000000-0000-0000-0000-000000000001', 'Sanjay Iyer', 'groom', 'pending', 1, 'Sangeet, Reception', 'Office colleague'),
('00000000-0000-0000-0000-000000000001', 'Meera & Kartik Joshi', 'bride', 'confirmed', 2, 'Mehendi, Sangeet, Wedding (Vivah)', 'Close friends'),
('00000000-0000-0000-0000-000000000001', 'Ramesh & Lakshmi Nair', 'groom', 'pending', 2, 'All', 'Parents'' neighbours'),
('00000000-0000-0000-0000-000000000001', 'College batch 2018', 'common', 'confirmed', 6, 'Sangeet, Reception', 'Mutual friends'),
('00000000-0000-0000-0000-000000000001', 'Office team leads', 'common', 'pending', 4, 'Reception', 'Shared workplace');

insert into budget_categories (id, wedding_id, name, allocated, spent, sort_order) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Venue & Decor', 800000, 420000, 1),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Catering', 600000, 180000, 2),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Photography & Video', 250000, 150000, 3),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Outfits & Jewellery', 300000, 90000, 4),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Mehendi & Makeup', 100000, 40000, 5),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Music & Entertainment', 150000, 50000, 6),
('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Invites & Gifts', 100000, 20000, 7),
('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Misc & Buffer', 200000, 0, 8)
on conflict (id) do nothing;

insert into budget_payments (wedding_id, category_id, title, amount, status, due_date, notes) values
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Venue booking advance', 420000, 'done', '2026-06-15', 'First tranche'),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Catering token', 180000, 'done', '2026-07-01', null),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Photo & video booking', 150000, 'done', '2026-06-20', null),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Outfit deposits', 90000, 'done', '2026-07-05', null),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Mehendi artist booking', 40000, 'done', '2026-07-10', null),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'DJ booking advance', 50000, 'done', '2026-07-12', null),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'Invite printing', 20000, 'done', '2026-07-15', null),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Venue balance', 380000, 'pending', '2026-11-01', 'Due before wedding'),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Catering balance', 420000, 'pending', '2026-11-10', null),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Album & extras', 50000, 'may_come', null, 'Optional add-ons'),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'Guest transport', 75000, 'may_come', '2026-11-15', 'If needed');

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

insert into idea_boards (wedding_id, state) values
('00000000-0000-0000-0000-000000000001', '{"document": null}'::jsonb)
on conflict (wedding_id) do nothing;
