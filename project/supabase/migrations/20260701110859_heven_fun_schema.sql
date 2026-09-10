/*
# HEVEN.FUN - Full E-Commerce Schema

## Overview
Complete schema for HEVEN.FUN digital goods marketplace.

## Tables Created
1. `profiles` - Extended user profiles with role system (admin/moderator/seller/buyer/member)
2. `categories` - Three-level category hierarchy (category > subcategory > sub-subcategory)
3. `products` - Digital products with full metadata, multi-image support, ratings
4. `product_images` - Product image gallery
5. `product_tags` - Many-to-many product tags
6. `orders` - Purchase orders linked to Polar.sh
7. `order_items` - Individual line items per order
8. `reviews` - Product reviews (only verified purchasers, one per product)
9. `coupons` - Discount coupons with usage tracking
10. `coupon_usages` - Track which user used which coupon
11. `notifications` - In-app notification center
12. `themes` - Customizable site themes
13. `site_settings` - Global site configuration (text, images, feature flags)
14. `seller_daily_quota` - Track seller's daily product additions
15. `campaigns` - Marketing campaigns targeting buyers

## Security
- RLS enabled on all tables
- Role-based policies: admin can do everything, moderator limited, seller own-data only
- Buyers auto-promoted via trigger after first purchase
- All sensitive operations validated server-side via database functions
*/

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','moderator','seller','buyer','member')),
  is_active boolean NOT NULL DEFAULT true,
  show_seller_name boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (
  auth.uid() = id OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- CATEGORIES (3-level hierarchy)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  slug text UNIQUE NOT NULL,
  description text,
  description_ar text,
  icon text,
  image_url text,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  level int NOT NULL DEFAULT 1 CHECK (level IN (1,2,3)),
  sort_order int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert_admin_mod" ON categories;
CREATE POLICY "categories_insert_admin_mod" ON categories FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "categories_update_admin_mod" ON categories;
CREATE POLICY "categories_update_admin_mod" ON categories FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  slug text UNIQUE NOT NULL,
  description text,
  description_ar text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  original_price numeric(10,2),
  thumbnail_url text,
  video_url text,
  category_id uuid REFERENCES categories(id),
  stock int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  rating numeric(3,2) DEFAULT 0,
  review_count int DEFAULT 0,
  sales_count int DEFAULT 0,
  seller_id uuid REFERENCES auth.users(id),
  show_seller_name boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_active" ON products;
CREATE POLICY "products_select_active" ON products FOR SELECT TO anon, authenticated USING (
  status = 'active' OR
  auth.uid() = seller_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator','seller'))
);

DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated USING (
  auth.uid() = seller_id OR
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
) WITH CHECK (
  auth.uid() = seller_id OR
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY "products_delete" ON products FOR DELETE TO authenticated USING (
  (auth.uid() = seller_id AND
    NOT EXISTS (SELECT 1 FROM profiles WHERE id = created_by AND role IN ('admin','moderator'))) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'moderator') AND
    NOT EXISTS (SELECT 1 FROM profiles WHERE id = created_by AND role = 'admin'))
);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_images_select" ON product_images;
CREATE POLICY "product_images_select" ON product_images FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "product_images_insert" ON product_images;
CREATE POLICY "product_images_insert" ON product_images FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_id AND (
      p.seller_id = auth.uid() OR
      p.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    )
  )
);

DROP POLICY IF EXISTS "product_images_delete" ON product_images;
CREATE POLICY "product_images_delete" ON product_images FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_id AND (
      p.seller_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    )
  )
);

DROP POLICY IF EXISTS "product_images_update" ON product_images;
CREATE POLICY "product_images_update" ON product_images FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM products p WHERE p.id = product_id AND (
      p.seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    )
  )
);

