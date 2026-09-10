-- Global storefront hover-3d tune (motion / speed / smooth). Per-product enable stays products.hover_3d.
INSERT INTO public.site_settings (key, value)
VALUES ('product_hover_3d_json', '{"motion":5,"speed":5,"smooth":5}')
ON CONFLICT (key) DO NOTHING;
