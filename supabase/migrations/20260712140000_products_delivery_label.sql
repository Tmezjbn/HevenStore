-- Per-product cart/checkout delivery label.
alter table public.products
  add column if not exists delivery_preset text not null default 'instant';

alter table public.products
  add column if not exists delivery_custom_en text;

alter table public.products
  add column if not exists delivery_custom_ar text;

alter table public.products
  drop constraint if exists products_delivery_preset_check;

alter table public.products
  add constraint products_delivery_preset_check
  check (
    delivery_preset in (
      'instant',
      'minutes',
      'hours',
      'days',
      'custom'
    )
  );

comment on column public.products.delivery_preset is
  'Cart/checkout delivery: instant | minutes | hours | days | custom';
comment on column public.products.delivery_custom_en is
  'Custom delivery label (EN) when delivery_preset = custom';
comment on column public.products.delivery_custom_ar is
  'Custom delivery label (AR) when delivery_preset = custom';