-- ============================================================
-- PRODUCT TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_select" ON tags;
CREATE POLICY "tags_select" ON tags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "tags_insert" ON tags;
CREATE POLICY "tags_insert" ON tags FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator','seller'))
);
DROP POLICY IF EXISTS "tags_update" ON tags;
CREATE POLICY "tags_update" ON tags FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);
DROP POLICY IF EXISTS "tags_delete" ON tags;
CREATE POLICY "tags_delete" ON tags FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_tags_select" ON product_tags;
CREATE POLICY "product_tags_select" ON product_tags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "product_tags_insert" ON product_tags;
CREATE POLICY "product_tags_insert" ON product_tags FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND (p.seller_id = auth.uid() OR p.created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))))
);
DROP POLICY IF EXISTS "product_tags_delete" ON product_tags;
CREATE POLICY "product_tags_delete" ON product_tags FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND (p.seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))))
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  polar_order_id text UNIQUE,
  polar_checkout_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  total numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  coupon_id uuid,
  discount_amount numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_polar ON orders(polar_order_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "orders_delete" ON orders;
CREATE POLICY "orders_delete" ON orders FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))))
);

DROP POLICY IF EXISTS "order_items_select_seller" ON order_items;
CREATE POLICY "order_items_select_seller" ON order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.seller_id = auth.uid())
);

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

DROP POLICY IF EXISTS "order_items_delete" ON order_items;
CREATE POLICY "order_items_delete" ON order_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- REVIEWS (only verified buyers, once per product)
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_insert" ON reviews FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = auth.uid() AND oi.product_id = product_id AND o.status = 'paid'
  )
);

DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete" ON reviews;
CREATE POLICY "reviews_delete" ON reviews FOR DELETE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(10,2) NOT NULL,
  min_order_amount numeric(10,2) DEFAULT 0,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_select_active" ON coupons;
CREATE POLICY "coupons_select_active" ON coupons FOR SELECT TO anon, authenticated USING (
  is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "coupons_insert_admin" ON coupons;
CREATE POLICY "coupons_insert_admin" ON coupons FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "coupons_update_admin" ON coupons;
CREATE POLICY "coupons_update_admin" ON coupons FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "coupons_delete_admin" ON coupons;
CREATE POLICY "coupons_delete_admin" ON coupons FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- COUPON USAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  order_id uuid REFERENCES orders(id),
  used_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupon_usages_select" ON coupon_usages;
CREATE POLICY "coupon_usages_select" ON coupon_usages FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "coupon_usages_insert" ON coupon_usages;
CREATE POLICY "coupon_usages_insert" ON coupon_usages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "coupon_usages_delete" ON coupon_usages;
CREATE POLICY "coupon_usages_delete" ON coupon_usages FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','order','review','discount','message','system')),
  title text NOT NULL,
  title_ar text,
  body text,
  body_ar text,
  is_read boolean NOT NULL DEFAULT false,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;
CREATE POLICY "notifications_insert_admin" ON notifications FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- THEMES
-- ============================================================
CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  colors jsonb NOT NULL DEFAULT '{}',
  fonts jsonb NOT NULL DEFAULT '{}',
  border_radius jsonb NOT NULL DEFAULT '{}',
  shadows jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "themes_select" ON themes;
CREATE POLICY "themes_select" ON themes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "themes_insert_admin" ON themes;
CREATE POLICY "themes_insert_admin" ON themes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "themes_update_admin" ON themes;
CREATE POLICY "themes_update_admin" ON themes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "themes_delete_admin" ON themes;
CREATE POLICY "themes_delete_admin" ON themes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- SITE SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  value_json jsonb,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_select" ON site_settings;
CREATE POLICY "site_settings_select" ON site_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_settings_insert_admin" ON site_settings;
CREATE POLICY "site_settings_insert_admin" ON site_settings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "site_settings_update_admin" ON site_settings;
CREATE POLICY "site_settings_update_admin" ON site_settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "site_settings_delete_admin" ON site_settings;
CREATE POLICY "site_settings_delete_admin" ON site_settings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- SELLER DAILY QUOTA
-- ============================================================
CREATE TABLE IF NOT EXISTS seller_daily_quota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_date date NOT NULL DEFAULT CURRENT_DATE,
  products_added int NOT NULL DEFAULT 0,
  UNIQUE(seller_id, quota_date)
);

