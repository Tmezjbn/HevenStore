-- Optional homepage surfaces; fall back to thumbnail_url when null.
alter table public.products
  add column if not exists ad_banner_url text;

alter table public.products
  add column if not exists hover_image_url text;

alter table public.products
  add column if not exists hero_backdrop_url text;

comment on column public.products.ad_banner_url is
  'Optional wide image for homepage ad banner; falls back to thumbnail_url';

comment on column public.products.hover_image_url is
  'Optional image for homepage hover cards; falls back to thumbnail_url';

comment on column public.products.hero_backdrop_url is
  'Optional image for homepage hero backdrop; falls back to thumbnail_url';
