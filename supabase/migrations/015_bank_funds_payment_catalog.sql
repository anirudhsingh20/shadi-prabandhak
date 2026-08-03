-- Use payment_sources / payment_makers catalogs for bank funds

alter table bank_funds
  add column if not exists payment_source text,
  add column if not exists made_by text;

alter table bank_funds drop constraint if exists bank_funds_instrument_check;

alter table bank_funds drop column if exists instrument;