ALTER TABLE seller_daily_quota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_quota_select_own" ON seller_daily_quota;
CREATE POLICY "seller_quota_select_own" ON seller_daily_quota FOR SELECT TO authenticated USING (
  auth.uid() = seller_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "seller_quota_insert" ON seller_daily_quota;
CREATE POLICY "seller_quota_insert" ON seller_daily_quota FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "seller_quota_update" ON seller_daily_quota;
CREATE POLICY "seller_quota_update" ON seller_daily_quota FOR UPDATE TO authenticated USING (auth.uid() = seller_id);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  target_role text NOT NULL DEFAULT 'buyer' CHECK (target_role IN ('buyer','member','all')),
  is_sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select_admin" ON campaigns;
CREATE POLICY "campaigns_select_admin" ON campaigns FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "campaigns_insert_admin" ON campaigns;
CREATE POLICY "campaigns_insert_admin" ON campaigns FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "campaigns_update_admin" ON campaigns;
CREATE POLICY "campaigns_update_admin" ON campaigns FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "campaigns_delete_admin" ON campaigns;
CREATE POLICY "campaigns_delete_admin" ON campaigns FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Promote user to buyer after first paid order
CREATE OR REPLACE FUNCTION promote_buyer_on_order()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE profiles SET role = 'buyer' WHERE id = NEW.user_id AND role = 'member';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_paid ON orders;
CREATE TRIGGER on_order_paid
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION promote_buyer_on_order();

-- Update product rating when review is inserted/updated
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE products SET
    rating = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_change ON reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Check seller daily quota (max 3 per day, but deleted products free up slots)
CREATE OR REPLACE FUNCTION check_seller_can_add_product(seller_uuid uuid)
RETURNS boolean AS $$
DECLARE
  active_today int;
BEGIN
  SELECT COUNT(*) INTO active_today
  FROM products
  WHERE seller_id = seller_uuid
    AND DATE(created_at) = CURRENT_DATE
    AND status != 'inactive';

  RETURN active_today < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default site settings
INSERT INTO site_settings (key, value) VALUES
  ('site_name', 'HEVEN.FUN'),
  ('site_tagline', 'Play More. Pay Less.'),
  ('hero_title', 'PLAY MORE.'),
  ('hero_subtitle', 'PAY LESS.'),
  ('hero_description', 'Your ultimate destination for games, subscriptions, and digital entertainment.'),
  ('logo_url', ''),
  ('primary_color', '#7c3aed'),
  ('stats_customers', '10K+'),
  ('stats_products', '500+'),
  ('stats_support', '24/7')
ON CONFLICT (key) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, name_ar, slug, icon, level, sort_order) VALUES
  ('Games', 'الألعاب', 'games', 'Gamepad2', 1, 1),
  ('Subscriptions', 'الاشتراكات', 'subscriptions', 'Crown', 1, 2),
  ('Gift Cards', 'بطاقات الهدايا', 'gift-cards', 'Gift', 1, 3),
  ('EA Play', 'EA Play', 'ea-play', 'Zap', 1, 4),
  ('Xbox Game Pass', 'Xbox Game Pass', 'xbox-game-pass', 'Monitor', 1, 5),
  ('PlayStation Plus', 'PlayStation Plus', 'playstation-plus', 'Tv', 1, 6)
ON CONFLICT (slug) DO NOTHING;

-- Insert default dark theme
INSERT INTO themes (name, is_active, colors, fonts, border_radius, shadows) VALUES
  ('HEVEN Dark', true,
   '{"primary":"#7c3aed","secondary":"#1e1b4b","accent":"#a855f7","background":"#0a0a0f","surface":"#12121a","surface2":"#1a1a2e","text":"#ffffff","textMuted":"#9ca3af","success":"#22c55e","warning":"#f59e0b","error":"#ef4444","border":"#1e1e2e"}',
   '{"heading":"Inter","body":"Inter","mono":"JetBrains Mono"}',
   '{"sm":"4px","md":"8px","lg":"12px","xl":"16px","full":"9999px"}',
   '{"sm":"0 1px 3px rgba(0,0,0,0.5)","md":"0 4px 12px rgba(0,0,0,0.6)","lg":"0 8px 24px rgba(0,0,0,0.7)","glow":"0 0 20px rgba(124,58,237,0.3)"}'
  )
ON CONFLICT DO NOTHING;
