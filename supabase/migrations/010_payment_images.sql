-- Receipt / proof image on payments + storage bucket

alter table budget_payments
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated read payment receipts" on storage.objects;
create policy "Authenticated read payment receipts" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-receipts');

drop policy if exists "Authenticated upload payment receipts" on storage.objects;
create policy "Authenticated upload payment receipts" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-receipts');

drop policy if exists "Authenticated update payment receipts" on storage.objects;
create policy "Authenticated update payment receipts" on storage.objects
  for update to authenticated
  using (bucket_id = 'payment-receipts');

drop policy if exists "Authenticated delete payment receipts" on storage.objects;
create policy "Authenticated delete payment receipts" on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-receipts');
