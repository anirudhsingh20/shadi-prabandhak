-- Support multiple receipt images per payment

alter table budget_payments
  add column if not exists image_urls text[] not null default '{}';

update budget_payments
set image_urls = array[image_url]
where image_url is not null
  and image_url <> ''
  and (image_urls is null or cardinality(image_urls) = 0);

alter table budget_payments
  drop column if exists image_url;
