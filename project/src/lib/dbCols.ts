/** Explicit PostgREST column lists — avoid select('*') on hot / list paths. */

export const BADGE_COLS = [
  'id',
  'slug',
  'name_ar',
  'name_en',
  'description_ar',
  'description_en',
  'icon',
  'created_by',
  'created_at',
].join(',');

export const COUPON_COLS = [
  'id',
  'code',
  'description',
  'discount_type',
  'discount_value',
  'min_order_amount',
  'max_uses',
  'uses_count',
  'is_active',
  'expires_at',
  'created_by',
  'created_at',
  'required_badge_id',
].join(',');

export const NOTIFICATION_COLS = [
  'id',
  'user_id',
  'type',
  'title',
  'title_ar',
  'body',
  'body_ar',
  'is_read',
  'data',
  'created_at',
].join(',');

/** Staff profile lists (Users danger picker, deletion queue). */
export const PROFILE_ADMIN_COLS = [
  'id',
  'email',
  'username',
  'full_name',
  'avatar_url',
  'role',
  'is_active',
  'show_seller_name',
  'show_badges',
  'deletion_scheduled_at',
  'disabled_until',
  'created_at',
  'updated_at',
].join(',');

export const CATEGORY_COLS = [
  'id',
  'name',
  'name_ar',
  'slug',
  'description',
  'description_ar',
  'icon',
  'image_url',
  'parent_id',
  'level',
  'sort_order',
  'is_active',
  'aura_dual',
  'created_at',
].join(',');
