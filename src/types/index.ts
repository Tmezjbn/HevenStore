import type { ProductCardFx } from '../lib/productCardFx';

export type Role = 'owner' | 'admin' | 'moderator' | 'support' | 'seller' | 'buyer' | 'member';

export type AnalyticsConsentChoice = 'accepted' | 'declined';

export type { ProductCardFx };

export interface Profile {
  id: string;
  email: string | null;
  /** Public handle for /seller/:username and login. */
  username?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
  /** Support agent escalation standing (default 100; ≤40 restricted). */
  support_standing?: number;
  /** Owner/admin observe notes — readable by staff on tickets. */
  staff_notes?: string | null;
  show_seller_name: boolean;
  /** When true, earned badges show under public profile / seller surfaces. */
  show_badges?: boolean;
  /** null = undecided; synced when signed in */
  analytics_consent?: AnalyticsConsentChoice | null;
  preferred_skin?: string | null;
  preferred_mode?: 'dark' | 'light' | null;
  /** Soft-delete: set when owner approves deletion (30-day window). */
  deletion_scheduled_at?: string | null;
  /** Temp disable end; null + !is_active = indefinite. */
  disabled_until?: string | null;
  /** Last successful username rename — 14d cooldown after first change. */
  username_changed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
  created_by: string | null;
  created_at: string;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  awarded_at: string;
  badge?: Badge;
}

export interface Category {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  icon: string | null;
  image_url: string | null;
  parent_id: string | null;
  /** Nesting depth 1–6 (root = 1). */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  sort_order: number;
  is_active: boolean;
  aura_dual: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  price: number;
  original_price: number | null;
  thumbnail_url: string | null;
  /** Optional homepage ad banner media; falls back to thumbnail_url. */
  ad_banner_url?: string | null;
  /** Optional homepage hover-card media; falls back to thumbnail_url. */
  hover_image_url?: string | null;
  /** Optional homepage hero backdrop media; falls back to thumbnail_url. */
  hero_backdrop_url?: string | null;
  video_url: string | null;
  /**
   * Up to 3 showcase embeds (ads + no-ads URLs) + defaults.
   * `video_url` remains the resolved default for back-compat.
   */
  video_embeds?: unknown;
  /** Showcase video on PDP. Defaults false (opt-in; privacy). */
  video_enabled?: boolean;
  /** Showcase autoplay. Defaults true if column missing. */
  video_autoplay?: boolean;
  /** Showcase volume 0–100. Defaults 25 if column missing. */
  video_volume?: number;
  category_id: string | null;
  stock: number;
  status: 'active' | 'inactive' | 'draft';
  /** Label when stock is 0. Defaults to out_of_stock. */
  oos_message?: 'out_of_stock' | 'not_available';
  /** Cart/checkout delivery. Defaults to instant. */
  delivery_preset?: 'instant' | 'minutes' | 'hours' | 'days' | 'custom';
  delivery_custom_en?: string | null;
  delivery_custom_ar?: string | null;
  rating: number;
  /** Owner seed shown until first buyer review (default 5). */
  rating_seed?: number;
  review_count: number;
  /** Optional game-icon ids for site atmosphere on this PDP; empty = global. */
  atmosphere_logo_ids?: string[] | null;
  sales_count: number;
  is_featured: boolean;
  /** daisyUI aura around storefront card. Defaults to none if column missing. */
  aura_style?:
    | 'none'
    | 'default'
    | 'dual'
    | 'rainbow'
    | 'holo'
    | 'gold'
    | 'silver'
    | 'glow'
    | 'electric';
  /** Optional #RRGGBB tint for aura (`currentColor` / custom override). */
  aura_color?: string | null;
  /** Electric aura knobs: `{ speed, chaos, thickness }`. Empty/`{}` = defaults. */
  aura_electric_json?: { speed?: number; chaos?: number; thickness?: number } | null;
  /** Whole-card pointer tilt on storefront (tune via site_settings.product_hover_3d_json). */
  hover_3d?: boolean;
  /** Card-body FX behind title/meta/price (matrix, logo, …). */
  card_fx?: ProductCardFx | null;
  /** Builtin or custom slug (see productTypes.ts + site_settings.product_types_json). */
  product_type: string;
  seller_id: string | null;
  show_seller_name: boolean;
  /** Public label/value specs (OS, region, …). Not fulfillment secrets. */
  requirements?: { label: string; value: string }[] | null;
  /** "Added by" attribution / delete lock; null = shared. */
  created_by: string | null;
  /** Who created the product row (immutable). */
  added_by?: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  images?: ProductImage[];
  seller?: Profile;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  /** Human-readable code (ORD-YYYYMMDD-########). UUID `id` stays the PK. */
  order_number?: string;
  user_id: string | null;
  polar_order_id: string | null;
  polar_checkout_id: string | null;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  total: number;
  currency: string;
  coupon_id: string | null;
  discount_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product?: Product;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  staff_reply?: string | null;
  staff_reply_by?: string | null;
  staff_reply_at?: string | null;
  profile?: Profile;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  /** When set, user must hold this badge to apply the coupon. */
  required_badge_id?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'order' | 'review' | 'discount' | 'message' | 'system';
  title: string;
  title_ar: string | null;
  body: string | null;
  body_ar: string | null;
  is_read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface Theme {
  id: string;
  name: string;
  is_active: boolean;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  border_radius: Record<string, string>;
  shadows: Record<string, string>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
