-- Per-product empty-stock label on the storefront.
alter table public.products
  add column if not exists oos_message text not null default 'out_of_stock';

alter table public.products
  drop constraint if exists products_oos_message_check;

alter table public.products
  add constraint products_oos_message_check
  check (oos_message in ('out_of_stock', 'not_available'));

comment on column public.products.oos_message is
  'Storefront label when stock is 0: out_of_stock | not_available';
