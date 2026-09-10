import { Plus, Trash2, Search, X, Loader2, ImagePlus, ChevronUp, ChevronDown, FolderOpen, ArrowLeft, Package, CircleDollarSign, KeyRound, AlignLeft, Star, Sparkles, Orbit, UserRound, ListChecks, Images, UserPen, CircleHelp } from 'lucide-react';
import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
// PERF-2: defer editor CSS off storefront main chunk (loads with this lazy route).
void import('../../styles/product-editor.css');
import { useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { parseSecretContent, serializeSecretContent } from '../../lib/fulfillment';
import { parseRequirements, serializeRequirements } from '../../lib/productRequirements';
import { ROLE_INFO, roleLabel } from '../../lib/roles';
import { isVideoUrl } from '../../lib/mediaUrl';
import {
  classifyMediaUrl,
  type MediaResourceKind,
} from '../../lib/videoEmbed';
import {
  collectEmbedUrls,
  DEFAULT_VIDEO_EMBED_LABELS,
  emptyVideoEmbeds,
  normalizeVideoEmbeds,
  resolveDefaultVideoUrl,
  setEmbedSlotUrl,
  slotHasUrl,
  type VideoEmbedLabels,
  type VideoEmbedSlotIndex,
  type VideoEmbedVariant,
  type VideoEmbeds,
} from '../../lib/videoEmbeds';
import {
  listMediaResources,
  upsertMediaResource,
} from '../../lib/mediaResources';
import ProductMedia from '../../components/ui/ProductMedia';
import ProductVideoPlayer from '../../components/ui/ProductVideoPlayer';
import ProductCardBodyFx from '../../components/ui/ProductCardBodyFx';
import UserAvatar from '../../components/ui/UserAvatar';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import type { Product, Category, Profile, Role } from '../../types';
import { CATEGORY_COLS } from '../../lib/dbCols';
import { PRODUCT_EDITOR_COLS } from '../../hooks/useCatalog';
import { flattenCategoryTree, indentPrefix } from '../../lib/categories';
import { parseDeliveryPreset, type DeliveryPreset } from '../../lib/productDelivery';
import { clampSeed } from '../../lib/productRating';
import {
  DEFAULT_VIDEO_AUTOPLAY,
  DEFAULT_VIDEO_VOLUME,
  clampVideoVolume,
} from '../../lib/videoPlayback';
import { useSaveSiteSettings, useSiteSettings } from '../../hooks/useSiteSettings';
import {
  allProductTypes,
  parseProductTypesJson,
  serializeProductTypesJson,
  slugifyProductType,
  type ProductTypeDef,
} from '../../lib/productTypes';
import {
  HOME_ADS_SIZE_GUIDES,
  HOME_ADS_SIZES,
  parseHomeAdsSize,
  parsePlyrConfig,
  parseProductDetailFx,
  parseSellerDailyProductLimit,
  utcDayStartIso,
  type HomeAdsSize,
} from '../../lib/siteSettings';
import {
  ATMOSPHERE_LOGO_CATALOG,
  ATMOSPHERE_LOGO_IDS,
  atmosphereLogoToneClass,
} from '../../lib/atmosphereLogos';
import { canEditProductAuthor } from '../../lib/productAuthorLock';
import {
  CARD_FX_STYLES,
  DEFAULT_CARD_FX_COLOR,
  DEFAULT_CARD_FX_COLOR2,
  DEFAULT_CARD_FX_COLOR3,
  DEFAULT_GLITCH_CHARS,
  DEFAULT_GLITCH_SPEED,
  DEFAULT_MATRIX_COLS,
  DEFAULT_MATRIX_LETTERS,
  DEFAULT_MATRIX_SPEED,
  GLITCH_SPEED_MAX,
  GLITCH_SPEED_MIN,
  MATRIX_COLS_MAX,
  MATRIX_COLS_MIN,
  MATRIX_LETTERS_MAX,
  MATRIX_LETTERS_MIN,
  MATRIX_SPEED_MAX,
  MATRIX_SPEED_MIN,
  normalizeCardFx,
  serializeCardFx,
  type ProductCardFx,
} from '../../lib/productCardFx';

const PRODUCT_MEDIA_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm';
const PRODUCT_MEDIA_MAX_BYTES = 20 * 1024 * 1024;
const GALLERY_MAX = 8;
const SHOWCASE_VIDEO_ACCEPT = 'video/mp4,video/webm,image/gif';
const GALLERY_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

type SellerPick = Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>;
type SellerSort = 'name' | 'role';
type LoadState = 'loading' | 'ready' | 'not-found';

const ROLE_SORT_ORDER = ROLE_INFO.map((r) => r.id);

function sellerDisplayName(s: SellerPick): string {
  return s.full_name?.trim() || s.email || s.id.slice(0, 8);
}

function filterAndSortSellers(
  list: SellerPick[],
  query: string,
  roleFilter: string,
  sort: SellerSort,
): SellerPick[] {
  const q = query.trim().toLowerCase();
  let next = list.filter((s) => {
    if (roleFilter && s.role !== roleFilter) return false;
    if (!q) return true;
    const hay = `${s.full_name || ''} ${s.email || ''} ${s.role || ''}`.toLowerCase();
    return hay.includes(q);
  });
  next = [...next].sort((a, b) => {
    if (sort === 'role') {
      const ai = ROLE_SORT_ORDER.indexOf(a.role as Role);
      const bi = ROLE_SORT_ORDER.indexOf(b.role as Role);
      const aRank = ai === -1 ? 99 : ai;
      const bRank = bi === -1 ? 99 : bi;
      if (aRank !== bRank) return aRank - bRank;
    }
    return sellerDisplayName(a).localeCompare(sellerDisplayName(b), undefined, { sensitivity: 'base' });
  });
  return next;
}

type SecretField = { id: string; key: string; value: string };

interface ProductForm {
  name: string;
  name_ar: string;
  slug: string;
  description: string;
  description_ar: string;
  price: string;
  original_price: string;
  category_id: string;
  stock: string;
  status: 'active' | 'inactive' | 'draft';
  oos_message: 'out_of_stock' | 'not_available';
  delivery_preset: DeliveryPreset;
  delivery_custom_en: string;
  delivery_custom_ar: string;
  thumbnail_url: string;
  ad_banner_url: string;
  hover_image_url: string;
  hero_backdrop_url: string;
  video_url: string;
  /** Up to 3 embeds × ads/no-ads (+ defaults). video_url = resolved default. */
  video_embeds: VideoEmbeds;
  /** When false, PDP never loads showcase embeds (privacy default). */
  video_enabled: boolean;
  /** Showcase autoplay (default on). */
  video_autoplay: boolean;
  /** Showcase volume 0–100 (default 25). */
  video_volume: number;
  galleryUrls: string[];
  product_type: string;
  secretDetails: string;
  secretFields: SecretField[];
  requirementFields: SecretField[];
  seller_id: string;
  show_seller_name: boolean;
  /** Staff who “added” the product (delete lock). Owner may reassign. */
  created_by: string;
  /** Default stars until buyers review (1–5). */
  rating_seed: string;
  /** Optional atmosphere game icons; empty = site default. */
  atmosphere_logo_ids: string[];
  /** Card-body FX (matrix / logo / …). */
  card_fx: ProductCardFx;
}

let fieldSeq = 0;
function newField(key = '', value = ''): SecretField {
  fieldSeq += 1;
  return { id: `f-${fieldSeq}`, key, value };
}

function serializeFields(fields: SecretField[]): string {
  return fields
    .filter((f) => f.key.trim() || f.value.trim())
    .map((f) => `${f.key.trim() || 'Value'}: ${f.value}`)
    .join('\n');
}

function parseFields(valueLines: string): SecretField[] {
  const lines = valueLines.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  return lines.map((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return newField('', line);
    return newField(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
  });
}

const EMPTY_FORM: ProductForm = {
  name: '',
  name_ar: '',
  slug: '',
  description: '',
  description_ar: '',
  price: '',
  original_price: '',
  category_id: '',
  stock: '0',
  status: 'draft',
  oos_message: 'out_of_stock',
  delivery_preset: 'instant',
  delivery_custom_en: '',
  delivery_custom_ar: '',
  thumbnail_url: '',
  ad_banner_url: '',
  hover_image_url: '',
  hero_backdrop_url: '',
  video_url: '',
  video_embeds: emptyVideoEmbeds(),
  video_enabled: false,
  video_autoplay: DEFAULT_VIDEO_AUTOPLAY,
  video_volume: DEFAULT_VIDEO_VOLUME,
  galleryUrls: [],
  product_type: 'other',
  secretDetails: '',
  secretFields: [],
  requirementFields: [],
  seller_id: '',
  show_seller_name: true,
  created_by: '',
  rating_seed: '5',
  atmosphere_logo_ids: [],
  card_fx: { style: 'none' },
};

/** Snapshot for dirty check — strip ephemeral field ids. */
function editorSnapshot(
  form: ProductForm,
  pendingStock: PendingStock[] = [],
  keyOverrides: KeyOverride[] = [],
): string {
  return JSON.stringify({
    ...form,
    secretFields: form.secretFields.map((f) => ({ key: f.key, value: f.value })),
    requirementFields: form.requirementFields.map((f) => ({ key: f.key, value: f.value })),
    pendingStock: pendingStock.map((k) => ({
      content: k.content,
      secretDetails: k.secretDetails,
      secretFields: k.secretFields.map((f) => ({ key: f.key, value: f.value })),
    })),
    keyOverrides: keyOverrides.map((k) => ({
      id: k.id,
      content: k.content,
      secretDetails: k.secretDetails,
      secretFields: k.secretFields.map((f) => ({ key: f.key, value: f.value })),
    })),
  });
}

type KeyOverride = {
  id: string;
  content: string;
  secretDetails: string;
  secretFields: SecretField[];
};

/** Not-yet-saved stock units (one key = one sellable unit). */
type PendingStock = {
  tempId: string;
  content: string;
  secretDetails: string;
  secretFields: SecretField[];
};

type StockListItem =
  | { kind: 'pending'; row: PendingStock; globalIndex: number }
  | { kind: 'saved'; row: KeyOverride; globalIndex: number };

let pendingSeq = 0;
function newPendingStock(content: string, secretDetails = '', secretFields: SecretField[] = []): PendingStock {
  pendingSeq += 1;
  return {
    tempId: `pending-${pendingSeq}`,
    content: content.trim(),
    secretDetails,
    secretFields,
  };
}

function keyHasCustom(row: { secretDetails: string; secretFields: SecretField[] }) {
  return (
    row.secretDetails.trim().length > 0 ||
    row.secretFields.some((f) => f.key.trim() || f.value.trim())
  );
}

function patchTwoLineFields(existing: SecretField[], line1: string, line2: string): SecretField[] {
  if (existing.length >= 2) {
    return existing.map((f, i) =>
      i === 0 ? { ...f, value: line1 } : i === 1 ? { ...f, value: line2 } : f,
    );
  }
  if (existing.length === 1) {
    return [{ ...existing[0], value: line1 }, newField('', line2)];
  }
  return [newField('', line1), newField('', line2)];
}

type BulkDeliveryPasteTarget = 'delivery' | 'labels';

function bulkLabelTemplate(fieldsLists: SecretField[][]): SecretField[] {
  for (const fields of fieldsLists) {
    if (fields.length > 0) return fields;
  }
  return fieldsLists[0] ?? [];
}

function syncFieldsToTemplate(existing: SecretField[], templateKeys: string[]): SecretField[] {
  return templateKeys.map((key, i) => {
    const prev = existing[i];
    return prev ? { ...prev, key } : newField(key, '');
  });
}

function ensureFieldCount(fields: SecretField[], count: number): SecretField[] {
  let out = fields;
  while (out.length < count) out = [...out, newField('', '')];
  return out;
}

function renameLabelAtIndex(fields: SecretField[], index: number, key: string): SecretField[] {
  const base = ensureFieldCount(fields, index + 1);
  return base.map((f, i) => (i === index ? { ...f, key } : f));
}

function addLabelField(fields: SecretField[], key = ''): SecretField[] {
  return [...fields, newField(key, '')];
}

function removeLabelAtIndex(fields: SecretField[], index: number): SecretField[] {
  return fields.filter((_, i) => i !== index);
}

function bulkLabelsPatch(
  rawLines: string[],
  entryIndex: number,
  twoLinesPerUnit: boolean,
  existing: { secretDetails: string; secretFields: SecretField[] },
  templateKeys: string[],
): Pick<PendingStock, 'secretDetails' | 'secretFields'> {
  const base = syncFieldsToTemplate(existing.secretFields, templateKeys);
  if (twoLinesPerUnit) {
    return {
      secretDetails: existing.secretDetails,
      secretFields: patchTwoLineFields(
        base,
        rawLines[entryIndex * 2],
        rawLines[entryIndex * 2 + 1],
      ),
    };
  }
  if (base.length === 0) {
    return {
      secretDetails: existing.secretDetails,
      secretFields: [newField(templateKeys[0] ?? '', rawLines[entryIndex])],
    };
  }
  return {
    secretDetails: existing.secretDetails,
    secretFields: base.map((f, i) => (i === 0 ? { ...f, value: rawLines[entryIndex] } : f)),
  };
}

function maxDeliveryPasteLines(maxUnits: number, twoLinesPerUnit: boolean): number {
  return maxUnits * (twoLinesPerUnit ? 2 : 1);
}

function clampDeliveryPaste(
  paste: string,
  maxUnits: number,
  twoLinesPerUnit: boolean,
): { text: string; truncated: boolean } {
  const maxNonEmpty = maxDeliveryPasteLines(maxUnits, twoLinesPerUnit);
  if (maxNonEmpty <= 0) {
    return { text: '', truncated: paste.split('\n').some((l) => l.trim()) };
  }
  const lines = paste.split('\n');
  const out: string[] = [];
  let nonEmpty = 0;
  for (const line of lines) {
    if (line.trim()) {
      if (nonEmpty >= maxNonEmpty) return { text: out.join('\n'), truncated: true };
      nonEmpty++;
    }
    out.push(line);
  }
  return { text: out.join('\n'), truncated: false };
}

function bulkDeliveryPatch(
  rawLines: string[],
  entryIndex: number,
  twoLinesPerUnit: boolean,
  existing: { secretDetails: string; secretFields: SecretField[] },
): Pick<PendingStock, 'secretDetails' | 'secretFields'> {
  if (twoLinesPerUnit) {
    return {
      secretDetails: existing.secretDetails,
      secretFields: patchTwoLineFields(
        existing.secretFields,
        rawLines[entryIndex * 2],
        rawLines[entryIndex * 2 + 1],
      ),
    };
  }
  return { secretDetails: rawLines[entryIndex], secretFields: existing.secretFields };
}

function bulkDeliveryApplyPatch(
  rawLines: string[],
  entryIndex: number,
  twoLinesPerUnit: boolean,
  existing: { secretDetails: string; secretFields: SecretField[] },
  target: BulkDeliveryPasteTarget,
  templateKeys: string[],
): Pick<PendingStock, 'secretDetails' | 'secretFields'> {
  if (target === 'labels') {
    return bulkLabelsPatch(rawLines, entryIndex, twoLinesPerUnit, existing, templateKeys);
  }
  return bulkDeliveryPatch(rawLines, entryIndex, twoLinesPerUnit, existing);
}

function keyOverridesFromRows(
  rows: { id: string; content: string; details: string | null; claimed_at: string | null }[],
): { counts: { available: number; claimed: number }; overrides: KeyOverride[] } {
  const claimed = rows.filter((k) => k.claimed_at).length;
  const overrides = rows
    .filter((k) => !k.claimed_at)
    .map((k) => {
      const parsed = parseSecretContent(k.details);
      return {
        id: k.id,
        content: k.content,
        secretDetails: parsed.details,
        secretFields: parseFields(parsed.valueLines),
      };
    });
  return { counts: { available: rows.length - claimed, claimed }, overrides };
}

function buildFormFromProduct(
  product: Product,
  opts: { isSeller: boolean; userId?: string | null },
): ProductForm {
  return {
    name: product.name,
    name_ar: product.name_ar || '',
    slug: product.slug,
    description: product.description || '',
    description_ar: product.description_ar || '',
    price: String(product.price),
    original_price: product.original_price ? String(product.original_price) : '',
    category_id: product.category_id || '',
    stock: String(product.stock),
    status: product.status,
    oos_message: product.oos_message === 'not_available' ? 'not_available' : 'out_of_stock',
    delivery_preset: parseDeliveryPreset(product.delivery_preset),
    delivery_custom_en: product.delivery_custom_en || '',
    delivery_custom_ar: product.delivery_custom_ar || '',
    thumbnail_url: product.thumbnail_url || '',
    ad_banner_url: product.ad_banner_url || '',
    hover_image_url: product.hover_image_url || '',
    hero_backdrop_url: product.hero_backdrop_url || '',
    ...(() => {
      const video_embeds = normalizeVideoEmbeds(product.video_embeds, product.video_url);
      return {
        video_embeds,
        video_url: resolveDefaultVideoUrl(video_embeds) || product.video_url || '',
      };
    })(),
    video_enabled: product.video_enabled === true,
    video_autoplay: product.video_autoplay !== false,
    video_volume: clampVideoVolume(product.video_volume),
    galleryUrls: [],
    product_type: product.product_type || 'other',
    secretDetails: '',
    secretFields: [],
    requirementFields: parseRequirements(product.requirements).map((r) =>
      newField(r.label, r.value),
    ),
    seller_id: product.seller_id || (opts.isSeller && opts.userId ? opts.userId : ''),
    show_seller_name: opts.isSeller ? true : product.show_seller_name !== false,
    created_by: product.created_by ?? '',
    rating_seed: String(
      product.rating_seed ?? (product.review_count === 0 ? product.rating || 5 : 5),
    ),
    atmosphere_logo_ids: Array.isArray(product.atmosphere_logo_ids)
      ? product.atmosphere_logo_ids.filter((id) =>
          ATMOSPHERE_LOGO_IDS.includes(id as (typeof ATMOSPHERE_LOGO_IDS)[number]),
        )
      : [],
    card_fx: normalizeCardFx(product.card_fx),
  };
}

type EditorNavState = { product?: Product };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** Old edit bookmarks used UUID; prefer slug in the URL. */
function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type MediaPickTarget =
  | { kind: 'field'; field: 'thumbnail_url' | 'ad_banner_url' | 'hover_image_url' | 'hero_backdrop_url' }
  | { kind: 'video' }
  | { kind: 'videoEmbed'; slot: VideoEmbedSlotIndex; variant: VideoEmbedVariant }
  | { kind: 'gallery' };

type ResourceSort = 'all' | MediaResourceKind;

type MediaLibraryItem = { url: string; kind: MediaResourceKind };

function uniqueMediaItems(items: MediaLibraryItem[]): MediaLibraryItem[] {
  const seen = new Set<string>();
  const out: MediaLibraryItem[] = [];
  for (const item of items) {
    const url = item.url.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, kind: item.kind });
  }
  return out;
}

function urlsToItems(urls: string[]): MediaLibraryItem[] {
  return uniqueMediaItems(urls.map((url) => ({ url, kind: classifyMediaUrl(url) })));
}

function collectFormMediaUrls(form: ProductForm): string[] {
  return [
    form.thumbnail_url,
    form.ad_banner_url,
    form.hover_image_url,
    form.hero_backdrop_url,
    form.video_url,
    ...collectEmbedUrls(form.video_embeds),
    ...form.galleryUrls,
  ]
    .map((u) => u.trim())
    .filter(Boolean);
}

function syncVideoUrlFromEmbeds(embeds: VideoEmbeds): Pick<ProductForm, 'video_embeds' | 'video_url'> {
  const video_embeds = normalizeVideoEmbeds(embeds);
  return { video_embeds, video_url: resolveDefaultVideoUrl(video_embeds) || '' };
}

function collectCatalogMediaUrls(products: Pick<Product, 'thumbnail_url' | 'ad_banner_url' | 'hover_image_url' | 'hero_backdrop_url' | 'video_url'>[]): string[] {
  const urls: string[] = [];
  for (const p of products) {
    if (p.thumbnail_url) urls.push(p.thumbnail_url);
    if (p.ad_banner_url) urls.push(p.ad_banner_url);
    if (p.hover_image_url) urls.push(p.hover_image_url);
    if (p.hero_backdrop_url) urls.push(p.hero_backdrop_url);
    if (p.video_url) urls.push(p.video_url);
  }
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
}

async function fetchRecentCatalogMediaUrls(): Promise<string[]> {
  const { data } = await supabase
    .from('products')
    .select('thumbnail_url, ad_banner_url, hover_image_url, hero_backdrop_url, video_url')
    .order('created_at', { ascending: false })
    .limit(40);
  return collectCatalogMediaUrls(data ?? []);
}

function matchesResourceSort(item: MediaLibraryItem, sort: ResourceSort): boolean {
  if (sort === 'all') return true;
  return item.kind === sort;
}

function defaultResourceSort(target: MediaPickTarget): ResourceSort {
  if (target.kind === 'gallery') return 'image';
  if (target.kind === 'video' || target.kind === 'videoEmbed') return 'embed_video';
  return 'all';
}

export default function ProductEditorPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { settings } = useSiteSettings();
  const homeAdsSize = parseHomeAdsSize(settings.home_ads_size);
  const sellerDailyLimit = parseSellerDailyProductLimit(settings.seller_daily_product_limit);
  const saveSettings = useSaveSiteSettings();
  const plyrConfig = parsePlyrConfig(settings.plyr_json);
  const productAtmOn = parseProductDetailFx(
    settings.product_detail_fx_json,
    ATMOSPHERE_LOGO_IDS,
  ).pages.product;
  const customProductTypes = parseProductTypesJson(settings.product_types_json);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { productSlug } = useParams();
  const isCreate = location.pathname.endsWith('/new') || !productSlug;
  const profileRole = profile?.role;
  const profileId = profile?.id;
  const isSeller = profileRole === 'seller';
  const canAssignSeller = profileRole === 'owner' || profileRole === 'admin';
  const canManageTypes = profileRole === 'owner' || profileRole === 'admin';
  const isOwner = profileRole === 'owner';
  const isStaffAuthor = profileRole === 'owner' || profileRole === 'admin';

  const warmProduct = (() => {
    if (isCreate || !productSlug) return null;
    const p = (location.state as EditorNavState | null)?.product;
    if (!p) return null;
    return p.slug === productSlug || p.id === productSlug ? p : null;
  })();

  const canonicalizeEditUrl = (product: Product) => {
    if (!productSlug || !product.slug || product.slug === productSlug) return;
    navigate(`/dashboard/products/${product.slug}/edit`, {
      replace: true,
      state: location.state,
    });
  };

  const refreshStorefront = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<SellerPick[]>([]);
  const staffAuthors = sellers.filter((s) => s.role === 'owner' || s.role === 'admin');
  const [loadState, setLoadState] = useState<LoadState>(() =>
    isCreate || warmProduct ? 'ready' : 'loading',
  );
  const [sellerQuery, setSellerQuery] = useState('');
  const [sellerRoleFilter, setSellerRoleFilter] = useState('');
  const [sellerSort, setSellerSort] = useState<SellerSort>('name');

  const [editing, setEditing] = useState<Product | null>(() => warmProduct);
  const [form, setForm] = useState<ProductForm>(() =>
    warmProduct
      ? buildFormFromProduct(warmProduct, { isSeller, userId: user?.id })
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [clearKeysOpen, setClearKeysOpen] = useState(false);
  const [clearKeysBusy, setClearKeysBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  /** Draft strings for embed inputs before Apply — key `${slot}-${variant}`. */
  const [embedDrafts, setEmbedDrafts] = useState<Record<string, string>>({});
  const [keyCounts, setKeyCounts] = useState<{ available: number; claimed: number }>({ available: 0, claimed: 0 });
  const [pendingStock, setPendingStock] = useState<PendingStock[]>([]);
  const [stockPaste, setStockPaste] = useState('');
  const [stockDraft, setStockDraft] = useState('');
  const [deliveryPaste, setDeliveryPaste] = useState('');
  const [deliveryTwoLinesPerUnit, setDeliveryTwoLinesPerUnit] = useState(false);
  const [deliveryPasteTarget, setDeliveryPasteTarget] = useState<BulkDeliveryPasteTarget>('delivery');
  const [deliveryPasteWarn, setDeliveryPasteWarn] = useState('');
  const [keyOverrides, setKeyOverrides] = useState<KeyOverride[]>([]);
  const [fulfillTab, setFulfillTab] = useState<'stock' | 'default'>('stock');
  const [stockListAll, setStockListAll] = useState(false);
  const [stockPerPage, setStockPerPage] = useState(10);
  const [stockPage, setStockPage] = useState(0);
  const [copyLang, setCopyLang] = useState<'en' | 'ar' | 'both'>('both');
  const [mediaPickTarget, setMediaPickTarget] = useState<MediaPickTarget | null>(null);
  /** When on: focusing a blank embed URL field opens the resources picker. */
  const [resourcesPickEnabled, setResourcesPickEnabled] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryItem[]>([]);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [resourceSort, setResourceSort] = useState<ResourceSort>('all');
  const [addingType, setAddingType] = useState(false);
  const [newTypeEn, setNewTypeEn] = useState('');
  const [newTypeAr, setNewTypeAr] = useState('');
  const [topOut, setTopOut] = useState(false);
  const [baseline, setBaseline] = useState(() =>
    warmProduct
      ? editorSnapshot(buildFormFromProduct(warmProduct, { isSeller, userId: user?.id }), [], [])
      : '',
  );
  const topSentinelRef = useRef<HTMLDivElement>(null);

  const goBack = () => navigate('/dashboard/products');

  const addCustomProductType = async () => {
    if (!canManageTypes || !user?.id) return;
    const labelEn = newTypeEn.trim();
    const labelAr = newTypeAr.trim() || labelEn;
    if (!labelEn) {
      setFormError(t('اسم النوع بالإنجليزية مطلوب', 'English type name is required'));
      return;
    }
    const id = slugifyProductType(labelEn);
    if (allProductTypes(customProductTypes).some((t) => t.id === id)) {
      setFormError(t('هذا النوع موجود مسبقاً', 'That type already exists'));
      return;
    }
    const next: ProductTypeDef[] = [...customProductTypes, { id, labelEn, labelAr }];
    try {
      await saveSettings.mutateAsync({
        updates: { product_types_json: serializeProductTypesJson(next) },
        userId: user.id,
      });
      setField('product_type', id);
      setNewTypeEn('');
      setNewTypeAr('');
      setAddingType(false);
      setFormError('');
    } catch {
      setFormError(
        t(
          'تعذّر حفظ النوع — صلاحية المالك/المشرف فقط، وشغّل ترحيل product_type.',
          'Could not save type — owner/admin only; run the product_type migration.',
        ),
      );
    }
  };

  const resetSellerPicker = () => {
    setSellerQuery('');
    setSellerRoleFilter('');
    setSellerSort('name');
  };

  const seedCreateForm = () => {
    setEditing(null);
    const next: ProductForm = {
      ...EMPTY_FORM,
      secretDetails: '',
      secretFields: [],
      seller_id: isSeller && user?.id ? user.id : '',
      show_seller_name: true,
      created_by: user?.id || '',
    };
    setForm(next);
    setEmbedDrafts({});
    setKeyCounts({ available: 0, claimed: 0 });
    setPendingStock([]); setStockPaste(''); setStockDraft('');
    setDeliveryPaste(''); setDeliveryTwoLinesPerUnit(false); setDeliveryPasteWarn('');
    setKeyOverrides([]);
    resetSellerPicker();
    setFormError('');
    setMediaPickTarget(null);
    setMediaLibrary([]);
    setBaseline(editorSnapshot(next, [], []));
    setTopOut(false);
    setLoadState('ready');
  };

  const fetchProductExtras = async (id: string) => {
    const [{ data: secret }, { data: gallery }, { data: keyRows }] = await Promise.all([
      supabase.from('product_secrets').select('content').eq('product_id', id).maybeSingle(),
      supabase
        .from('product_images')
        .select('url, sort_order')
        .eq('product_id', id)
        .order('sort_order', { ascending: true }),
      supabase.from('product_keys').select('id, content, details, claimed_at').eq('product_id', id),
    ]);
    return { secret, gallery, keyRows };
  };

  const applyExtrasToForm = (
    base: ProductForm,
    extras: Awaited<ReturnType<typeof fetchProductExtras>>,
  ): { form: ProductForm; keyOverrides: KeyOverride[] } => {
    let next = base;
    let overrides: KeyOverride[] = [];
    if (extras.secret?.content) {
      const parsed = parseSecretContent(extras.secret.content);
      next = {
        ...next,
        secretDetails: parsed.details,
        secretFields: parseFields(parsed.valueLines),
      };
    }
    if (extras.gallery?.length) {
      next = {
        ...next,
        galleryUrls: extras.gallery.map((g) => g.url).slice(0, GALLERY_MAX),
      };
    }
    if (extras.keyRows) {
      const mapped = keyOverridesFromRows(
        extras.keyRows as {
          id: string;
          content: string;
          details: string | null;
          claimed_at: string | null;
        }[],
      );
      setKeyCounts(mapped.counts);
      overrides = mapped.overrides;
      setKeyOverrides(overrides);
    } else {
      setKeyOverrides([]);
    }
    return { form: next, keyOverrides: overrides };
  };

  const loadProductForEdit = async (product: Product) => {
    setEditing(product);
    let next = buildFormFromProduct(product, { isSeller, userId: user?.id });
    setEmbedDrafts({});
    setKeyCounts({ available: 0, claimed: 0 });
    setPendingStock([]); setStockPaste(''); setStockDraft('');
    setDeliveryPaste(''); setDeliveryTwoLinesPerUnit(false); setDeliveryPasteWarn('');
    setKeyOverrides([]);
    setFormError('');
    resetSellerPicker();
    setMediaPickTarget(null);
    setMediaLibrary([]);
    const extras = await fetchProductExtras(product.id);
    const applied = applyExtrasToForm(next, extras);
    next = applied.form;
    setForm(next);
    setBaseline(editorSnapshot(next, [], applied.keyOverrides));
    setTopOut(false);
    setLoadState('ready');
  };

  useEffect(() => {
    let cancelled = false;

    const loadMeta = () =>
      Promise.all([
        supabase.from('categories').select(CATEGORY_COLS).order('sort_order', { ascending: true }),
        canAssignSeller
          ? supabase
              .from('profiles')
              .select('id, full_name, email, role')
              .eq('is_active', true)
              .order('full_name', { ascending: true })
          : Promise.resolve({ data: [] as SellerPick[] }),
      ]);

    const init = async () => {
      if (isCreate) {
        if (isSeller && profileId && sellerDailyLimit > 0) {
          const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', profileId)
            .gte('created_at', utcDayStartIso());
          if (cancelled) return;
          if ((count ?? 0) >= sellerDailyLimit) {
            setFormError(
              t(
                `وصلت للحد اليومي (${sellerDailyLimit} عروض/يوم).`,
                `Daily limit reached (${sellerDailyLimit} listings/day).`,
              ),
            );
            navigate('/dashboard/products', { replace: true });
            return;
          }
        }
        const [{ data: cats }, sellersRes] = await loadMeta();
        if (cancelled) return;
        setCategories((cats as unknown as Category[]) || []);
        setSellers(sellersRes.data || []);
        seedCreateForm();
        return;
      }

      // List → Edit: product already in location.state — paint now, extras in background.
      if (warmProduct) {
        canonicalizeEditUrl(warmProduct);
        setEditing(warmProduct);
        const shell = buildFormFromProduct(warmProduct, { isSeller, userId: user?.id });
        setForm(shell);
        setKeyOverrides([]);
        setBaseline(editorSnapshot(shell, [], []));
        setLoadState('ready');
        setTopOut(false);
        const [[{ data: cats }, sellersRes], extras] = await Promise.all([
          loadMeta(),
          fetchProductExtras(warmProduct.id),
        ]);
        if (cancelled) return;
        setCategories((cats as unknown as Category[]) || []);
        setSellers(sellersRes.data || []);
        setForm((prev) => {
          const wasClean = editorSnapshot(prev, [], []) === editorSnapshot(shell, [], []);
          const applied = applyExtrasToForm(wasClean ? shell : prev, extras);
          if (wasClean) {
            queueMicrotask(() => {
              if (!cancelled) setBaseline(editorSnapshot(applied.form, [], applied.keyOverrides));
            });
          }
          return applied.form;
        });
        return;
      }

      setLoadState('loading');
      const key = productSlug!;
      let query = supabase
        .from('products')
        .select(PRODUCT_EDITOR_COLS)
        .eq(looksLikeUuid(key) ? 'id' : 'slug', key);
      if (profileRole === 'seller' && profileId) {
        query = query.eq('seller_id', profileId);
      }
      const [[{ data: cats }, sellersRes], { data: product }] = await Promise.all([
        loadMeta(),
        query.maybeSingle(),
      ]);
      if (cancelled) return;
      setCategories((cats as unknown as Category[]) || []);
      setSellers(sellersRes.data || []);
      if (!product) {
        setLoadState('not-found');
        return;
      }
      const row = product as unknown as Product;
      canonicalizeEditUrl(row);
      await loadProductForEdit(row);
    };

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init when route slug/mode changes
  }, [productSlug, isCreate, profileRole, profileId, canAssignSeller]);

  // Detect when top actions leave the visible scrollport (main and/or window).
  useEffect(() => {
    if (loadState !== 'ready') return;
    const check = () => {
      const el = topSentinelRef.current;
      if (!el) return;
      const main = document.querySelector<HTMLElement>('main.flex-1.overflow-auto');
      const rect = el.getBoundingClientRect();
      const clipTop = main ? main.getBoundingClientRect().top : 0;
      setTopOut(rect.bottom < clipTop + 8);
    };
    check();
    window.addEventListener('scroll', check, { capture: true, passive: true });
    const main = document.querySelector<HTMLElement>('main.flex-1.overflow-auto');
    main?.addEventListener('scroll', check, { passive: true });
    return () => {
      window.removeEventListener('scroll', check, true);
      main?.removeEventListener('scroll', check);
    };
  }, [loadState]);

  const pickSeller = (id: string) => {
    setForm((prev) => ({
      ...prev,
      seller_id: id,
      show_seller_name: id ? true : false,
    }));
  };

  const setField = (key: keyof ProductForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value } as ProductForm;
      if (key === 'name' && isCreate && (prev.slug === slugify(prev.name) || !prev.slug)) {
        next.slug = slugify(value);
      }
      if (key === 'product_type') {
        // Fulfillment fields are optional — do not auto-seed labels by type.
      }
      return next;
    });
  };

  const setSecretField = (id: string, patch: Partial<Pick<SecretField, 'key' | 'value'>>) => {
    setForm((prev) => ({
      ...prev,
      secretFields: prev.secretFields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const addSecretField = () => {
    setForm((prev) => ({ ...prev, secretFields: [...prev.secretFields, newField('', '')] }));
  };

  const removeSecretField = (id: string) => {
    setForm((prev) => ({
      ...prev,
      secretFields: prev.secretFields.filter((f) => f.id !== id),
    }));
  };

  const setRequirementField = (id: string, patch: Partial<Pick<SecretField, 'key' | 'value'>>) => {
    setForm((prev) => ({
      ...prev,
      requirementFields: prev.requirementFields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const addRequirementField = () => {
    setForm((prev) => ({
      ...prev,
      requirementFields: [...prev.requirementFields, newField('', '')],
    }));
  };

  const removeRequirementField = (id: string) => {
    setForm((prev) => ({
      ...prev,
      requirementFields: prev.requirementFields.filter((f) => f.id !== id),
    }));
  };

  const uploadToBucket = async (file: File, tag: string): Promise<string | null> => {
    setFormError('');
    const okType =
      file.type.startsWith('image/') ||
      file.type === 'video/mp4' ||
      file.type === 'video/webm';
    if (!okType) {
      setFormError(t('صيغة غير مدعومة — صورة أو GIF أو MP4', 'Unsupported type — image, GIF, or MP4'));
      return null;
    }
    if (file.size > PRODUCT_MEDIA_MAX_BYTES) {
      setFormError(t('الحد الأقصى للملف 20 ميغابايت', 'Max file size is 20MB'));
      return null;
    }
    setUploading(true);
    try {
      const ext =
        file.name.split('.').pop()?.toLowerCase() ||
        (file.type.startsWith('video/') ? 'mp4' : file.type === 'image/gif' ? 'gif' : 'png');
      const path = `${user?.id}/${Date.now()}-${tag}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setUploading(false);
      return data.publicUrl;
    } catch {
      setFormError(
        t(
          'فشل رفع الملف. شغّل ترحيل product-images (GIF/MP4).',
          'Media upload failed. Run the product-images migration (GIF/MP4).'
        )
      );
      setUploading(false);
      return null;
    }
  };

  const uploadProductImage = async (
    field: 'thumbnail_url' | 'ad_banner_url' | 'hover_image_url' | 'hero_backdrop_url',
    file: File
  ) => {
    const url = await uploadToBucket(file, field);
    if (url) {
      setForm((prev) => ({ ...prev, [field]: url }));
      void upsertMediaResource(url);
    }
  };

  const uploadShowcaseVideo = async (file: File) => {
    const url = await uploadToBucket(file, 'showcase');
    if (url) {
      const slot =
        mediaPickTarget?.kind === 'videoEmbed' ? mediaPickTarget.slot : (0 as VideoEmbedSlotIndex);
      const variant =
        mediaPickTarget?.kind === 'videoEmbed'
          ? mediaPickTarget.variant
          : ('withAds' as VideoEmbedVariant);
      setForm((prev) => ({
        ...prev,
        ...syncVideoUrlFromEmbeds(setEmbedSlotUrl(prev.video_embeds, slot, variant, url)),
      }));
      void upsertMediaResource(url);
    }
  };

  const applyEmbedDraft = (slot: VideoEmbedSlotIndex, variant: VideoEmbedVariant) => {
    const key = `${slot}-${variant}`;
    const raw = (embedDrafts[key] ?? form.video_embeds.slots[slot][variant] ?? '').trim();
    if (!raw) {
      setForm((prev) => ({
        ...prev,
        ...syncVideoUrlFromEmbeds(setEmbedSlotUrl(prev.video_embeds, slot, variant, null)),
      }));
      setEmbedDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      return;
    }
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad');
      const href = u.toString();
      setForm((prev) => ({
        ...prev,
        ...syncVideoUrlFromEmbeds(setEmbedSlotUrl(prev.video_embeds, slot, variant, href)),
      }));
      setEmbedDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      setFormError('');
      void upsertMediaResource(href);
    } catch {
      setFormError(t('الصق رابط https صالحاً', 'Paste a valid https link'));
    }
  };

  const clearAllEmbeds = () => {
    setForm((prev) => ({
      ...prev,
      ...syncVideoUrlFromEmbeds(emptyVideoEmbeds()),
    }));
    setEmbedDrafts({});
  };

  const uploadGalleryFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = GALLERY_MAX - form.galleryUrls.length;
    if (room <= 0) {
      setFormError(t(`الحد الأقصى ${GALLERY_MAX} صور`, `Maximum ${GALLERY_MAX} gallery images`));
      return;
    }
    const list = Array.from(files).slice(0, room);
    for (const file of list) {
      if (!file.type.startsWith('image/')) {
        setFormError(t('المعرض للصور فقط', 'Gallery accepts images only'));
        continue;
      }
      const url = await uploadToBucket(file, 'gallery');
      if (url) {
        setForm((prev) => ({
          ...prev,
          galleryUrls: [...prev.galleryUrls, url].slice(0, GALLERY_MAX),
        }));
        void upsertMediaResource(url);
      }
    }
  };

  const openMediaLibrary = async (target: MediaPickTarget) => {
    setMediaPickTarget(target);
    setResourceSort(defaultResourceSort(target));
    setMediaLibraryLoading(true);
    setFormError('');
    const fromResources = await listMediaResources();
    const fromForm = urlsToItems(collectFormMediaUrls(form));
    const fromCatalog = urlsToItems(await fetchRecentCatalogMediaUrls());
    let fromStorage: MediaLibraryItem[] = [];
    if (user?.id) {
      const { data } = await supabase.storage
        .from('product-images')
        .list(user.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      fromStorage = urlsToItems(
        (data ?? [])
        .filter((f) => f.name && !f.name.endsWith('/') && f.id)
          .map(
            (f) =>
              supabase.storage.from('product-images').getPublicUrl(`${user.id}/${f.name}`).data
                .publicUrl,
          ),
      );
    }
    // Resources first (typed kinds), then form/catalog/storage fill gaps.
    setMediaLibrary(
      uniqueMediaItems([
        ...fromResources.map((r) => ({ url: r.url, kind: r.kind })),
        ...fromForm,
        ...fromCatalog,
        ...fromStorage,
      ]),
    );
    setMediaLibraryLoading(false);
  };

  const applyMediaPick = (url: string) => {
    if (!mediaPickTarget) return;
    void upsertMediaResource(url);
    if (mediaPickTarget.kind === 'field') {
      setForm((prev) => ({ ...prev, [mediaPickTarget.field]: url }));
      setMediaPickTarget(null);
      return;
    }
    if (mediaPickTarget.kind === 'video' || mediaPickTarget.kind === 'videoEmbed') {
      const slot =
        mediaPickTarget.kind === 'videoEmbed' ? mediaPickTarget.slot : (0 as VideoEmbedSlotIndex);
      const variant =
        mediaPickTarget.kind === 'videoEmbed'
          ? mediaPickTarget.variant
          : ('withAds' as VideoEmbedVariant);
      setForm((prev) => ({
        ...prev,
        ...syncVideoUrlFromEmbeds(setEmbedSlotUrl(prev.video_embeds, slot, variant, url)),
      }));
      setEmbedDrafts((d) => {
        const next = { ...d };
        delete next[`${slot}-${variant}`];
        return next;
      });
      setMediaPickTarget(null);
      return;
    }
    setForm((prev) => {
      if (prev.galleryUrls.includes(url) || prev.galleryUrls.length >= GALLERY_MAX) return prev;
      return { ...prev, galleryUrls: [...prev.galleryUrls, url] };
    });
  };

  const moveGallery = (index: number, dir: -1 | 1) => {
    setForm((prev) => {
      const next = [...prev.galleryUrls];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return { ...prev, galleryUrls: next };
    });
  };

  const save = async () => {
    setFormError('');
    if (!form.name.trim() || !form.slug.trim() || !form.price.trim()) {
      setFormError(t('الاسم والمعرّف والسعر مطلوبة', 'Name, slug, and price are required'));
      return;
    }
    const price = Number(form.price);
    if (Number.isNaN(price) || price < 0) {
      setFormError(t('السعر غير صالح', 'Invalid price'));
      return;
    }
    const pendingLines = pendingStock.filter((p) => p.content.trim());
    const hasKeys = keyCounts.available + keyCounts.claimed + pendingLines.length > 0;
    // Keyed products: stock is derived from unclaimed keys (DB trigger),
    // so the manual field is ignored to avoid overwriting the real count.
    const stock = hasKeys ? keyCounts.available + pendingLines.length : Number(form.stock) || 0;

    setSaving(true);
    const sellerId = isSeller ? (user?.id ?? null) : form.seller_id || null;
    const showSeller = isSeller ? true : form.show_seller_name && Boolean(sellerId);
    const ratingSeed = clampSeed(Number(form.rating_seed));
    const noReviews = !editing || (editing.review_count ?? 0) === 0;
    const mayEditAuthor =
      !editing
        ? Boolean(user?.id) && isStaffAuthor
        : canEditProductAuthor({
            userId: user?.id,
            role: profileRole,
            createdBy: editing.created_by,
            addedBy: editing.added_by,
          });
    const payload = {
      name: form.name.trim(),
      name_ar: form.name_ar.trim() || null,
      slug: slugify(form.slug),
      description: form.description.trim() || null,
      description_ar: form.description_ar.trim() || null,
      price,
      original_price: form.original_price ? Number(form.original_price) : null,
      category_id: form.category_id || null,
      stock,
      status: form.status,
      oos_message: form.oos_message,
      delivery_preset:
        form.delivery_preset === 'custom' &&
        !form.delivery_custom_en.trim() &&
        !form.delivery_custom_ar.trim()
          ? 'instant'
          : form.delivery_preset,
      delivery_custom_en:
        form.delivery_preset === 'custom' ? form.delivery_custom_en.trim() || null : null,
      delivery_custom_ar:
        form.delivery_preset === 'custom' ? form.delivery_custom_ar.trim() || null : null,
      thumbnail_url: form.thumbnail_url || null,
      ad_banner_url: form.ad_banner_url || null,
      hover_image_url: form.hover_image_url || null,
      hero_backdrop_url: form.hero_backdrop_url || null,
      video_embeds: normalizeVideoEmbeds(form.video_embeds),
      video_url: resolveDefaultVideoUrl(form.video_embeds) || null,
      video_enabled: form.video_enabled,
      video_autoplay: form.video_autoplay,
      video_volume: clampVideoVolume(form.video_volume),
      product_type: form.product_type,
      requirements: serializeRequirements(
        form.requirementFields.map((f) => ({ label: f.key, value: f.value })),
      ),
      seller_id: sellerId,
      show_seller_name: showSeller,
      rating_seed: ratingSeed,
      ...(noReviews ? { rating: ratingSeed } : {}),
      atmosphere_logo_ids:
        form.atmosphere_logo_ids.length > 0 ? form.atmosphere_logo_ids : null,
      card_fx: serializeCardFx(form.card_fx),
      updated_at: new Date().toISOString(),
      ...(mayEditAuthor ? { created_by: form.created_by.trim() || null } : {}),
    };

    try {
      let savedId: string;
      if (editing) {
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();
        if (error) throw error;
        savedId = editing.id;
        if (data) {
          setEditing((prev) =>
            prev
              ? {
                  ...prev,
                  created_by: (data as Product).created_by ?? prev.created_by,
                  added_by: (data as Product).added_by ?? prev.added_by,
                }
              : prev,
          );
        }
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({
            ...payload,
            ...(mayEditAuthor
              ? { created_by: form.created_by.trim() || null }
              : { created_by: user?.id }),
          })
          .select()
          .single();
        if (error) throw error;
        savedId = data.id;
      }

      // One-time keys: append pending stock units. Trigger re-syncs products.stock.
      if (pendingLines.length > 0) {
        const { error: keyErr } = await supabase.from('product_keys').insert(
          pendingLines.map((p) => {
            const details = serializeSecretContent(p.secretDetails, serializeFields(p.secretFields));
            return {
              product_id: savedId,
              content: p.content.trim(),
              details: details || null,
            };
          }),
        );
        if (keyErr) throw keyErr;
        setPendingStock([]);
        setStockPaste('');
        setStockDraft('');
        setKeyCounts((prev) => ({ ...prev, available: prev.available + pendingLines.length }));
      }

      // Per-key detail overrides (empty = inherit product_secrets).
      for (const row of keyOverrides) {
        const text = serializeSecretContent(row.secretDetails, serializeFields(row.secretFields));
        const { error: detErr } = await supabase
          .from('product_keys')
          .update({ details: text || null })
          .eq('id', row.id)
          .eq('product_id', savedId);
        if (detErr) throw detErr;
      }

      // Private fulfillment info lives in product_secrets (never public).
      const secretText = serializeSecretContent(form.secretDetails, serializeFields(form.secretFields));
      if (secretText) {
        const { error: secErr } = await supabase
          .from('product_secrets')
          .upsert({ product_id: savedId, content: secretText, updated_at: new Date().toISOString() });
        if (secErr) throw secErr;
      } else {
        await supabase.from('product_secrets').delete().eq('product_id', savedId);
      }

      // Gallery: replace-all
      const { error: delGal } = await supabase.from('product_images').delete().eq('product_id', savedId);
      if (delGal) throw delGal;
      if (form.galleryUrls.length > 0) {
        const rows = form.galleryUrls.map((url, i) => ({
          product_id: savedId,
          url,
          sort_order: i,
        }));
        const { error: insGal } = await supabase.from('product_images').insert(rows);
        if (insGal) throw insGal;
      }

      // Reset dirty baseline before leave so navigate stays silent after save.
      const nextPending = pendingLines.length > 0 ? [] : pendingStock;
      setBaseline(editorSnapshot(form, nextPending, keyOverrides));
      refreshStorefront();
      navigate('/dashboard/products');
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e
        ? String((e as { message: string }).message)
        : '';
      setFormError(
        msg.includes('seller_daily_product_limit')
          ? t(
              'وصلت للحد اليومي لإضافة العروض. جرّب غداً.',
              'Daily listing create limit reached. Try again tomorrow.',
            )
          : msg.includes('duplicate') || msg.includes('unique')
          ? t('المعرّف مستخدم مسبقاً، غيّره', 'This slug is already used — change it')
          : msg.includes('card_fx')
            ? t(
                'شغّل ترحيل products card_fx ثم أعد الحفظ.',
                'Run the products card_fx migration, then save again.',
              )
          : msg || t('فشل الحفظ. تحقق من الصلاحيات.', 'Save failed. Check your permissions.')
      );
    }
    setSaving(false);
  };

  const clearUnclaimedKeys = () => {
    if (!editing) return;
    setClearKeysOpen(true);
  };

  const confirmClearUnclaimedKeys = async () => {
    if (!editing || clearKeysBusy) return;
    setClearKeysBusy(true);
    const { error } = await supabase
      .from('product_keys')
      .delete()
      .eq('product_id', editing.id)
      .is('claimed_at', null);
    if (error) {
      setFormError(t('فشل حذف المفاتيح.', 'Could not delete keys.'));
    } else {
      setKeyCounts((prev) => ({ ...prev, available: 0 }));
      setKeyOverrides([]);
      refreshStorefront();
    }
    setClearKeysBusy(false);
    setClearKeysOpen(false);
  };

  const removeStockUnit = async (id: string) => {
    if (!editing) return;
    const { error } = await supabase
      .from('product_keys')
      .delete()
      .eq('id', id)
      .eq('product_id', editing.id)
      .is('claimed_at', null);
    if (error) {
      setFormError(t('فشل حذف الوحدة.', 'Could not delete stock unit.'));
      return;
    }
    setKeyOverrides((prev) => prev.filter((k) => k.id !== id));
    setKeyCounts((prev) => ({ ...prev, available: Math.max(0, prev.available - 1) }));
    refreshStorefront();
  };

  const queuePasteAsStock = () => {
    const lines = stockPaste
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    setPendingStock((prev) => [...prev, ...lines.map((c) => newPendingStock(c))]);
    setStockPaste('');
    setFulfillTab('stock');
  };

  const applyBulkDelivery = () => {
    const pendingLen = pendingStock.length;
    const unitCount = pendingLen + keyOverrides.length;
    if (unitCount === 0) return;
    const rawLines = deliveryPaste
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLines.length === 0) return;

    const two = deliveryTwoLinesPerUnit;
    const target = deliveryPasteTarget;
    const templateKeys = bulkLabelTemplate([
      ...pendingStock.map((u) => u.secretFields),
      ...keyOverrides.map((u) => u.secretFields),
    ]).map((f) => f.key);
    const entryCount = two ? Math.floor(rawLines.length / 2) : rawLines.length;
    const orphanLine = two && rawLines.length % 2 === 1;
    const extraEntries = Math.max(0, entryCount - unitCount);
    if (orphanLine || extraEntries > 0) {
      const parts: string[] = [];
      if (orphanLine) {
        parts.push(t('سطر فردي بدون زوج — يُتجاهل.', 'Odd line without a pair — ignored.'));
      }
      if (extraEntries > 0) {
        parts.push(
          t(
            `${extraEntries} وحدة لصق زائدة — تُطبَّق على ${unitCount} وحدة فقط.`,
            `${extraEntries} extra paste unit(s) — applied to ${unitCount} unit(s) only.`,
          ),
        );
      }
      setDeliveryPasteWarn(parts.join(' '));
    } else {
      setDeliveryPasteWarn('');
    }

    const applyCount = Math.min(entryCount, unitCount);
    // Patch outside updater indexes — mutating a shared counter inside setState is unsafe (Strict Mode).
    setPendingStock((prev) =>
      prev.map((unit, i) =>
        i < applyCount
          ? { ...unit, ...bulkDeliveryApplyPatch(rawLines, i, two, unit, target, templateKeys) }
          : unit,
      ),
    );
    setKeyOverrides((prev) =>
      prev.map((unit, i) => {
        const idx = pendingLen + i;
        return idx < applyCount
          ? { ...unit, ...bulkDeliveryApplyPatch(rawLines, idx, two, unit, target, templateKeys) }
          : unit;
      }),
    );

    setDeliveryPaste('');
    setFulfillTab('stock');
  };

  const setDeliveryPasteClamped = (nextPaste: string, two: boolean = deliveryTwoLinesPerUnit) => {
    const units = pendingStock.length + keyOverrides.length;
    const { text, truncated } = clampDeliveryPaste(nextPaste, units, two);
    setDeliveryPaste(text);
    if (truncated) {
      const maxLines = maxDeliveryPasteLines(units, two);
      const keptUnits = two ? Math.floor(maxLines / 2) : maxLines;
      setDeliveryPasteWarn(
        t(
          `قُصِّ إلى ${keptUnits} وحدة (${maxLines} سطر).`,
          `Trimmed to ${keptUnits} unit(s) (${maxLines} line(s)).`,
        ),
      );
    } else {
      setDeliveryPasteWarn('');
    }
  };

  const bulkLabelFields = bulkLabelTemplate([
    ...pendingStock.map((u) => u.secretFields),
    ...keyOverrides.map((u) => u.secretFields),
  ]);

  const renameBulkLabel = (index: number, key: string) => {
    setPendingStock((prev) =>
      prev.map((u) => ({ ...u, secretFields: renameLabelAtIndex(u.secretFields, index, key) })),
    );
    setKeyOverrides((prev) =>
      prev.map((u) => ({ ...u, secretFields: renameLabelAtIndex(u.secretFields, index, key) })),
    );
  };

  const addBulkLabel = () => {
    setPendingStock((prev) =>
      prev.map((u) => ({ ...u, secretFields: addLabelField(u.secretFields) })),
    );
    setKeyOverrides((prev) =>
      prev.map((u) => ({ ...u, secretFields: addLabelField(u.secretFields) })),
    );
  };

  const removeBulkLabel = (index: number) => {
    setPendingStock((prev) =>
      prev.map((u) => ({ ...u, secretFields: removeLabelAtIndex(u.secretFields, index) })),
    );
    setKeyOverrides((prev) =>
      prev.map((u) => ({ ...u, secretFields: removeLabelAtIndex(u.secretFields, index) })),
    );
  };

  const queueDraftStock = () => {
    const c = stockDraft.trim();
    if (!c) return;
    setPendingStock((prev) => [...prev, newPendingStock(c)]);
    setStockDraft('');
    setFulfillTab('stock');
  };

  const setPendingDetails = (tempId: string, secretDetails: string) => {
    setPendingStock((prev) =>
      prev.map((k) => (k.tempId === tempId ? { ...k, secretDetails } : k)),
    );
  };

  const setPendingField = (
    tempId: string,
    fieldId: string,
    patch: Partial<Pick<SecretField, 'key' | 'value'>>,
  ) => {
    setPendingStock((prev) =>
      prev.map((k) =>
        k.tempId === tempId
          ? {
              ...k,
              secretFields: k.secretFields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
            }
          : k,
      ),
    );
  };

  const addPendingField = (tempId: string) => {
    setPendingStock((prev) =>
      prev.map((k) =>
        k.tempId === tempId ? { ...k, secretFields: [...k.secretFields, newField('', '')] } : k,
      ),
    );
  };

  const removePendingField = (tempId: string, fieldId: string) => {
    setPendingStock((prev) =>
      prev.map((k) =>
        k.tempId === tempId
          ? { ...k, secretFields: k.secretFields.filter((f) => f.id !== fieldId) }
          : k,
      ),
    );
  };

  const removePendingStock = (tempId: string) => {
    setPendingStock((prev) => prev.filter((k) => k.tempId !== tempId));
  };

  const setKeyOverrideDetails = (id: string, secretDetails: string) => {
    setKeyOverrides((prev) =>
      prev.map((k) => (k.id === id ? { ...k, secretDetails } : k)),
    );
  };

  const setKeyOverrideField = (
    keyId: string,
    fieldId: string,
    patch: Partial<Pick<SecretField, 'key' | 'value'>>,
  ) => {
    setKeyOverrides((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? {
              ...k,
              secretFields: k.secretFields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
            }
          : k,
      ),
    );
  };

  const addKeyOverrideField = (keyId: string) => {
    setKeyOverrides((prev) =>
      prev.map((k) =>
        k.id === keyId ? { ...k, secretFields: [...k.secretFields, newField('', '')] } : k,
      ),
    );
  };

  const removeKeyOverrideField = (keyId: string, fieldId: string) => {
    setKeyOverrides((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? { ...k, secretFields: k.secretFields.filter((f) => f.id !== fieldId) }
          : k,
      ),
    );
  };

  const field = (labelAr: string, labelEn: string, node: ReactNode, hint?: [string, string]) => (
    <label className="pe-field">
      <span className="pe-field__label">{t(labelAr, labelEn)}</span>
      {node}
      {hint ? <span className="pe-field__hint text-pretty">{t(hint[0], hint[1])}</span> : null}
    </label>
  );

  const primarySection = (
    titleAr: string,
    titleEn: string,
    children: ReactNode,
    opts?: {
      id?: string;
      icon?: ReactNode;
      hintAr?: string;
      hintEn?: string;
      accent?: 'default' | 'commerce' | 'fulfill' | 'basics' | 'copy';
      i?: number;
      /** Native <details> — click header to collapse/expand. */
      collapsible?: boolean;
      /** Right-side summary when collapsed (stock count, etc.). */
      summary?: string;
      /** Start open (default true when collapsible). */
      defaultOpen?: boolean;
    },
  ) => {
    const accent = opts?.accent ? ` pe-panel--${opts.accent}` : '';
    const style = opts?.i != null ? ({ ['--i']: opts.i } as CSSProperties) : undefined;
    const title = (
      <>
        {opts?.icon ? <span className="pe-panel__icon" aria-hidden>{opts.icon}</span> : null}
        {t(titleAr, titleEn)}
      </>
    );
    const hint =
      opts?.hintAr && opts.hintEn ? (
        <p className="pe-panel__hint text-pretty">{t(opts.hintAr, opts.hintEn)}</p>
      ) : null;
    const body = <div className="pe-panel__body">{children}</div>;

    if (opts?.collapsible) {
      return (
        <details
          id={opts.id}
          className={`pe-panel pe-panel--collapse${accent}`}
          style={style}
          open={opts.defaultOpen !== false}
        >
          <summary className="pe-panel__summary">
            <span className="pe-panel__summary-main pe-panel__title">{title}</span>
            {opts.summary ? (
              <span className="pe-panel__summary-meta">{opts.summary}</span>
            ) : null}
          </summary>
          {hint}
          {body}
        </details>
      );
    }

    return (
      <section
        id={opts?.id}
        className={`pe-panel${accent}`}
        style={style}
      >
        <header className="pe-panel__head">
          <h2 className="pe-panel__title">{title}</h2>
          {hint}
        </header>
        {body}
      </section>
    );
  };

  const pendingKeyCount = pendingStock.length;

  const jumpToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    let node: HTMLElement | null = el;
    while (node) {
      if (node instanceof HTMLDetailsElement) node.open = true;
      node = node.parentElement;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tocLink = (id: string, labelAr: string, labelEn: string) => (
    <a
      key={id}
      className="pe-toc__link"
      href={`#${id}`}
      onClick={(e) => {
        e.preventDefault();
        jumpToSection(id);
      }}
    >
      {t(labelAr, labelEn)}
    </a>
  );

  const keyedProduct = keyCounts.available + keyCounts.claimed + pendingKeyCount > 0;
  const stockNum = keyedProduct ? keyCounts.available + pendingKeyCount : Number(form.stock) || 0;
  const sellerOptions = filterAndSortSellers(sellers, sellerQuery, sellerRoleFilter, sellerSort);
  const hasMedia = collectFormMediaUrls(form).length > 0;
  const productTypeOptions = (() => {
    const base = allProductTypes(customProductTypes);
    const id = form.product_type?.trim();
    if (id && !base.some((t) => t.id === id)) {
      return [...base, { id, labelEn: id, labelAr: id }];
    }
    return base;
  })();

  const statusLabel = (s: Product['status']) =>
    s === 'active' ? t('نشط', 'Active') : s === 'inactive' ? t('غير نشط', 'Inactive') : t('مسودة', 'Draft');

  const summaryName = (lang === 'ar' && form.name_ar.trim()) ? form.name_ar.trim() : form.name.trim() || t('بدون اسم', 'Untitled');
  const priceNum = Number(form.price);
  const originalNum = Number(form.original_price);
  const discountPct =
    Number.isFinite(priceNum) &&
    Number.isFinite(originalNum) &&
    originalNum > 0 &&
    priceNum >= 0 &&
    originalNum > priceNum
      ? Math.round(((originalNum - priceNum) / originalNum) * 100)
      : 0;
  const pasteLineCount = stockPaste.split('\n').filter((l) => l.trim()).length;
  const totalStockUnits = pendingStock.length + keyOverrides.length;
  const deliveryPasteLineCount = deliveryPaste.split('\n').filter((l) => l.trim()).length;
  const deliveryPasteUnitCount = Math.min(
    totalStockUnits,
    deliveryTwoLinesPerUnit
      ? Math.floor(deliveryPasteLineCount / 2)
      : deliveryPasteLineCount,
  );
  const stockPaged = !stockListAll && totalStockUnits > 0;
  const stockPageCount = Math.max(1, Math.ceil(totalStockUnits / stockPerPage));
  const safeStockPage = Math.min(stockPage, stockPageCount - 1);
  const stockSliceStart = stockPaged ? safeStockPage * stockPerPage : 0;
  const stockSliceEnd = stockPaged ? stockSliceStart + stockPerPage : totalStockUnits;
  const stockListItems: StockListItem[] = [
    ...pendingStock.map((row, idx) => ({ kind: 'pending' as const, row, globalIndex: idx })),
    ...keyOverrides.map((row, idx) => ({
      kind: 'saved' as const,
      row,
      globalIndex: pendingStock.length + idx,
    })),
  ];
  const visibleStockItems = stockListItems.slice(stockSliceStart, stockSliceEnd);
  const customStockCount =
    keyOverrides.filter(keyHasCustom).length + pendingStock.filter(keyHasCustom).length;

  useEffect(() => {
    if (stockListAll || totalStockUnits === 0) return;
    if (stockPage >= stockPageCount) setStockPage(stockPageCount - 1);
  }, [stockListAll, stockPage, stockPageCount, totalStockUnits]);

  const dirty = Boolean(baseline) && editorSnapshot(form, pendingStock, keyOverrides) !== baseline;
  const blockLeave = dirty && !saving;

  useEffect(() => {
    if (!blockLeave) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [blockLeave]);

  const leaveBlocker = useBlocker(blockLeave);
  useEffect(() => {
    if (leaveBlocker.state === 'blocked') setLeaveOpen(true);
  }, [leaveBlocker.state]);

  const bumpStockPerPage = (delta: number) => {
    setStockPerPage((n) => Math.max(3, n + delta));
  };

  const renderStockCard = (
    opts: {
      keyId: string;
      index: number;
      content: string;
      secretDetails: string;
      secretFields: SecretField[];
      pending?: boolean;
      onDetails: (v: string) => void;
      onField: (fieldId: string, patch: Partial<Pick<SecretField, 'key' | 'value'>>) => void;
      onAddField: () => void;
      onRemoveField: (fieldId: string) => void;
      onRemove: () => void;
    },
  ) => {
    const custom = keyHasCustom(opts);
    return (
      <li key={opts.keyId} className="pe-stock-card" style={{ ['--i' as string]: opts.index } as CSSProperties}>
        <details className="pe-stock-card__details">
          <summary className="pe-stock-card__summary">
            <span className="pe-stock-card__index tabular-nums" aria-hidden>
              {opts.index + 1}
            </span>
            <span className="pe-stock-card__code font-mono" dir="ltr">
              {opts.content}
            </span>
            <span className="pe-stock-card__tags">
              {opts.pending ? (
                <span className="pe-stock-tag pe-stock-tag--pending">{t('جديد', 'New')}</span>
              ) : null}
              {custom ? (
                <span className="pe-stock-tag pe-stock-tag--custom">{t('مخصص', 'Custom')}</span>
              ) : (
                <span className="pe-stock-tag">{t('افتراضي', 'Default')}</span>
              )}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square text-error/80 pe-stock-card__remove"
              aria-label={t('حذف الوحدة', 'Remove unit')}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                opts.onRemove();
              }}
            >
              <Trash2 size={12} />
            </button>
          </summary>
          <div className="pe-stock-card__body">
            <label className="pe-field">
              <span className="pe-field__label">
                {t('تفاصيل هذه الوحدة', 'This unit’s delivery')}
              </span>
              <textarea
                value={opts.secretDetails}
                onChange={(e) => opts.onDetails(e.target.value)}
                rows={3}
                dir="auto"
                placeholder={t(
                  'فارغ = يستخدم الافتراضي المشترك',
                  'Empty = use shared default',
                )}
                className="textarea textarea-bordered textarea-sm w-full font-mono text-xs leading-relaxed"
              />
            </label>
            {opts.secretFields.length > 0 ? (
              <ul className="space-y-1.5">
                {opts.secretFields.map((f) => (
                  <li key={f.id} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                    <input
                      value={f.key}
                      onChange={(e) => opts.onField(f.id, { key: e.target.value })}
                      placeholder={t('الاسم', 'Label')}
                      className="input input-bordered input-xs w-full sm:w-28 shrink-0"
                    />
                    <input
                      value={f.value}
                      onChange={(e) => opts.onField(f.id, { value: e.target.value })}
                      placeholder={t('القيمة', 'Value')}
                      dir="ltr"
                      className="input input-bordered input-xs w-full font-mono min-w-0"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square text-error/80"
                      onClick={() => opts.onRemoveField(f.id)}
                      aria-label={t('حذف', 'Remove')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className="btn btn-ghost btn-xs gap-1 self-start" onClick={opts.onAddField}>
              <Plus size={12} />
              {t('قيمة لهذه الوحدة', 'Value for this unit')}
            </button>
          </div>
        </details>
      </li>
    );
  };

  if (loadState === 'loading') {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-2"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="loading loading-spinner loading-md text-primary" aria-hidden />
        <p className="text-sm text-base-content/60">{t('جارٍ فتح المنتج', 'Opening product')}</p>
      </div>
    );
  }

  if (loadState === 'not-found') {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-base-content/70">{t('المنتج غير موجود', 'Product not found')}</p>
        <Link to="/dashboard/products" className="btn btn-primary btn-sm">
          {t('العودة إلى المنتجات', 'Back to products')}
        </Link>
      </div>
    );
  }

  const saveLabel = isCreate ? t('إضافة المنتج', 'Add Product') : t('حفظ التعديلات', 'Save Changes');
  const floatActions = dirty && topOut;

  const actionButtons = (
    <div className="product-editor__actions">
      <button type="button" onClick={goBack} className="btn btn-ghost btn-sm">
        {t('إلغاء', 'Cancel')}
      </button>
      <button
        type="button"
        onClick={save}
        disabled={saving || uploading || (!isCreate && !dirty)}
        className="btn btn-primary btn-sm gap-2"
      >
        {saving && <Loader2 size={13} className="animate-spin" />}
        {saveLabel}
      </button>
    </div>
  );

  const statusChipClass =
    form.status === 'active'
      ? 'product-editor__chip product-editor__chip--ok'
      : form.status === 'draft'
        ? 'product-editor__chip product-editor__chip--warn'
        : 'product-editor__chip product-editor__chip--mute';

  return (
    <div className={`product-editor product-editor-enter ${floatActions ? 'pb-28' : 'pb-8'}`}>
      <div ref={topSentinelRef} className="h-px w-full" aria-hidden />

      <header className="product-editor__top">
        <div className="product-editor__top-row">
          <div className="product-editor__title-block min-w-0">
            <div className="product-editor__kicker">
              <Link to="/dashboard/products" className="btn btn-ghost btn-sm gap-1.5 shrink-0 -ms-2">
              <ArrowLeft size={14} className="rtl:rotate-180" aria-hidden />
              {t('رجوع', 'Back')}
            </Link>
              <span className={statusChipClass}>{statusLabel(form.status)}</span>
              {dirty ? (
                <span className="product-editor__chip product-editor__chip--dirty">
                  {t('غير محفوظ', 'Unsaved')}
                </span>
              ) : null}
            </div>
            <h1 className="product-editor__h1">
              {isCreate ? t('إضافة منتج', 'Add Product') : t('تعديل المنتج', 'Edit Product')}
            </h1>
            <p className="product-editor__lede text-pretty">
              {isCreate
                ? t('الاسم والسعر والمخزون — ثم احفظ.', 'Name, price, stock — then save.')
                : t('عدّل ما تحتاج، ثم احفظ.', 'Change what you need, then save.')}
            </p>
            <div className="product-editor__meta" aria-label={t('ملخص سريع', 'Quick summary')}>
              <span className="product-editor__chip tabular-nums">
                {form.price ? `$${form.price}` : '—'}
              </span>
              <span className="product-editor__chip tabular-nums">
                {t('المخزون', 'Stock')} · {stockNum}
              </span>
              {keyedProduct ? (
                <span className="product-editor__chip product-editor__chip--ok tabular-nums">
                  {t('مفاتيح', 'Keys')} · {keyCounts.available + pendingKeyCount}
                </span>
              ) : null}
            </div>
          </div>
          {!floatActions ? actionButtons : null}
        </div>
        {formError && !floatActions ? (
          <div role="alert" className="alert alert-error text-sm py-2 mt-3">
            {formError}
          </div>
        ) : null}
      </header>

      {floatActions ? (
        <div className="product-editor__save-dock" role="region" aria-label={t('حفظ', 'Save')}>
          <div className="product-editor__savebar">
            {formError ? (
              <div role="alert" className="alert alert-error text-sm py-2 max-w-5xl mx-auto w-full">
                {formError}
              </div>
            ) : null}
            <div className="product-editor__savebar-inner">
              <p className="product-editor__save-hint">
                {t('تغييرات غير محفوظة', 'Unsaved changes')}
              </p>
              {actionButtons}
            </div>
          </div>
        </div>
      ) : null}

      <div className="product-editor__layout">
        <div className="product-editor__stack">
            {primarySection(
              'الأساسيات',
              'Basics',
              <div className="pe-basics">
                <div className="pe-basics__identity" aria-live="polite">
                  <p className="pe-basics__identity-name">{summaryName}</p>
                  <p className="pe-basics__identity-path font-mono" dir="ltr">
                    <span className="pe-basics__identity-prefix">/product/</span>
                    {form.slug.trim() || '—'}
                  </p>
                </div>

                <div className="pe-basics__zone">
                  <div className="pe-basics__zone-head">
                    <h3 className="pe-basics__zone-title">{t('الأسماء', 'Names')}</h3>
                    <p className="pe-basics__zone-hint text-pretty">
                      {t('إنجليزي وعربي بنفس الوزن — RTL جاهز.', 'English and Arabic at equal weight — RTL ready.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    {field(
                      'الاسم (إنجليزي)',
                      'Name (English)',
                      <input
                        value={form.name}
                        onChange={(e) => setField('name', e.target.value)}
                        className="input input-bordered input-sm w-full"
                        autoComplete="off"
                      />,
                    )}
                    {field(
                      'الاسم (عربي)',
                      'Name (Arabic)',
                      <input
                        value={form.name_ar}
                        onChange={(e) => setField('name_ar', e.target.value)}
                        dir="rtl"
                        className="input input-bordered input-sm w-full"
                        autoComplete="off"
                      />,
                    )}
                  </div>
                </div>

                <div className="pe-basics__zone">
                  <div className="pe-basics__zone-head">
                    <h3 className="pe-basics__zone-title">{t('الرابط', 'URL')}</h3>
                    <p className="pe-basics__zone-hint text-pretty">
                      {t('المعرّف يظهر في عنوان الصفحة.', 'Slug appears in the page address.')}
                    </p>
                  </div>
                  <label className="pe-field pe-basics__slug">
                    <span className="pe-field__label">{t('المعرّف (رابط)', 'Slug (URL)')}</span>
                    <div className="pe-basics__slug-row">
                      <span className="pe-basics__slug-prefix font-mono" dir="ltr" aria-hidden>
                        /product/
                      </span>
                      <input
                        value={form.slug}
                        onChange={(e) => setField('slug', e.target.value)}
                        dir="ltr"
                          className="input input-bordered w-full font-mono text-sm"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                  </label>
                </div>

                <div className="pe-basics__zone">
                  <div className="pe-basics__zone-head">
                    <h3 className="pe-basics__zone-title">{t('التصنيف', 'Classify')}</h3>
                    <p className="pe-basics__zone-hint text-pretty">
                      {t('فئة المتجر ونوع البطاقة.', 'Store category and card type.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    {field(
                      'التصنيف',
                      'Category',
                      <select
                        value={form.category_id}
                        onChange={(e) => setField('category_id', e.target.value)}
                        className="select select-bordered select-sm w-full"
                      >
                    <option value="">{t('بدون تصنيف', 'No category')}</option>
                    {flattenCategoryTree(categories).map((c) => (
                      <option key={c.id} value={c.id}>
                        {indentPrefix(c.level)}
                        {c.name}
                      </option>
                    ))}
                      </select>,
                )}
                {field(
                  'نوع المنتج',
                  'Product Type',
                    <select
                      value={form.product_type || 'other'}
                      onChange={(e) => setField('product_type', e.target.value)}
                      className="select select-bordered select-sm w-full"
                    >
                      {productTypeOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {t(opt.labelAr, opt.labelEn)}
                        </option>
                      ))}
                      </select>,
                    )}
                  </div>
                  <div
                    className="pe-basics__type-chips"
                    role="group"
                    aria-label={t('اختيار سريع للنوع', 'Quick type pick')}
                  >
                    {productTypeOptions.slice(0, 8).map((opt) => {
                      const active = (form.product_type || 'other') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={`pe-basics__chip${active ? ' is-active' : ''}`}
                          aria-pressed={active}
                          onClick={() => setField('product_type', opt.id)}
                        >
                          {t(opt.labelAr, opt.labelEn)}
                        </button>
                      );
                    })}
                  </div>
                    {canManageTypes ? (
                      addingType ? (
                      <div className="pe-basics__new-type">
                        <div className="pe-field-grid">
                            <input
                              value={newTypeEn}
                              onChange={(e) => setNewTypeEn(e.target.value)}
                              placeholder={t('الاسم (إنجليزي)', 'Name (English)')}
                              className="input input-bordered input-sm w-full"
                              dir="ltr"
                            />
                            <input
                              value={newTypeAr}
                              onChange={(e) => setNewTypeAr(e.target.value)}
                              placeholder={t('الاسم (عربي)', 'Name (Arabic)')}
                              className="input input-bordered input-sm w-full"
                              dir="rtl"
                            />
                          </div>
                          {newTypeEn.trim() ? (
                          <p className="pe-field__hint font-mono" dir="ltr">
                              id: {slugifyProductType(newTypeEn)}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              disabled={saveSettings.isPending || !newTypeEn.trim()}
                              onClick={() => void addCustomProductType()}
                            >
                              {saveSettings.isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : null}
                              {t('حفظ النوع', 'Save type')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => {
                                setAddingType(false);
                                setNewTypeEn('');
                                setNewTypeAr('');
                              }}
                            >
                              {t('إلغاء', 'Cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                        className="btn btn-ghost btn-xs gap-1 self-start"
                          onClick={() => setAddingType(true)}
                        >
                          <Plus size={12} />
                          {t('إضافة نوع', 'Add type')}
                        </button>
                      )
                    ) : null}
                </div>
                  </div>,
              {
                id: 'pe-basics',
                icon: <Package size={14} strokeWidth={2.25} />,
                accent: 'basics',
                hintAr: 'الاسم والهوية في المتجر.',
                hintEn: 'Name and identity on the storefront.',
                i: 0,
              },
            )}

            {primarySection(
              'التسعير والمخزون',
              'Pricing & stock',
              <div className="pe-pricing">
                <div className="pe-pricing__deal" aria-live="polite">
                  <div className="pe-pricing__deal-main">
                    <span className="pe-pricing__deal-price tabular-nums">
                      {form.price.trim() ? `$${form.price}` : '—'}
                    </span>
                    {discountPct > 0 ? (
                      <>
                        <span className="pe-pricing__deal-was tabular-nums">
                          ${form.original_price}
                        </span>
                        <span className="pe-pricing__deal-off tabular-nums">−{discountPct}%</span>
                      </>
                    ) : null}
              </div>
                  <div className="pe-pricing__deal-meta">
                    <span
                      className={`pe-pricing__pill pe-pricing__pill--${form.status}`}
                    >
                      {statusLabel(form.status)}
                    </span>
                    <span className="pe-pricing__pill tabular-nums">
                      {t('المخزون', 'Stock')} · {stockNum}
                    </span>
                    {keyedProduct ? (
                      <span className="pe-pricing__pill pe-pricing__pill--keys">
                        {t('من المفاتيح', 'From keys')}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="pe-pricing__zone">
                  <div className="pe-pricing__zone-head">
                    <h3 className="pe-pricing__zone-title">{t('السعر', 'Price')}</h3>
                    <p className="pe-pricing__zone-hint text-pretty">
                      {t('السعر الحالي والقديم للخصم.', 'Sale price and compare-at for discount.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    <label className="pe-field">
                      <span className="pe-field__label">{t('السعر', 'Price')}</span>
                      <div className="pe-pricing__money">
                        <span className="pe-pricing__money-prefix" aria-hidden>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.price}
                          onChange={(e) => setField('price', e.target.value)}
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      </div>
                    </label>
                    <label className="pe-field">
                      <span className="pe-field__label">{t('السعر قبل الخصم', 'Original price')}</span>
                      <div className="pe-pricing__money">
                        <span className="pe-pricing__money-prefix" aria-hidden>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.original_price}
                          onChange={(e) => setField('original_price', e.target.value)}
                          placeholder={t('اختياري', 'Optional')}
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pe-pricing__zone">
                  <div className="pe-pricing__zone-head">
                    <h3 className="pe-pricing__zone-title">{t('المخزون والحالة', 'Stock & status')}</h3>
                    <p className="pe-pricing__zone-hint text-pretty">
                      {keyedProduct
                        ? t('المخزون يتبع وحدات التسليم.', 'Stock follows fulfillment units.')
                        : t('الكمية اليدوية عندما لا توجد مفاتيح.', 'Manual qty when there are no keys.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    {field(
                      'المخزون',
                      'Stock',
                  keyedProduct ? (
                      <input
                        type="number"
                        value={keyCounts.available + pendingKeyCount}
                        disabled
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      ) : (
                    <input
                      type="number"
                          min="0"
                          value={form.stock}
                          onChange={(e) => setField('stock', e.target.value)}
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      ),
                      keyedProduct
                        ? ['يُحسب من المفاتيح غير المستخدمة', 'Synced from unused one-time keys']
                        : undefined,
                    )}
                    <div className="pe-field">
                      <span className="pe-field__label">{t('الحالة', 'Status')}</span>
                      <div className="pe-pricing__status" role="group" aria-label={t('الحالة', 'Status')}>
                        {([
                          ['draft', 'مسودة', 'Draft'],
                          ['active', 'نشط', 'Active'],
                          ['inactive', 'غير نشط', 'Inactive'],
                        ] as const).map(([id, ar, en]) => (
                          <button
                            key={id}
                            type="button"
                            className={`pe-pricing__status-btn pe-pricing__status-btn--${id}${
                              form.status === id ? ' is-active' : ''
                            }`}
                            aria-pressed={form.status === id}
                            onClick={() => setField('status', id)}
                          >
                            {t(ar, en)}
                          </button>
                        ))}
                  </div>
                    </div>
                  </div>
                  {stockNum <= 0
                    ? field(
                    'رسالة نفاد المخزون',
                    'Zero-stock label',
                    <select
                      value={form.oos_message}
                      onChange={(e) =>
                        setField('oos_message', e.target.value as 'out_of_stock' | 'not_available')
                      }
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="out_of_stock">{t('نفد المخزون', 'Out of stock')}</option>
                      <option value="not_available">
                        {t('غير متوفر حالياً', 'Not available currently')}
                      </option>
                        </select>,
                      )
                    : null}
                </div>

                <div className="pe-pricing__zone">
                  <div className="pe-pricing__zone-head">
                    <h3 className="pe-pricing__zone-title">{t('ثقة الشراء', 'Purchase trust')}</h3>
                    <p className="pe-pricing__zone-hint text-pretty">
                      {t('تقييم افتراضي ووعد التسليم في السلة.', 'Default rating and cart delivery promise.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    <label className="pe-field">
                      <span className="pe-field__label">{t('التقييم الافتراضي', 'Default rating')}</span>
                      <div className="pe-pricing__rating">
                        <Star size={14} className="pe-pricing__rating-icon" aria-hidden />
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={form.rating_seed}
                          onChange={(e) => setField('rating_seed', e.target.value)}
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      </div>
                      <span className="pe-field__hint text-pretty">
                        {t(
                          '٥ نجوم حتى يقيّم المشترون — ثم متوسط تقييماتهم',
                          '5★ until buyers review — then buyer average',
                        )}
                      </span>
                    </label>
                    <div className="pe-field">
                      <span className="pe-field__label">{t('وقت التسليم (السلة)', 'Delivery (cart)')}</span>
                      <div className="pe-pricing__delivery" role="group" aria-label={t('التسليم', 'Delivery')}>
                        {([
                          ['instant', 'فوري', 'Instant'],
                          ['minutes', 'دقائق', 'Minutes'],
                          ['hours', '٢٤س', '24h'],
                          ['days', '١–٣ي', '1–3d'],
                          ['custom', 'مخصص', 'Custom'],
                        ] as const).map(([id, ar, en]) => (
                          <button
                            key={id}
                            type="button"
                            className={`pe-pricing__delivery-btn${
                              form.delivery_preset === id ? ' is-active' : ''
                            }`}
                            aria-pressed={form.delivery_preset === id}
                            onClick={() => setField('delivery_preset', id)}
                          >
                            {t(ar, en)}
                          </button>
                        ))}
                      </div>
                      {form.delivery_preset === 'custom' ? (
                        <div className="pe-field-grid mt-2">
                        <input
                          type="text"
                          value={form.delivery_custom_en}
                          onChange={(e) => setField('delivery_custom_en', e.target.value)}
                          placeholder={t('الإنجليزية', 'English')}
                          className="input input-bordered input-sm w-full"
                          dir="ltr"
                        />
                        <input
                          type="text"
                          value={form.delivery_custom_ar}
                          onChange={(e) => setField('delivery_custom_ar', e.target.value)}
                          placeholder={t('العربية', 'Arabic')}
                          className="input input-bordered input-sm w-full"
                          dir="rtl"
                        />
                      </div>
                      ) : null}
                      <span className="pe-field__hint text-pretty">
                      {t(
                        'يظهر في ملخص السلة والدفع. الافتراضي: فوري.',
                        'Shown in cart and checkout summary. Default: Instant.',
                      )}
                    </span>
                  </div>
              </div>
                </div>
              </div>,
              {
                id: 'pe-pricing',
                icon: <CircleDollarSign size={14} strokeWidth={2.25} />,
                accent: 'commerce',
                hintAr: 'السعر والمخزون والحالة.',
                hintEn: 'Price, stock, and status.',
                i: 1,
              },
            )}

            {primarySection(
              'التسليم',
              'Fulfillment',
              <div className="pe-fulfill">
                <div className="pe-fulfill__meter" aria-label={t('ملخص المخزون', 'Stock summary')}>
                  <div className="pe-fulfill__stat">
                    <span className="pe-fulfill__stat-n tabular-nums">{keyCounts.available + pendingKeyCount}</span>
                    <span className="pe-fulfill__stat-l">{t('متاح', 'Available')}</span>
                  </div>
                  <div className="pe-fulfill__stat">
                    <span className="pe-fulfill__stat-n tabular-nums">{keyCounts.claimed}</span>
                    <span className="pe-fulfill__stat-l">{t('مُسلَّم', 'Delivered')}</span>
                  </div>
                  <div className="pe-fulfill__stat">
                    <span className="pe-fulfill__stat-n tabular-nums">{pendingKeyCount}</span>
                    <span className="pe-fulfill__stat-l">{t('في الانتظار', 'Queued')}</span>
                  </div>
                  <div className="pe-fulfill__stat">
                    <span className="pe-fulfill__stat-n tabular-nums">{customStockCount}</span>
                    <span className="pe-fulfill__stat-l">{t('مخصص', 'Custom')}</span>
                  </div>
                </div>

                <div className="pe-fulfill__tabs" role="tablist" aria-label={t('التسليم', 'Fulfillment')}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={fulfillTab === 'stock'}
                    className={`pe-fulfill__tab${fulfillTab === 'stock' ? ' is-active' : ''}`}
                    onClick={() => setFulfillTab('stock')}
                  >
                    {t('وحدات المخزون', 'Stock units')}
                    <span className="pe-fulfill__tab-n tabular-nums">{keyCounts.available + pendingKeyCount}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={fulfillTab === 'default'}
                    className={`pe-fulfill__tab${fulfillTab === 'default' ? ' is-active' : ''}`}
                    onClick={() => setFulfillTab('default')}
                  >
                    {t('الافتراضي المشترك', 'Shared default')}
                  </button>
                </div>

                {fulfillTab === 'stock' ? (
                  <div className="pe-fulfill__stock" role="tabpanel">
                    <div className="pe-fulfill__add">
                      <div className="pe-fulfill__add-row">
                        <input
                          value={stockDraft}
                          onChange={(e) => setStockDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              queueDraftStock();
                            }
                          }}
                          dir="ltr"
                          placeholder={t('أضف وحدة واحدة — الصق المفتاح ثم Enter', 'Add one unit — paste key, then Enter')}
                          className="input input-bordered w-full font-mono text-sm"
                          aria-label={t('مفتاح جديد', 'New key')}
                        />
                        <button type="button" className="btn btn-primary shrink-0" onClick={queueDraftStock} disabled={!stockDraft.trim()}>
                          <Plus size={15} strokeWidth={2.25} aria-hidden />
                          {t('إضافة', 'Add')}
                        </button>
                      </div>
                      <details className="pe-fulfill__bulk">
                        <summary className="pe-fulfill__bulk-summary">
                          <span className="pe-fulfill__bulk-label">{t('لصق دفعة', 'Bulk paste')}</span>
                          <span
                            className="tooltip tooltip-bottom shrink-0"
                            data-tip={t(
                              'الصق مفاتيح متعددة — سطر واحد = وحدة جديدة في الطابور.',
                              'Paste many keys — one line = one new queued unit.',
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="pe-fulfill__bulk-tip"
                              aria-label={t('مساعدة لصق المفاتيح', 'Bulk key paste help')}
                              aria-describedby="pe-fulfill-bulk-keys-tip"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <CircleHelp size={14} aria-hidden />
                            </button>
                          </span>
                          <ChevronDown size={14} className="pe-fulfill__bulk-chev" aria-hidden />
                        </summary>
                        <div className="pe-fulfill__bulk-body">
                          <p id="pe-fulfill-bulk-keys-tip" className="pe-field__hint text-pretty">
                            {t(
                              'الصق مفاتيح الترخيص دفعة واحدة — كل سطر غير فارغ يصبح وحدة مخزون جديدة في الطابور (تُحفظ عند حفظ المنتج). لا يغيّر الوحدات الموجودة.',
                              'Paste license keys in bulk — each non-empty line becomes a new stock unit in the queue (saved when you save the product). Does not change units already in the list.',
                            )}
                          </p>
                  <textarea
                            value={stockPaste}
                            onChange={(e) => setStockPaste(e.target.value)}
                            rows={3}
                    dir="ltr"
                            placeholder={t('مفتاح في كل سطر', 'One key per line')}
                    className="textarea textarea-bordered textarea-sm w-full font-mono text-xs leading-relaxed"
                            aria-label={t('لصق مفاتيح', 'Paste keys')}
                  />
                  <div className="flex items-center justify-between gap-2">
                            <span className="pe-field__hint tabular-nums">
                              {pasteLineCount > 0
                                ? t(`${pasteLineCount} سطر`, `${pasteLineCount} line(s)`)
                                : t('ثم أضف للطابور قبل الحفظ', 'Queue before save')}
                      </span>
                            <button type="button" className="btn btn-outline btn-xs" disabled={pasteLineCount === 0} onClick={queuePasteAsStock}>
                              {t('إضافة للطابور', 'Queue units')}
                      </button>
                          </div>
                        </div>
                      </details>
                      <details
                        className={`pe-fulfill__bulk pe-fulfill__bulk--delivery${totalStockUnits === 0 ? ' is-locked' : ''}`}
                        onToggle={(e) => {
                          if (totalStockUnits === 0) {
                            e.currentTarget.open = false;
                          }
                        }}
                      >
                        <summary
                          className="pe-fulfill__bulk-summary"
                          aria-disabled={totalStockUnits === 0 || undefined}
                          onClick={(e) => {
                            if (totalStockUnits === 0) e.preventDefault();
                          }}
                        >
                          <span className="pe-fulfill__bulk-label">{t('لصق تسليم دفعة', 'Bulk delivery paste')}</span>
                          <span
                            className="tooltip tooltip-bottom shrink-0"
                            data-tip={t(
                              'الصق تفاصيل التسليم للوحدات الموجودة بالترتيب.',
                              'Paste delivery details for existing units in list order.',
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="pe-fulfill__bulk-tip"
                              aria-label={t('مساعدة لصق التسليم', 'Bulk delivery paste help')}
                              aria-describedby="pe-fulfill-bulk-delivery-tip"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <CircleHelp size={14} aria-hidden />
                            </button>
                          </span>
                          <ChevronDown size={14} className="pe-fulfill__bulk-chev" aria-hidden />
                        </summary>
                        <div className="pe-fulfill__bulk-body">
                          <p id="pe-fulfill-bulk-delivery-tip" className="pe-field__hint text-pretty">
                            {deliveryPasteTarget === 'labels'
                              ? t(
                                  'يملأ قيم الحقول المُسمّاة للوحدات الموجودة دون إنشاء مفاتيح جديدة. السطر 1 → قيمة الحقل الأول للوحدة 1، وهكذا بنفس ترتيب القائمة. فعّل «سطران لكل وحدة» لملء الحقلين الأولين (مثل بريد ثم كلمة مرور). عدّل أسماء الحقول أدناه — تُطبَّق على كل الوحدات. الأسطر الزائدة يُتجاهَل معها تنبيه.',
                                  'Fills named label values for units already in the list without creating new keys. Line 1 → first label value for unit 1, in list order. Enable “2 lines per unit” to fill the first two label values (e.g. email then password). Edit label names below — applied to all units. Extra lines are ignored with a warning.',
                                )
                              : t(
                                  'يملأ محتوى التسليم للوحدات الموجودة دون إنشاء مفاتيح جديدة. السطر 1 → الوحدة 1، السطر 2 → الوحدة 2، وهكذا بنفس ترتيب القائمة. فعّل «سطران لكل وحدة» لربط سطرين (مثل بريد ثم كلمة مرور) في حقول القيم لنفس الوحدة. الأسطر الزائدة يُتجاهَل معها تنبيه.',
                                  'Fills delivery content for units already in the list without creating new keys. Line 1 → unit 1, line 2 → unit 2, in list order. Enable “2 lines per unit” to pair lines (e.g. email then password) into that unit’s value fields. Extra lines are ignored with a warning.',
                                )}
                          </p>
                          {totalStockUnits === 0 ? (
                            <p className="pe-field__hint text-pretty pe-fulfill__bulk-lock">
                              {t(
                                'أضف وحدة مخزون واحدة على الأقل قبل لصق التسليم.',
                                'Add at least one stock unit before bulk delivery paste.',
                              )}
                            </p>
                          ) : (
                            <>
                              <div
                                className="pe-fulfill__view-modes"
                                role="group"
                                aria-label={t('وجهة اللصق', 'Paste target')}
                              >
                                <button
                                  type="button"
                                  className={`pe-fulfill__view-mode${deliveryPasteTarget === 'delivery' ? ' is-active' : ''}`}
                                  aria-pressed={deliveryPasteTarget === 'delivery'}
                                  onClick={() => setDeliveryPasteTarget('delivery')}
                                >
                                  {t('تسليم الوحدة', 'Unit delivery')}
                                </button>
                                <button
                                  type="button"
                                  className={`pe-fulfill__view-mode${deliveryPasteTarget === 'labels' ? ' is-active' : ''}`}
                                  aria-pressed={deliveryPasteTarget === 'labels'}
                                  onClick={() => setDeliveryPasteTarget('labels')}
                                >
                                  {t('الحقول المُسمّاة', 'Labels')}
                                </button>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="pe-field__label text-xs">{t('أسماء الحقول', 'Label names')}</span>
                                {bulkLabelFields.length === 0 ? (
                                  <p className="pe-field__hint m-0">
                                    {t(
                                      'لا حقول بعد — أضف اسماً لتطبيقه على كل الوحدات.',
                                      'No labels yet — add a name to apply across all units.',
                                    )}
                                  </p>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {bulkLabelFields.map((f, index) => (
                                      <li key={f.id} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                                        <input
                                          value={f.key}
                                          onChange={(e) => renameBulkLabel(index, e.target.value)}
                                          placeholder={t('الاسم', 'Label')}
                                          aria-label={t(`اسم الحقل ${index + 1}`, `Label ${index + 1} name`)}
                                          className="input input-bordered input-xs w-full sm:w-28 shrink-0"
                                        />
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-xs btn-square text-error/80"
                                          onClick={() => removeBulkLabel(index)}
                                          aria-label={t(`حذف الحقل ${index + 1}`, `Remove label ${index + 1}`)}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <button type="button" className="btn btn-ghost btn-xs gap-1 self-start" onClick={addBulkLabel}>
                                  <Plus size={12} />
                                  {t('إضافة حقل', 'Add label')}
                                </button>
                              </div>
                              <textarea
                                value={deliveryPaste}
                                onChange={(e) => setDeliveryPasteClamped(e.target.value)}
                                rows={3}
                                dir="auto"
                                placeholder={
                                  deliveryPasteTarget === 'labels'
                                    ? deliveryTwoLinesPerUnit
                                      ? t('سطران لكل وحدة — قيمة الحقل الأول ثم الثاني', 'Two lines per unit — first label value then second')
                                      : t('سطر لكل وحدة — قيمة الحقل الأول', 'One line per unit — first label value')
                                    : deliveryTwoLinesPerUnit
                                      ? t('سطران لكل وحدة — بريد ثم كلمة مرور', 'Two lines per unit — email then password')
                                      : t('سطر لكل وحدة — محتوى التسليم', 'One line per unit — delivery content')
                                }
                                className="textarea textarea-bordered textarea-sm w-full font-mono text-xs leading-relaxed"
                                aria-label={
                                  deliveryPasteTarget === 'labels'
                                    ? t('لصق قيم الحقول', 'Paste label values')
                                    : t('لصق تسليم', 'Paste delivery')
                                }
                              />
                              <label className="pe-fulfill__bulk-check">
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-xs"
                                  checked={deliveryTwoLinesPerUnit}
                                  onChange={(e) => {
                                    const two = e.target.checked;
                                    setDeliveryTwoLinesPerUnit(two);
                                    setDeliveryPasteClamped(deliveryPaste, two);
                                  }}
                                />
                                <span>{t('سطران لكل وحدة', '2 lines per unit')}</span>
                              </label>
                              {deliveryPasteWarn ? (
                                <p className="pe-field__hint text-warning text-pretty" role="status">
                                  {deliveryPasteWarn}
                                </p>
                              ) : null}
                              <div className="flex items-center justify-between gap-2">
                                <span className="pe-field__hint tabular-nums">
                                  {deliveryPasteUnitCount > 0
                                    ? deliveryTwoLinesPerUnit
                                      ? t(
                                          `${deliveryPasteUnitCount} وحدة (${deliveryPasteLineCount} سطر)`,
                                          `${deliveryPasteUnitCount} unit(s) (${deliveryPasteLineCount} line(s))`,
                                        )
                                      : t(`${deliveryPasteUnitCount} سطر`, `${deliveryPasteUnitCount} line(s)`)
                                    : t('يُطبَّق على الوحدات الحالية قبل الحفظ', 'Applied to current units before save')}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-xs"
                                  disabled={deliveryPasteUnitCount === 0}
                                  onClick={applyBulkDelivery}
                                >
                                  {t('تطبيق على الوحدات', 'Apply to units')}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </details>
                    </div>

                    {totalStockUnits > 0 ? (
                      <div className="pe-fulfill__view">
                        <div
                          className="pe-fulfill__view-modes"
                          role="group"
                          aria-label={t('عرض الوحدات', 'Unit list view')}
                        >
                          <button
                            type="button"
                            className={`pe-fulfill__view-mode${stockListAll ? ' is-active' : ''}`}
                            aria-pressed={stockListAll}
                            onClick={() => setStockListAll(true)}
                          >
                            {t('عرض الكل', 'Show all units')}
                          </button>
                          <button
                            type="button"
                            className={`pe-fulfill__view-mode${!stockListAll ? ' is-active' : ''}`}
                            aria-pressed={!stockListAll}
                            onClick={() => {
                              setStockListAll(false);
                              setStockPage(0);
                            }}
                          >
                            {t('عرض لكل صفحة', 'Show per page')}
                          </button>
                        </div>
                        {!stockListAll ? (
                          <div className="pe-fulfill__view-per">
                            <span className="pe-field__hint">{t('لكل صفحة', 'Per page')}</span>
                            <span className="pe-fulfill__view-n tabular-nums" aria-live="polite">
                              {stockPerPage}
                            </span>
                            <div className="pe-fulfill__view-steps">
                              <button
                                type="button"
                                className="pe-fulfill__view-step"
                                disabled={stockPerPage <= 3}
                                onClick={() => bumpStockPerPage(-1)}
                                aria-label={t('تقليل عدد الصفحة', 'Decrease page size')}
                              >
                                <ChevronDown size={12} aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="pe-fulfill__view-step"
                                onClick={() => bumpStockPerPage(1)}
                                aria-label={t('زيادة عدد الصفحة', 'Increase page size')}
                              >
                                <ChevronUp size={12} aria-hidden />
                              </button>
                            </div>
                          </div>
                        ) : null}
                        {stockPaged ? (
                          <nav className="pe-fulfill__pager" aria-label={t('صفحات الوحدات', 'Unit pages')}>
                            {Array.from({ length: stockPageCount }, (_, i) => (
                              <button
                                key={i}
                                type="button"
                                className={`pe-fulfill__page${i === safeStockPage ? ' is-active' : ''}`}
                                aria-label={t(`صفحة ${i + 1}`, `Page ${i + 1}`)}
                                aria-current={i === safeStockPage ? 'page' : undefined}
                                onClick={() => setStockPage(i)}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </nav>
                        ) : null}
                      </div>
                    ) : null}

                    {keyOverrides.length === 0 && pendingStock.length === 0 ? (
                      <div className="pe-fulfill__empty">
                        <KeyRound size={22} aria-hidden />
                        <p className="pe-fulfill__empty-title">{t('لا وحدات بعد', 'No stock units yet')}</p>
                        <p className="pe-field__hint text-pretty">
                          {t(
                            'كل وحدة = مفتاح يُسلَّم لمشترٍ واحد. أضف واحدة أو الصق دفعة — يمكن تخصيص تفاصيل كل وحدة.',
                            'Each unit = one key for one buyer. Add one or bulk paste — customize details per unit.',
                          )}
                        </p>
                  </div>
                    ) : (
                      <ul className="pe-stock-list">
                        {visibleStockItems.map((item) =>
                          item.kind === 'pending'
                            ? renderStockCard({
                                keyId: item.row.tempId,
                                index: item.globalIndex,
                                content: item.row.content,
                                secretDetails: item.row.secretDetails,
                                secretFields: item.row.secretFields,
                                pending: true,
                                onDetails: (v) => setPendingDetails(item.row.tempId, v),
                                onField: (fid, patch) => setPendingField(item.row.tempId, fid, patch),
                                onAddField: () => addPendingField(item.row.tempId),
                                onRemoveField: (fid) => removePendingField(item.row.tempId, fid),
                                onRemove: () => removePendingStock(item.row.tempId),
                              })
                            : renderStockCard({
                                keyId: item.row.id,
                                index: item.globalIndex,
                                content: item.row.content,
                                secretDetails: item.row.secretDetails,
                                secretFields: item.row.secretFields,
                                onDetails: (v) => setKeyOverrideDetails(item.row.id, v),
                                onField: (fid, patch) => setKeyOverrideField(item.row.id, fid, patch),
                                onAddField: () => addKeyOverrideField(item.row.id),
                                onRemoveField: (fid) => removeKeyOverrideField(item.row.id, fid),
                                onRemove: () => void removeStockUnit(item.row.id),
                              }),
                        )}
                      </ul>
                    )}

                    {editing && keyCounts.available > 0 ? (
                      <div className="pe-fulfill__danger">
                        <button type="button" className="btn btn-ghost btn-xs text-error gap-1" onClick={clearUnclaimedKeys}>
                          <Trash2 size={12} />
                          {t('حذف كل المتاح', 'Delete all available')}
                        </button>
                </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="pe-fulfill__default" role="tabpanel">
                    <p className="pe-field__hint text-pretty">
                      {t(
                        'يُستخدم لكل وحدة بلا تفاصيل مخصصة. أسماء الحقول تبقى خاصة عن المشتري.',
                        'Used by every unit without custom details. Field labels stay private from the buyer.',
                      )}
                    </p>
                    <label className="pe-field">
                      <span className="pe-field__label">{t('محتوى التسليم', 'Delivery content')}</span>
                  <textarea
                    value={form.secretDetails}
                    onChange={(e) => setForm((prev) => ({ ...prev, secretDetails: e.target.value }))}
                    rows={5}
                    dir="auto"
                    placeholder={t(
                          'تعليمات، نص، روابط… تُسلَّم بعد الدفع',
                          'Instructions, text, links… delivered after payment',
                    )}
                    className="textarea textarea-bordered textarea-sm w-full font-mono text-xs leading-relaxed"
                  />
                </label>
                <div className="space-y-2">
                      <p className="pe-field__label">{t('قيم (اختياري)', 'Values (optional)')}</p>
                  {form.secretFields.length === 0 ? (
                        <p className="pe-field__hint">{t('لا قيم بعد — أضف عند الحاجة.', 'No values yet — add if needed.')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {form.secretFields.map((f) => (
                        <li key={f.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                          <input
                            value={f.key}
                            onChange={(e) => setSecretField(f.id, { key: e.target.value })}
                            placeholder={t('الاسم (للمالك فقط)', 'Label (admin only)')}
                            className="input input-bordered input-sm w-full sm:w-36 shrink-0"
                          />
                          <input
                            value={f.value}
                            onChange={(e) => setSecretField(f.id, { value: e.target.value })}
                            placeholder={t('القيمة', 'Value')}
                            dir="ltr"
                            className="input input-bordered input-sm w-full font-mono min-w-0"
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square text-error/80 shrink-0"
                            onClick={() => removeSecretField(f.id)}
                            aria-label={t('حذف الحقل', 'Remove field')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={addSecretField}>
                    <Plus size={14} />
                    {t('إضافة قيمة', 'Add value')}
                  </button>
                </div>
                  </div>
                )}

                <p className="pe-field__hint text-pretty">
                  {t(
                    'خاص. يظهر للمشتري فقط بعد دفع ناجح. المخزون = عدد الوحدات المتاحة.',
                    'Private. Shown to the buyer only after successful payment. Stock = available units.',
                  )}
                </p>
              </div>,
              {
                id: 'pe-fulfill',
                icon: <KeyRound size={14} strokeWidth={2.25} />,
                accent: 'fulfill',
                hintAr: 'مفتاح لكل وحدة — التفاصيل اختيارية.',
                hintEn: 'One key per unit — details optional.',
                i: 2,
                collapsible: true,
                summary: keyedProduct
                  ? t(
                      `${keyCounts.available + pendingKeyCount} متاح`,
                      `${keyCounts.available + pendingKeyCount} available`,
                    )
                  : t('بدون مخزون', 'No stock'),
              },
            )}

            {primarySection(
              'وصف المتجر',
              'Storefront description',
              <div className="pe-copy">
                <div className="pe-copy__preview" aria-live="polite">
                  <p className="pe-copy__preview-label">{t('معاينة', 'Preview')}</p>
                  <p
                    className="pe-copy__preview-body text-pretty"
                    dir={
                      (lang === 'ar'
                        ? form.description_ar.trim() || form.description.trim()
                        : form.description.trim() || form.description_ar.trim())
                        ? lang === 'ar' && form.description_ar.trim()
                          ? 'rtl'
                          : lang === 'en' && form.description.trim()
                            ? 'ltr'
                            : form.description_ar.trim() && !form.description.trim()
                              ? 'rtl'
                              : 'auto'
                        : 'auto'
                    }
                  >
                    {(lang === 'ar'
                      ? form.description_ar.trim() || form.description.trim()
                      : form.description.trim() || form.description_ar.trim()) ||
                      t('ابدأ الكتابة — المعاينة تظهر هنا.', 'Start writing — preview shows here.')}
                  </p>
                </div>

                <div className="pe-copy__tabs" role="tablist" aria-label={t('اللغة', 'Language')}>
                  {(
                    [
                      ['both', 'الاثنان', 'Both'],
                      ['en', 'إنجليزي', 'English'],
                      ['ar', 'عربي', 'Arabic'],
                    ] as const
                  ).map(([id, ar, en]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={copyLang === id}
                      className={`pe-copy__tab${copyLang === id ? ' is-active' : ''}`}
                      onClick={() => setCopyLang(id)}
                    >
                      {t(ar, en)}
                    </button>
                  ))}
                </div>

                <div
                  className={`pe-copy__editors${copyLang === 'both' ? ' pe-copy__editors--both' : ''}`}
                >
                  {copyLang === 'en' || copyLang === 'both' ? (
                    <label className="pe-field pe-copy__editor">
                      <span className="pe-copy__editor-head">
                        <span className="pe-field__label">{t('الوصف (إنجليزي)', 'Description (English)')}</span>
                        <span className="pe-copy__count tabular-nums">
                          {form.description.trim().length}
                        </span>
                      </span>
                      <textarea
                        value={form.description}
                        onChange={(e) => setField('description', e.target.value)}
                        rows={copyLang === 'both' ? 6 : 10}
                        dir="ltr"
                        placeholder={t(
                          'ما يراه المشتري تحت العنوان — قصير وواضح.',
                          'What shoppers read under the title — short and clear.',
                        )}
                        className="textarea textarea-bordered textarea-sm w-full pe-copy__textarea"
                      />
                    </label>
                  ) : null}
                  {copyLang === 'ar' || copyLang === 'both' ? (
                    <label className="pe-field pe-copy__editor">
                      <span className="pe-copy__editor-head">
                        <span className="pe-field__label">{t('الوصف (عربي)', 'Description (Arabic)')}</span>
                        <span className="pe-copy__count tabular-nums">
                          {form.description_ar.trim().length}
                        </span>
                      </span>
                      <textarea
                        value={form.description_ar}
                        onChange={(e) => setField('description_ar', e.target.value)}
                        rows={copyLang === 'both' ? 6 : 10}
                        dir="rtl"
                        placeholder={t(
                          'نفس الوزن البصري للإنجليزي — RTL أصلي.',
                          'Same visual weight as English — native RTL.',
                        )}
                        className="textarea textarea-bordered textarea-sm w-full pe-copy__textarea"
                      />
                    </label>
                  ) : null}
              </div>
              </div>,
              {
                id: 'pe-copy',
                icon: <AlignLeft size={14} strokeWidth={2.25} />,
                accent: 'copy',
                hintAr: 'نص صفحة المنتج — إنجليزي وعربي.',
                hintEn: 'Product page copy — English and Arabic.',
                i: 3,
              },
            )}

            <details id="pe-fx" className="pe-fx group">
              <summary className="pe-fx__summary">
                <span className="pe-fx__summary-main">
                  <span
                    className={`pe-fx__icon pe-fx__icon--${form.card_fx.style}`}
                    style={
                      form.card_fx.style !== 'none' && form.card_fx.color
                        ? ({
                            ['--pe-fx-icon-tint' as string]: form.card_fx.color,
                          } as CSSProperties)
                        : undefined
                    }
                    aria-hidden
                  >
                    {form.card_fx.style === 'matrix' ? (
                      <span className="pe-fx__icon-matrix">
                        {Array.from({ length: 3 }, (_, i) => (
                          <span
                            key={i}
                            className="pe-fx__icon-matrix-col"
                            style={{ ['--i' as string]: i }}
                          >
                            <span className="pe-fx__icon-matrix-stack">01ｱｲ</span>
                            <span className="pe-fx__icon-matrix-stack" aria-hidden>
                              01ｱｲ
                            </span>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <Sparkles size={15} strokeWidth={2.4} />
                    )}
                  </span>
                  <span className="pe-fx__title">{t('تأثير جسم البطاقة', 'Card body effect')}</span>
                </span>
                <span className="pe-fx__summary-meta">
                  {(() => {
                    const s = CARD_FX_STYLES.find((x) => x.id === form.card_fx.style);
                    return s ? t(s.labelAr, s.labelEn) : t('بدون', 'None');
                  })()}
                </span>
              </summary>
              <div className="pe-fx__body">
                <p className="pe-fx__hint text-pretty">
                  {t(
                    'خلف العنوان والسعر في بطاقة المتجر — ماتريكس، شعار، خطوط مسح، لمعان، جمرات، أو شق.',
                    'Behind title and price on the storefront card — matrix, logo, scanlines, sheen, embers, or rift.',
                  )}
                </p>

                <div
                  className="pe-fx__stage"
                  style={
                    form.card_fx.style !== 'none' && form.card_fx.color
                      ? ({ ['--pe-fx-tint']: form.card_fx.color } as CSSProperties)
                      : undefined
                  }
                  data-fx={form.card_fx.style}
                  aria-hidden
                >
                  {form.card_fx.style !== 'none' ? (
                    <ProductCardBodyFx fx={form.card_fx} />
                  ) : null}
                  <div className="pe-fx__stage-copy">
                    <p className="pe-fx__stage-name">{summaryName}</p>
                    <p className="pe-fx__stage-price tabular-nums">
                      {form.price.trim() ? `$${form.price}` : '—'}
                    </p>
                  </div>
                </div>

                <div className="pe-fx__styles" role="radiogroup" aria-label={t('النوع', 'Style')}>
                  {CARD_FX_STYLES.map((s) => {
                    const active = form.card_fx.style === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`pe-fx__style${active ? ' is-active' : ''} pe-fx__style--${s.id}`}
                        onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        card_fx: normalizeCardFx({
                          ...prev.card_fx,
                              style: s.id,
                          color: prev.card_fx.color ?? DEFAULT_CARD_FX_COLOR,
                          logoId: prev.card_fx.logoId ?? 'fortnite',
                        }),
                          }))
                        }
                      >
                        <span className="pe-fx__style-swatch" aria-hidden>
                          {s.id === 'matrix' ? (
                            <span className="pe-fx__swatch-matrix">
                              {Array.from({ length: 6 }, (_, i) => (
                                <span
                                  key={i}
                                  className="pe-fx__swatch-matrix-col"
                                  style={{ ['--i' as string]: i }}
                                >
                                  <span className="pe-fx__swatch-matrix-stack">01ｱｲｳｴｵ</span>
                                  <span className="pe-fx__swatch-matrix-stack" aria-hidden>
                                    01ｱｲｳｴｵ
                                  </span>
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                        <span className="pe-fx__style-label">{t(s.labelAr, s.labelEn)}</span>
                      </button>
                    );
                  })}
                </div>

                {form.card_fx.style === 'matrix' ? (
                  <div className="pe-fx__matrix-opts space-y-3">
                    <div
                      className="pe-fx__matrix-dir"
                      role="radiogroup"
                      aria-label={t('نوع الماتريكس', 'Matrix type')}
                    >
                      <span className="pe-field__label">{t('نوع الماتريكس', 'Matrix type')}</span>
                      <div className="pe-fx__matrix-dir-btns">
                        {(
                          [
                            {
                              id: 1 as const,
                              ar: '١ — خفيف',
                              en: '1 — Light',
                            },
                            {
                              id: 2 as const,
                              ar: '٢ — غني',
                              en: '2 — Rich',
                            },
                            {
                              id: 3 as const,
                              ar: '٣ — جليتش',
                              en: '3 — Glitch',
                            },
                          ] as const
                        ).map((opt) => {
                          const active = (form.card_fx.matrixType ?? 1) === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              className={`pe-fx__matrix-dir-btn${active ? ' is-active' : ''}`}
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  card_fx: normalizeCardFx({
                                    ...prev.card_fx,
                                    matrixType: opt.id,
                                    ...(opt.id === 3
                                      ? {
                                          color2: prev.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2,
                                          color3: prev.card_fx.color3 ?? DEFAULT_CARD_FX_COLOR3,
                                        }
                                      : {}),
                                  }),
                                }))
                              }
                            >
                              {t(opt.ar, opt.en)}
                            </button>
                          );
                        })}
                      </div>
                      <span className="block text-xs text-base-content/55 mt-1 text-pretty">
                        {(form.card_fx.matrixType ?? 1) === 3
                          ? t(
                              'النوع ٣ شبكة حروف متغيرة (Letter Glitch) — متوسط الاستهلاك.',
                              'Type 3 is a shifting letter grid (Letter Glitch) — moderate CPU.',
                            )
                          : (form.card_fx.matrixType ?? 1) === 2
                            ? t(
                                'النوع ٢ أجمل وأكثر استهلاكاً للمعالج — استخدمه بحذر.',
                                'Type 2 looks richer and uses more CPU — use sparingly.',
                              )
                            : t(
                                'النوع ١ أخف على الجهاز (موصى به للمتجر).',
                                'Type 1 is lighter on devices (recommended for the store).',
                              )}
                      </span>
                    </div>
                    {(form.card_fx.matrixType ?? 1) === 3 ? (
                      <>
                        <label className="pe-field pe-fx__matrix-amount">
                          <span className="pe-field__label flex items-center justify-between gap-2">
                            <span>{t('سرعة الجليتش', 'Glitch speed')}</span>
                            <span className="font-mono tabular-nums text-base-content/70" dir="ltr">
                              {form.card_fx.matrixGlitchSpeed ?? DEFAULT_GLITCH_SPEED}ms
                            </span>
                          </span>
                          <input
                            type="range"
                            className="range range-primary range-sm w-full"
                            min={GLITCH_SPEED_MIN}
                            max={GLITCH_SPEED_MAX}
                            step={5}
                            value={form.card_fx.matrixGlitchSpeed ?? DEFAULT_GLITCH_SPEED}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixGlitchSpeed: Number(e.target.value),
                                }),
                              }))
                            }
                            aria-label={t('سرعة الجليتش بالميلي ثانية', 'Glitch speed in milliseconds')}
                          />
                          <span className="flex justify-between text-[0.7rem] text-base-content/50 tabular-nums mt-1" dir="ltr">
                            <span>{t('أسرع', 'Faster')}</span>
                            <span>{t('أبطأ', 'Slower')}</span>
                          </span>
                        </label>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold tracking-tight">
                              {t('انتقال لوني سلس', 'Smooth colors')}
                            </span>
                            <span className="block text-xs text-base-content/60 mt-0.5 text-pretty">
                              {t(
                                'مزج الألوان عند تغيّر الحروف بدل القفز الفوري.',
                                'Blend colors when letters change instead of hard snaps.',
                              )}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary shrink-0"
                            checked={form.card_fx.matrixGlitchSmooth !== false}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixGlitchSmooth: e.target.checked,
                                }),
                              }))
                            }
                            aria-label={t('انتقال لوني سلس', 'Smooth colors')}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <span className="text-sm font-semibold tracking-tight">
                            {t('تظليل الحواف', 'Outer vignette')}
                          </span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary shrink-0"
                            checked={form.card_fx.matrixOuterVignette !== false}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixOuterVignette: e.target.checked,
                                }),
                              }))
                            }
                            aria-label={t('تظليل الحواف', 'Outer vignette')}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <span className="text-sm font-semibold tracking-tight">
                            {t('تظليل الوسط', 'Center vignette')}
                          </span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary shrink-0"
                            checked={Boolean(form.card_fx.matrixCenterVignette)}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixCenterVignette: e.target.checked,
                                }),
                              }))
                            }
                            aria-label={t('تظليل الوسط', 'Center vignette')}
                          />
                        </label>
                        <label className="pe-field">
                          <span className="pe-field__label">{t('الحروف', 'Characters')}</span>
                          <input
                            type="text"
                            className="input input-bordered input-sm w-full font-mono"
                            dir="ltr"
                            value={form.card_fx.matrixGlitchChars ?? DEFAULT_GLITCH_CHARS}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixGlitchChars: e.target.value,
                                }),
                              }))
                            }
                            aria-label={t('مجموعة حروف الجليتش', 'Glitch character set')}
                          />
                          <span className="block text-xs text-base-content/55 mt-1 text-pretty">
                            {t(
                              'الحروف والرموز التي تظهر في الشبكة.',
                              'Letters and symbols that appear in the grid.',
                            )}
                          </span>
                        </label>
                      </>
                    ) : (
                      <>
                        <div
                          className="pe-fx__matrix-dir"
                          role="radiogroup"
                          aria-label={t('اتجاه المطر', 'Rain direction')}
                        >
                          <span className="pe-field__label">{t('اتجاه المطر', 'Rain direction')}</span>
                          <div className="pe-fx__matrix-dir-btns">
                            {(
                              [
                                { id: 'down' as const, ar: 'للأسفل', en: 'Down' },
                                { id: 'up' as const, ar: 'للأعلى', en: 'Up' },
                              ] as const
                            ).map((opt) => {
                              const active = (form.card_fx.matrixDir ?? 'down') === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  className={`pe-fx__matrix-dir-btn${active ? ' is-active' : ''}`}
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      card_fx: normalizeCardFx({
                                        ...prev.card_fx,
                                        matrixDir: opt.id,
                                      }),
                                    }))
                                  }
                                >
                                  {t(opt.ar, opt.en)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <label className="pe-field pe-fx__matrix-amount">
                          <span className="pe-field__label flex items-center justify-between gap-2">
                            <span>{t('كثافة المطر', 'Rain amount')}</span>
                            <span className="font-mono tabular-nums text-base-content/70" dir="ltr">
                              {form.card_fx.matrixCols ?? DEFAULT_MATRIX_COLS}
                            </span>
                          </span>
                          <input
                            type="range"
                            className="range range-primary range-sm w-full"
                            min={MATRIX_COLS_MIN}
                            max={MATRIX_COLS_MAX}
                            step={1}
                            value={form.card_fx.matrixCols ?? DEFAULT_MATRIX_COLS}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixCols: Number(e.target.value),
                                }),
                              }))
                            }
                            aria-label={t('عدد أعمدة المطر', 'Number of rain columns')}
                          />
                          <span className="flex justify-between text-[0.7rem] text-base-content/50 tabular-nums mt-1" dir="ltr">
                            <span>{MATRIX_COLS_MIN}</span>
                            <span>{MATRIX_COLS_MAX}</span>
                          </span>
                        </label>
                        <label className="pe-field pe-fx__matrix-amount">
                          <span className="pe-field__label flex items-center justify-between gap-2">
                            <span>{t('كمية الحروف', 'Letter amount')}</span>
                            <span className="font-mono tabular-nums text-base-content/70" dir="ltr">
                              {form.card_fx.matrixLetters ?? DEFAULT_MATRIX_LETTERS}
                            </span>
                          </span>
                          <input
                            type="range"
                            className="range range-primary range-sm w-full"
                            min={MATRIX_LETTERS_MIN}
                            max={MATRIX_LETTERS_MAX}
                            step={1}
                            value={form.card_fx.matrixLetters ?? DEFAULT_MATRIX_LETTERS}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixLetters: Number(e.target.value),
                                }),
                              }))
                            }
                            aria-label={t('عدد الحروف في كل عمود', 'Letters per rain stream')}
                          />
                          <span className="flex justify-between text-[0.7rem] text-base-content/50 tabular-nums mt-1" dir="ltr">
                            <span>{MATRIX_LETTERS_MIN}</span>
                            <span>{MATRIX_LETTERS_MAX}</span>
                          </span>
                        </label>
                        <label className="pe-field pe-fx__matrix-amount">
                          <span className="pe-field__label flex items-center justify-between gap-2">
                            <span>{t('السرعة', 'Speed')}</span>
                            <span className="font-mono tabular-nums text-base-content/70" dir="ltr">
                              {form.card_fx.matrixSpeed ?? DEFAULT_MATRIX_SPEED}
                            </span>
                          </span>
                          <input
                            type="range"
                            className="range range-primary range-sm w-full"
                            min={MATRIX_SPEED_MIN}
                            max={MATRIX_SPEED_MAX}
                            step={1}
                            value={form.card_fx.matrixSpeed ?? DEFAULT_MATRIX_SPEED}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixSpeed: Number(e.target.value),
                                }),
                              }))
                            }
                            aria-label={t('سرعة مطر الماتريكس', 'Matrix rain speed')}
                          />
                          <span className="flex justify-between text-[0.7rem] text-base-content/50 tabular-nums mt-1" dir="ltr">
                            <span>{MATRIX_SPEED_MIN}</span>
                            <span>{MATRIX_SPEED_MAX}</span>
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                ) : null}

                {CARD_FX_STYLES.find((s) => s.id === form.card_fx.style)?.needsColor ? (
                  <div className="pe-fx__colors space-y-3">
                    <label className="pe-field pe-fx__color">
                      <span className="pe-field__label">
                        {(form.card_fx.style === 'matrix' && (form.card_fx.matrixType ?? 1) === 3)
                          ? t('لون الجليتش ١', 'Glitch color 1')
                          : t('لون التأثير', 'Effect color')}
                      </span>
                      <div className="pe-fx__color-row">
                        <input
                          type="color"
                          className="pe-fx__color-input"
                          value={form.card_fx.color ?? DEFAULT_CARD_FX_COLOR}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              card_fx: normalizeCardFx({ ...prev.card_fx, color: e.target.value }),
                            }))
                          }
                          aria-label={t('لون التأثير', 'Effect color')}
                        />
                        <span className="pe-fx__color-hex font-mono tabular-nums" dir="ltr">
                          {(form.card_fx.color ?? DEFAULT_CARD_FX_COLOR).toUpperCase()}
                        </span>
                      </div>
                    </label>
                    {form.card_fx.style === 'matrix' && (form.card_fx.matrixType ?? 1) === 3 ? (
                      <>
                        <label className="pe-field pe-fx__color">
                          <span className="pe-field__label">{t('لون الجليتش ٢', 'Glitch color 2')}</span>
                          <div className="pe-fx__color-row">
                            <input
                              type="color"
                              className="pe-fx__color-input"
                              value={form.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  card_fx: normalizeCardFx({
                                    ...prev.card_fx,
                                    matrixType: 3,
                                    color2: e.target.value,
                                  }),
                                }))
                              }
                              aria-label={t('لون الجليتش ٢', 'Glitch color 2')}
                            />
                            <span className="pe-fx__color-hex font-mono tabular-nums" dir="ltr">
                              {(form.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2).toUpperCase()}
                            </span>
                          </div>
                        </label>
                        <label className="pe-field pe-fx__color">
                          <span className="pe-field__label">{t('لون الجليتش ٣', 'Glitch color 3')}</span>
                          <div className="pe-fx__color-row">
                            <input
                              type="color"
                              className="pe-fx__color-input"
                              value={form.card_fx.color3 ?? DEFAULT_CARD_FX_COLOR3}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  card_fx: normalizeCardFx({
                                    ...prev.card_fx,
                                    matrixType: 3,
                                    color3: e.target.value,
                                  }),
                                }))
                              }
                              aria-label={t('لون الجليتش ٣', 'Glitch color 3')}
                            />
                            <span className="pe-fx__color-hex font-mono tabular-nums" dir="ltr">
                              {(form.card_fx.color3 ?? DEFAULT_CARD_FX_COLOR3).toUpperCase()}
                            </span>
                          </div>
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <span className="text-sm font-semibold tracking-tight">
                            {t('تدرج لوني', 'Gradient color')}
                          </span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary shrink-0"
                            checked={Boolean(form.card_fx.gradient)}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  gradient: e.target.checked,
                                  color2: prev.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2,
                                }),
                              }))
                            }
                            aria-label={t('تدرج لوني للتأثير', 'Gradient color for effect')}
                          />
                        </label>
                        {form.card_fx.gradient ? (
                          <>
                            <label className="pe-field pe-fx__color">
                              <span className="pe-field__label">{t('لون التدرج', 'Gradient end')}</span>
                              <div className="pe-fx__color-row">
                                <input
                                  type="color"
                                  className="pe-fx__color-input"
                                  value={form.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2}
                                  onChange={(e) =>
                                    setForm((prev) => ({
                                      ...prev,
                                      card_fx: normalizeCardFx({
                                        ...prev.card_fx,
                                        gradient: true,
                                        color2: e.target.value,
                                      }),
                                    }))
                                  }
                                  aria-label={t('لون التدرج', 'Gradient end')}
                                />
                                <span className="pe-fx__color-hex font-mono tabular-nums" dir="ltr">
                                  {(form.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2).toUpperCase()}
                                </span>
                              </div>
                            </label>
                            <label className="flex items-center justify-between gap-3 cursor-pointer">
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold tracking-tight">
                                  {t('تحريك التدرج', 'Shift gradient')}
                                </span>
                                <span className="block text-xs text-base-content/60 mt-0.5 text-pretty">
                                  {form.card_fx.style === 'matrix'
                                    ? t(
                                        'ألوان التدرج تنتقل بسلاسة بين حروف المطر.',
                                        'Gradient colors flow smoothly through the rain letters.',
                                      )
                                    : t(
                                        'الألوان تتحرك بسلاسة يمين ويسار.',
                                        'Colors drift smoothly left and right.',
                                      )}
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                className="toggle toggle-primary shrink-0"
                                checked={Boolean(form.card_fx.gradientShift)}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    card_fx: normalizeCardFx({
                                      ...prev.card_fx,
                                      gradient: true,
                                      gradientShift: e.target.checked,
                                    }),
                                  }))
                                }
                                aria-label={
                                  form.card_fx.style === 'matrix'
                                    ? t(
                                        'تحريك ألوان التدرج عبر حروف المطر',
                                        'Shift gradient colors through rain letters',
                                      )
                                    : t('تحريك التدرج يمين ويسار', 'Shift gradient left and right')
                                }
                              />
                            </label>
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                {form.card_fx.style === 'logo' ? (
                  <div className="pe-fx__logos">
                    <p className="pe-field__label">{t('شعار اللعبة', 'Game logo')}</p>
                    <div className="pe-fx__logo-grid" role="radiogroup" aria-label={t('شعار اللعبة', 'Game logo')}>
                      {ATMOSPHERE_LOGO_CATALOG.map((entry) => {
                        const active = (form.card_fx.logoId ?? 'fortnite') === entry.id;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={`pe-fx__logo${active ? ' is-active' : ''}`}
                            title={t(entry.labelAr, entry.labelEn)}
                            onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                                card_fx: normalizeCardFx({ ...prev.card_fx, logoId: entry.id }),
                        }))
                      }
                    >
                        <img
                          src={entry.src}
                          alt=""
                              className={atmosphereLogoToneClass(entry)}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </details>

            {productAtmOn && (
              <details id="pe-atm" className="pe-atm group">
                <summary className="pe-atm__summary">
                  <span className="pe-atm__summary-main">
                    <span className="pe-atm__icon" aria-hidden>
                      <Orbit size={14} strokeWidth={2.25} />
                    </span>
                    <span className="pe-atm__title">{t('أجواء صفحة المنتج', 'Product page atmosphere')}</span>
                  </span>
                  <span className="pe-atm__summary-meta">
                    {form.atmosphere_logo_ids.length
                    ? t(`${form.atmosphere_logo_ids.length} أيقونة`, `${form.atmosphere_logo_ids.length} icon(s)`)
                      : t('افتراضي الموقع', 'Site default')}
                  </span>
                </summary>
                <div className="pe-atm__body">
                  <div className="pe-atm__toolbar">
                    <p className="pe-atm__hint text-pretty">
                      {t(
                        'أيقونات الأجواء خلف صفحة المنتج. فارغ = افتراضي الموقع.',
                        'Atmosphere icons behind the product page. Empty = site default.',
                      )}
                    </p>
                    <button
                      type="button"
                      className={`pe-atm__reset${form.atmosphere_logo_ids.length === 0 ? ' is-active' : ''}`}
                      disabled={form.atmosphere_logo_ids.length === 0}
                      onClick={() => setForm((prev) => ({ ...prev, atmosphere_logo_ids: [] }))}
                    >
                      {t('افتراضي الموقع', 'Site default')}
                    </button>
                  </div>

                  <div
                    className="pe-atm__stage"
                    data-mode={form.atmosphere_logo_ids.length ? 'custom' : 'default'}
                    aria-hidden
                  >
                    <div className="pe-atm__stage-glow" />
                    {form.atmosphere_logo_ids.length === 0 ? (
                      <p className="pe-atm__stage-empty">
                        {t('يستخدم أيقونات الموقع العامة', 'Uses the site-wide icon set')}
                      </p>
                    ) : (
                      <div className="pe-atm__stage-orbit">
                        {form.atmosphere_logo_ids.map((id, i) => {
                          const entry = ATMOSPHERE_LOGO_CATALOG.find((e) => e.id === id);
                          if (!entry) return null;
                          return (
                            <img
                              key={id}
                              src={entry.src}
                              alt=""
                              className={`pe-atm__stage-mark ${atmosphereLogoToneClass(entry)}`}
                              style={{ ['--i']: i } as CSSProperties}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div
                    className="pe-atm__grid"
                    role="group"
                    aria-label={t('أيقونات الأجواء', 'Atmosphere icons')}
                  >
                    {ATMOSPHERE_LOGO_CATALOG.map((entry) => {
                      const on = form.atmosphere_logo_ids.includes(entry.id);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          className={`pe-atm__tile${on ? ' is-active' : ''}`}
                          onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                atmosphere_logo_ids: on
                                  ? prev.atmosphere_logo_ids.filter((id) => id !== entry.id)
                                  : [...prev.atmosphere_logo_ids, entry.id],
                              }));
                            }}
                        >
                          <span className="pe-atm__tile-mark" aria-hidden>
                            <img
                              src={entry.src}
                              alt=""
                              className={atmosphereLogoToneClass(entry)}
                            />
                          </span>
                          <span className="pe-atm__tile-label">{t(entry.labelAr, entry.labelEn)}</span>
                          {on ? <span className="pe-atm__tile-check" aria-hidden>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </details>
            )}

            <details id="pe-seller" className="pe-seller group">
              <summary className="pe-seller__summary">
                <span className="pe-seller__summary-main">
                  <span className="pe-seller__icon" aria-hidden>
                    <UserRound size={14} strokeWidth={2.25} />
                  </span>
                  <span className="pe-seller__title">{t('البائع', 'Seller')}</span>
                </span>
                <span className="pe-seller__summary-meta">
                  {form.seller_id
                    ? sellerDisplayName(
                        sellers.find((s) => s.id === form.seller_id) ?? {
                          id: form.seller_id,
                          full_name: null,
                          email: null,
                          role: 'seller',
                        },
                      )
                    : t('بدون بائع', 'No seller')}
                </span>
              </summary>
              <div className="pe-seller__body">
                {(() => {
                  const picked =
                form.seller_id
                      ? sellers.find((s) => s.id === form.seller_id) ?? {
                          id: form.seller_id,
                          full_name: null,
                          email: null,
                          role: 'seller' as Role,
                        }
                      : null;
                  const showOnPage = isSeller
                    ? true
                    : Boolean(form.seller_id) && form.show_seller_name;
                  const showToggleLocked = isSeller || (canAssignSeller && !form.seller_id);

                  return (
                    <>
                      <div
                        className="pe-seller__stage"
                        data-mode={picked ? 'picked' : 'empty'}
                        aria-hidden
                      >
                        {picked ? (
                          <>
                            <UserAvatar
                              name={picked.full_name}
                              email={picked.email}
                              sizeClass="w-11 h-11"
                              className="pe-seller__stage-avatar"
                            />
                            <div className="pe-seller__stage-copy">
                              <p className="pe-seller__stage-name">{sellerDisplayName(picked)}</p>
                              <p className="pe-seller__stage-role">{roleLabel(picked.role, lang)}</p>
                            </div>
                            {showOnPage ? (
                              <span className="pe-seller__stage-badge">
                                {t('ظاهر في الصفحة', 'Shown on page')}
                    </span>
                            ) : (
                              <span className="pe-seller__stage-badge pe-seller__stage-badge--muted">
                                {t('مخفي', 'Hidden')}
                              </span>
                            )}
                          </>
                        ) : (
                          <p className="pe-seller__stage-empty">
                            {t('لا بائع — صفحة المنتج بلا إسناد', 'No seller — product page unattributed')}
                          </p>
                        )}
                      </div>

                      {canAssignSeller ? (
                        <div className="pe-seller__pick">
                          <div className="pe-seller__tools">
                            <label className="pe-seller__search">
                              <Search size={14} className="pe-seller__search-icon" aria-hidden />
                        <input
                          value={sellerQuery}
                          onChange={(e) => setSellerQuery(e.target.value)}
                          placeholder={t('ابحث بالاسم أو البريد…', 'Search name or email…')}
                          aria-label={t('بحث عن مستخدم', 'Search users')}
                        />
                              {sellerQuery ? (
                          <button
                            type="button"
                                  className="pe-seller__search-clear"
                            onClick={() => setSellerQuery('')}
                            aria-label={t('مسح البحث', 'Clear search')}
                          >
                            <X size={12} />
                          </button>
                              ) : null}
                      </label>
                      <select
                        value={sellerRoleFilter}
                        onChange={(e) => setSellerRoleFilter(e.target.value)}
                              className="pe-seller__select"
                        aria-label={t('تصفية حسب الرتبة', 'Filter by role')}
                      >
                        <option value="">{t('كل الرتب', 'All roles')}</option>
                        {ROLE_INFO.map((r) => (
                          <option key={r.id} value={r.id}>
                            {lang === 'ar' ? r.labelAr : r.labelEn}
                          </option>
                        ))}
                      </select>
                      <select
                        value={sellerSort}
                        onChange={(e) => setSellerSort(e.target.value as SellerSort)}
                              className="pe-seller__select"
                        aria-label={t('ترتيب القائمة', 'Sort list')}
                      >
                        <option value="name">{t('ترتيب: الاسم', 'Sort: Name')}</option>
                        <option value="role">{t('ترتيب: الرتبة', 'Sort: Role')}</option>
                      </select>
                    </div>

                    <div
                            className="pe-seller__list"
                      role="listbox"
                      aria-label={t('اختر بائع المنتج', 'Choose product seller')}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={!form.seller_id}
                        onClick={() => pickSeller('')}
                              className={`pe-seller__row${!form.seller_id ? ' is-active' : ''}`}
                      >
                              <span className="pe-seller__row-avatar pe-seller__row-avatar--empty" aria-hidden>
                                —
                              </span>
                              <span className="pe-seller__row-name">{t('بدون بائع', 'No seller')}</span>
                      </button>
                      {sellerOptions.map((s) => {
                        const selected = form.seller_id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => pickSeller(s.id)}
                                  className={`pe-seller__row${selected ? ' is-active' : ''}`}
                                >
                                  <UserAvatar
                                    name={s.full_name}
                                    email={s.email}
                                    sizeClass="w-8 h-8"
                                    className="pe-seller__row-avatar"
                                  />
                                  <span className="pe-seller__row-copy">
                                    <span className="pe-seller__row-name">{sellerDisplayName(s)}</span>
                                    {s.email ? (
                                      <span className="pe-seller__row-email" dir="ltr">
                                        {s.email}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="pe-seller__row-role" data-role={s.role}>
                              {roleLabel(s.role, lang)}
                            </span>
                          </button>
                        );
                      })}
                            {sellerOptions.length === 0 ? (
                              <p className="pe-seller__empty">{t('لا نتائج', 'No matches')}</p>
                            ) : null}
                    </div>
                  </div>
                ) : (
                        <p className="pe-seller__locked text-pretty">
                    {t('أنت البائع لهذا المنتج.', 'You are the seller of this product.')}
                  </p>
                )}

                      <button
                        type="button"
                        role="switch"
                        aria-checked={showOnPage}
                        disabled={showToggleLocked}
                        className={`pe-seller__switch${showOnPage ? ' is-on' : ''}${showToggleLocked ? ' is-locked' : ''}`}
                        onClick={() => {
                          if (showToggleLocked) return;
                          setForm((prev) => ({ ...prev, show_seller_name: !prev.show_seller_name }));
                        }}
                      >
                        <span className="pe-seller__switch-track" aria-hidden>
                          <span className="pe-seller__switch-knob" />
                        </span>
                        <span className="pe-seller__switch-copy">
                          <span className="pe-seller__switch-label">
                      {t('إظهار ملف البائع في صفحة المنتج', 'Show seller profile on product page')}
                    </span>
                          <span className="pe-seller__switch-hint">
                      {isSeller
                        ? t(
                            'البائعون لا يمكنهم إخفاء هويتهم — يمكن للمالك تغيير ذلك.',
                            'Sellers cannot hide their identity — the owner can change this.',
                          )
                        : t(
                            'التعيين للعرض فقط — لا يغيّر رتبة المستخدم.',
                            'Attribution only — does not change the user’s role.',
                          )}
                    </span>
                  </span>
                      </button>
                    </>
                  );
                })()}
              </div>
            </details>

            <details id="pe-req" className="pe-req group">
              <summary className="pe-req__summary">
                <span className="pe-req__summary-main">
                  <span className="pe-req__icon" aria-hidden>
                    <ListChecks size={14} strokeWidth={2.25} />
                  </span>
                  <span className="pe-req__title">{t('المتطلبات', 'Requirements')}</span>
                </span>
                <span className="pe-req__summary-meta">
                  {form.requirementFields.length
                  ? t(`${form.requirementFields.length} حقل`, `${form.requirementFields.length} field(s)`)
                    : t('اختياري', 'Optional')}
                </span>
              </summary>
              <div className="pe-req__body">
                <p className="pe-req__hint text-pretty">
                  {t(
                    'تظهر للزوار في صفحة المنتج — مثال: نظام التشغيل → Windows, Linux, MacOS.',
                    'Shown on the product page — e.g. Operating System → Windows, Linux, MacOS.',
                  )}
                </p>

                <div
                  className="pe-req__stage"
                  data-mode={form.requirementFields.length ? 'filled' : 'empty'}
                  aria-hidden
                >
                {form.requirementFields.length === 0 ? (
                    <p className="pe-req__stage-empty">
                      {t('معاينة فارغة — أضف صفوفاً أدناه', 'Empty preview — add rows below')}
                  </p>
                ) : (
                    <dl className="pe-req__stage-list">
                    {form.requirementFields.map((f) => (
                        <div key={f.id} className="pe-req__stage-row">
                          <dt>{f.key.trim() || t('تسمية', 'Label')}</dt>
                          <dd>{f.value.trim() || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                {form.requirementFields.length === 0 ? (
                  <div className="pe-req__blank">
                    <p className="pe-req__blank-copy">
                      {t('لا متطلبات بعد — أضف عند الحاجة.', 'No requirements yet — add if needed.')}
                    </p>
                    <button type="button" className="pe-req__add" onClick={addRequirementField}>
                      <Plus size={14} strokeWidth={2.25} aria-hidden />
                      {t('إضافة متطلب', 'Add requirement')}
                    </button>
                  </div>
                ) : (
                  <>
                    <ul className="pe-req__list">
                      {form.requirementFields.map((f, i) => (
                        <li key={f.id} className="pe-req__item">
                          <span className="pe-req__index" aria-hidden>
                            {i + 1}
                          </span>
                          <div className="pe-req__fields">
                            <label className="pe-req__field pe-req__field--key">
                              <span className="pe-req__field-label">{t('التسمية', 'Label')}</span>
                        <input
                          value={f.key}
                          onChange={(e) => setRequirementField(f.id, { key: e.target.value })}
                                placeholder={t('نظام التشغيل', 'Operating System')}
                          aria-label={t('تسمية المتطلب', 'Requirement label')}
                        />
                            </label>
                            <span className="pe-req__arrow" aria-hidden>
                              →
                            </span>
                            <label className="pe-req__field pe-req__field--val">
                              <span className="pe-req__field-label">{t('القيمة', 'Value')}</span>
                        <input
                          value={f.value}
                          onChange={(e) => setRequirementField(f.id, { value: e.target.value })}
                                placeholder={t('Windows, Linux, MacOS', 'Windows, Linux, MacOS')}
                          aria-label={t('قيمة المتطلب', 'Requirement value')}
                        />
                            </label>
                          </div>
                        <button
                          type="button"
                            className="pe-req__remove"
                          onClick={() => removeRequirementField(f.id)}
                          aria-label={t('حذف المتطلب', 'Remove requirement')}
                          title={t('حذف المتطلب', 'Remove requirement')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                    <button type="button" className="pe-req__add" onClick={addRequirementField}>
                      <Plus size={14} strokeWidth={2.25} aria-hidden />
                  {t('إضافة متطلب', 'Add requirement')}
                </button>
                  </>
                )}
              </div>
            </details>

            <details id="pe-author" className="pe-req group">
              <summary className="pe-req__summary">
                <span className="pe-req__summary-main">
                  <span className="pe-req__icon" aria-hidden>
                    <UserPen size={14} strokeWidth={2.25} />
                  </span>
                  <span className="pe-req__title">{t('أضيف بواسطة', 'Added by')}</span>
                </span>
                <span className="pe-req__summary-meta">
                  {(() => {
                    if (!form.created_by) return t('مشترك', 'Shared');
                    if (form.created_by === user?.id) {
                      return profile?.full_name?.trim() || t('أنا', 'Me');
                    }
                    const hit =
                      staffAuthors.find((s) => s.id === form.created_by) ??
                      sellers.find((s) => s.id === form.created_by);
                    return hit ? sellerDisplayName(hit) : '…';
                  })()}
                </span>
              </summary>
              <div className="pe-req__body space-y-3">
                {(() => {
                  const canEditAuthor =
                    !editing
                      ? Boolean(user?.id) && isStaffAuthor
                      : canEditProductAuthor({
                          userId: user?.id,
                          role: profileRole,
                          createdBy: editing.created_by,
                          addedBy: editing.added_by,
                        });
                  const meLabel =
                    profileRole === 'owner'
                      ? t('أنا (المالك)', 'Me (owner)')
                      : profileRole === 'admin'
                        ? t('أنا (مدير)', 'Me (admin)')
                        : t('أنا (مشرف)', 'Me (moderator)');
                  return (
                    <>
                      <p className="pe-req__hint text-pretty">
                        {form.created_by
                          ? t(
                              'قفل الحذف يتبع هذا الاسم. غيره لا يغيّر «أضيف بواسطة».',
                              'Delete lock follows this name. Others cannot change Added by.',
                            )
                          : t(
                              'مشترك: أي مالك/مدير/مشرف يحذف. تغيير «أضيف بواسطة» لمن أضاف المنتج فقط.',
                              'Shared: any owner/admin/mod can delete. Only the adder can change Added by.',
                            )}
                      </p>
                      {canEditAuthor ? (
                        <label className="form-control w-full max-w-md">
                          <select
                            className="select select-bordered select-sm"
                            value={form.created_by}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, created_by: e.target.value }))
                            }
                            aria-label={t('مؤلّف المنتج', 'Product author')}
                          >
                            <option value="">
                              {t('بدون — مشترك للفريق', 'None — shared for the team')}
                            </option>
                            {user?.id ? (
                              <option value={user.id}>
                                {meLabel}
                                {profile?.full_name ? ` — ${profile.full_name}` : ''}
                              </option>
                            ) : null}
                            {isOwner
                              ? staffAuthors
                                  .filter((s) => s.id !== user?.id)
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {sellerDisplayName(s)} · {roleLabel(s.role, lang)}
                                    </option>
                                  ))
                              : null}
                          </select>
                        </label>
                      ) : (
                        <p className="text-sm">
                          {form.created_by
                            ? (() => {
                                const hit =
                                  staffAuthors.find((s) => s.id === form.created_by) ??
                                  sellers.find((s) => s.id === form.created_by) ??
                                  (form.created_by === user?.id
                                    ? {
                                        id: form.created_by,
                                        full_name: profile?.full_name ?? null,
                                        email: profile?.email ?? null,
                                        role: (profileRole || 'moderator') as Role,
                                      }
                                    : null);
                                return hit ? sellerDisplayName(hit) : t('أنت', 'You');
                              })()
                            : t('مشترك — بلا مؤلّف', 'Shared — no author')}
                          <span className="block text-xs text-base-content/55 mt-1">
                            {t(
                              'لا يمكنك تغيير الإسناد',
                              'You cannot change this attribution',
                            )}
                          </span>
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </details>

            <details id="pe-media" className="pe-media group">
              <summary className="pe-media__summary">
                <span className="pe-media__summary-main">
                  <span className="pe-media__icon" aria-hidden>
                    <Images size={14} strokeWidth={2.25} />
                  </span>
                  <span className="pe-media__title">{t('الوسائط', 'Media')}</span>
                </span>
                <span className="pe-media__summary-meta">
                  {hasMedia ? t('وسائط مرفوعة', 'Media attached') : t('اختياري', 'Optional')}
                </span>
              </summary>
              <div className="pe-media__body">
                <section className="pe-media__zone pe-media__zone--showcase">
                  <header className="pe-media__zone-head">
                    <div>
                      <h3 className="pe-media__zone-title">{t('عرض المنتج', 'Showcase')}</h3>
                      <p className="pe-media__zone-hint text-pretty">
                        {t(
                          'حتى 3 فيديوهات (مع/بدون إعلانات) + معرض صور (حتى 8). منفصل عن صورة البطاقة.',
                          'Up to 3 videos (with/without ads) + gallery (max 8). Separate from the card image.',
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                      role="switch"
                      aria-checked={form.video_enabled}
                      className={`pe-media__switch pe-media__switch--video-enabled${
                        form.video_enabled ? ' is-on' : ''
                      }`}
                      onClick={() =>
                        setForm((p) => ({ ...p, video_enabled: !p.video_enabled }))
                      }
                    >
                      <span className="pe-media__switch-track" aria-hidden>
                        <span className="pe-media__switch-knob" />
                      </span>
                      <span className="pe-media__switch-copy">
                        <span className="pe-media__switch-label">
                          {t('إظهار فيديو العرض', 'Show showcase video')}
                        </span>
                        <span className="pe-media__switch-hint text-pretty">
                          {t(
                            'مطفأ = لا معاينة ولا متجر — التضمين ما يتصل بالخوادم.',
                            'Off = no preview and hidden in store — embed does not contact hosts.',
                          )}
                        </span>
                      </span>
                    </button>
                  </header>

                  <div className="pe-media__video">
                    <div
                      className={`pe-media__video-stage${
                        form.video_enabled && form.video_url ? ' has-media' : ''
                      }`}
                    >
                      {form.video_enabled && form.video_url ? (
                        <ProductVideoPlayer
                          src={form.video_url}
                          poster={form.thumbnail_url || undefined}
                          config={plyrConfig}
                          preview
                          autoplay={false}
                          volume={form.video_volume}
                          className="pe-media__video-player"
                        />
                      ) : form.video_url ? (
                        <div className="pe-media__video-paused">
                          {form.thumbnail_url ? (
                            <ProductMedia
                              src={form.thumbnail_url}
                              alt=""
                              className="pe-media__video-paused-poster"
                            />
                          ) : null}
                          <p className="pe-media__video-paused-msg text-pretty">
                            {t(
                              'المعاينة متوقفة — لم يُحمّل رابط التضمين.',
                              'Preview paused — embed URL is not loaded.',
                      )}
                    </p>
                        </div>
                      ) : (
                        <span className="pe-media__video-empty" aria-hidden>
                          <ImagePlus size={22} />
                        </span>
                      )}
                    </div>
                    <div className="pe-media__video-side">
                      <p className="pe-media__slot-label">{t('فيديو العرض', 'Showcase video')}</p>
                      <div className="pe-media__actions">
                        <label className="pe-media__btn pe-media__btn--primary">
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                        {t('رفع MP4', 'Upload MP4')}
                        <input
                          type="file"
                          accept={SHOWCASE_VIDEO_ACCEPT}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadShowcaseVideo(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                        {form.video_url || form.video_embeds.slots.some(slotHasUrl) ? (
                      <button
                        type="button"
                            onClick={clearAllEmbeds}
                            className="pe-media__btn pe-media__btn--danger"
                        >
                          <Trash2 size={12} /> {t('إزالة', 'Remove')}
                        </button>
                        ) : null}
                    </div>
                      <div className="pe-media__embed">
                        {([0, 1, 2] as const).map((slot) => {
                          const slotData = form.video_embeds.slots[slot];
                          const isDefaultSlot = form.video_embeds.defaultSlot === slot;
                          const slotFilled = slotHasUrl(slotData);
                          return (
                            <div key={slot} className="pe-media__embed-slot">
                              <div className="pe-media__embed-slot-head">
                                <span className="pe-media__embed-slot-title">
                                  {t(`تضمين ${slot + 1}`, `Embed ${slot + 1}`)}
                                </span>
                                <label className="pe-media__embed-default">
                      <input
                                    type="radio"
                                    name="pe-default-embed-slot"
                                    checked={isDefaultSlot}
                                    disabled={!slotFilled}
                                    title={
                                      slotFilled
                                        ? undefined
                                        : t(
                                            'أضف رابطاً أولاً',
                                            'Add a link first',
                                          )
                                    }
                                    onChange={() =>
                                      setForm((prev) => ({
                                        ...prev,
                                        ...syncVideoUrlFromEmbeds({
                                          ...prev.video_embeds,
                                          defaultSlot: slot,
                                        }),
                                      }))
                                    }
                                  />
                                  {t('افتراضي', 'Default')}
                                </label>
                    </div>
                              {(
                                [
                                  ['withAds', t('مع إعلانات (مثلاً)', 'With ads (For Example)')],
                                  ['withoutAds', t('بدون إعلانات (مثلاً)', 'Without ads (For Example)')],
                                ] as const
                              ).map(([variant, label]) => {
                                const key = `${slot}-${variant}`;
                                const saved = slotData[variant] ?? '';
                                const value = embedDrafts[key] ?? saved;
                                return (
                                  <div key={variant} className="pe-media__embed-variant">
                                    <div className="pe-media__embed-variant-meta">
                                      <span className="pe-media__embed-variant-label">{label}</span>
                                      {isDefaultSlot ? (
                                        <label className="pe-media__embed-default pe-media__embed-default--sm">
                          <input
                                            type="radio"
                                            name="pe-default-embed-variant"
                                            checked={form.video_embeds.defaultVariant === variant}
                                            disabled={!slotData[variant]}
                                            title={
                                              slotData[variant]
                                                ? undefined
                                                : t(
                                                    'أضف رابطاً أولاً',
                                                    'Add a link first',
                                                  )
                                            }
                                            onChange={() =>
                                              setForm((prev) => ({
                                                ...prev,
                                                ...syncVideoUrlFromEmbeds({
                                                  ...prev.video_embeds,
                                                  defaultVariant: variant,
                                                }),
                                              }))
                                            }
                                          />
                                          {t('افتراضي', 'Default')}
                        </label>
                                      ) : null}
                                    </div>
                                    <div className="pe-media__embed-row">
                                      <input
                                        type="text"
                                        inputMode="url"
                                        value={value}
                                        onChange={(e) =>
                                          setEmbedDrafts((d) => ({ ...d, [key]: e.target.value }))
                                        }
                                        onFocus={() => {
                                          if (!resourcesPickEnabled) return;
                                          if (value.trim()) return;
                                          void openMediaLibrary({
                                            kind: 'videoEmbed',
                                            slot,
                                            variant,
                                          });
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            applyEmbedDraft(slot, variant);
                                          }
                                        }}
                                        placeholder={t(
                                          'الصق رابط تضمين (YouTube / Vimeo / MP4 / /e/…)',
                                          'Paste embed URL (YouTube / Vimeo / MP4 / /e/…)',
                                        )}
                                        className="pe-media__embed-input"
                                      />
                                      <button
                                        type="button"
                                        className="pe-media__btn"
                                        onClick={() => applyEmbedDraft(slot, variant)}
                                      >
                                        {t('تضمين', 'Embed')}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          className={`pe-media__resources-link${
                            resourcesPickEnabled ? ' is-on' : ''
                          }`}
                          aria-pressed={resourcesPickEnabled}
                          onClick={() => {
                            if (resourcesPickEnabled) {
                              if (mediaPickTarget?.kind === 'videoEmbed') {
                                setMediaPickTarget(null);
                              }
                              setResourcesPickEnabled(false);
                              return;
                            }
                            setResourcesPickEnabled(true);
                          }}
                        >
                          <FolderOpen size={15} strokeWidth={2.25} aria-hidden />
                          {t('جلب من الموارد', 'Get from resources')}
                        </button>
                        <div className="pe-media__embed-labels">
                          <p className="pe-media__embed-labels-title">
                            {t('أسماء المشغّلات في المتجر', 'Storefront player names')}
                          </p>
                          <p className="pe-media__embed-labels-hint text-pretty">
                            {t(
                              'اختياري — اتركه فارغاً للافتراضي. يظهر تحت صور العرض على صفحة المنتج.',
                              'Optional — leave blank for defaults. Shows under showcase thumbs on the product page.',
                            )}
                          </p>
                          {(
                            [
                              ['title', t('عنوان المجموعة', 'Group title')],
                              ['player1', t('المشغّل 1 (مع إعلانات)', 'Player 1 (with ads)')],
                              ['player2', t('المشغّل 2 (بدون إعلانات)', 'Player 2 (without ads)')],
                            ] as const
                          ).map(([key, label]) => {
                            const pair = form.video_embeds.labels[key];
                            const defaults = DEFAULT_VIDEO_EMBED_LABELS[key];
                            return (
                              <div key={key} className="pe-media__embed-label-row">
                                <span className="pe-media__embed-label-name">{label}</span>
                                <input
                                  type="text"
                                  className="pe-media__embed-input"
                                  dir="ltr"
                                  maxLength={48}
                                  value={pair.en}
                                  placeholder={defaults.en}
                                  aria-label={`${label} (EN)`}
                                  onChange={(e) => {
                                    const en = e.target.value;
                                    setForm((prev) => {
                                      const labels: VideoEmbedLabels = {
                                        ...prev.video_embeds.labels,
                                        [key]: { ...prev.video_embeds.labels[key], en },
                                      };
                                      return {
                                        ...prev,
                                        ...syncVideoUrlFromEmbeds({
                                          ...prev.video_embeds,
                                          labels,
                                        }),
                                      };
                                    });
                                  }}
                                />
                                <input
                                  type="text"
                                  className="pe-media__embed-input"
                                  dir="rtl"
                                  maxLength={48}
                                  value={pair.ar}
                                  placeholder={defaults.ar}
                                  aria-label={`${label} (AR)`}
                                  onChange={(e) => {
                                    const ar = e.target.value;
                                    setForm((prev) => {
                                      const labels: VideoEmbedLabels = {
                                        ...prev.video_embeds.labels,
                                        [key]: { ...prev.video_embeds.labels[key], ar },
                                      };
                                      return {
                                        ...prev,
                                        ...syncVideoUrlFromEmbeds({
                                          ...prev.video_embeds,
                                          labels,
                                        }),
                                      };
                                    });
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {form.video_url ? (
                        <div className="pe-media__video-controls">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={form.video_autoplay}
                            className={`pe-media__switch${form.video_autoplay ? ' is-on' : ''}`}
                            onClick={() =>
                              setForm((p) => ({ ...p, video_autoplay: !p.video_autoplay }))
                            }
                          >
                            <span className="pe-media__switch-track" aria-hidden>
                              <span className="pe-media__switch-knob" />
                            </span>
                            <span>{t('تشغيل تلقائي', 'Autoplay')}</span>
                          </button>
                          <label className="pe-media__volume">
                            <span>
                            {t('الصوت', 'Volume')} {form.video_volume}%
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={form.video_volume}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                video_volume: clampVideoVolume(Number(e.target.value)),
                              }))
                            }
                          />
                        </label>
                      </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="pe-media__gallery">
                    <div className="pe-media__gallery-head">
                      <p className="pe-media__slot-label">{t('معرض الصور', 'Image gallery')}</p>
                      <span className="pe-media__count tabular-nums">
                        {form.galleryUrls.length}/{GALLERY_MAX}
                      </span>
                    </div>
                    {form.galleryUrls.length > 0 ? (
                      <ul className="pe-media__gallery-list">
                        {form.galleryUrls.map((url, i) => (
                          <li key={`${url}-${i}`} className="pe-media__gallery-item">
                            <div className="pe-media__gallery-thumb">
                              <ProductMedia src={url} alt="" className="w-full h-full object-cover" />
                              <span className="pe-media__gallery-num" aria-hidden>
                                {i + 1}
                              </span>
                            </div>
                            <div className="pe-media__gallery-tools">
                              <button
                                type="button"
                                className="pe-media__icon-btn"
                                disabled={i === 0}
                                onClick={() => moveGallery(i, -1)}
                                aria-label={t('تحريك لأعلى', 'Move up')}
                              >
                                <ChevronUp size={12} />
                              </button>
                              <button
                                type="button"
                                className="pe-media__icon-btn"
                                disabled={i === form.galleryUrls.length - 1}
                                onClick={() => moveGallery(i, 1)}
                                aria-label={t('تحريك لأسفل', 'Move down')}
                              >
                                <ChevronDown size={12} />
                              </button>
                            <button
                              type="button"
                                className="pe-media__icon-btn pe-media__icon-btn--danger"
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  galleryUrls: p.galleryUrls.filter((_, j) => j !== i),
                                }))
                              }
                                aria-label={t('إزالة', 'Remove')}
                            >
                              <Trash2 size={12} />
                            </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="pe-media__gallery-empty">
                        {t('لا صور في المعرض بعد.', 'No gallery images yet.')}
                      </p>
                    )}
                    <div className="pe-media__actions">
                      <label className="pe-media__btn pe-media__btn--primary">
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        {t('إضافة صور', 'Add images')}
                        <input
                          type="file"
                          accept={GALLERY_ACCEPT}
                          multiple
                          className="hidden"
                          disabled={form.galleryUrls.length >= GALLERY_MAX}
                          onChange={(e) => {
                            uploadGalleryFiles(e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="pe-media__btn"
                        disabled={form.galleryUrls.length >= GALLERY_MAX}
                        onClick={() => openMediaLibrary({ kind: 'gallery' })}
                      >
                        <FolderOpen size={13} />
                        {t('إعادة استخدام', 'Reuse')}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="pe-media__zone pe-media__zone--surfaces">
                  <header className="pe-media__zone-head">
                    <div>
                      <h3 className="pe-media__zone-title">{t('أسطح المتجر', 'Store surfaces')}</h3>
                      <p className="pe-media__zone-hint text-pretty">
                        {t(
                          'بطاقة، بانر، تحويم، بطل — PNG أو JPEG أو WebP أو GIF أو MP4 — حتى 20 ميغابايت.',
                          'Card, banner, hover, hero — PNG, JPEG, WebP, GIF, or MP4 — up to 20MB.',
                  )}
                </p>
                    </div>
                  </header>
                  <div className="pe-media__slots">
                {(
                  [
                    {
                      field: 'thumbnail_url' as const,
                      labelAr: 'صورة البطاقة',
                      labelEn: 'Card image',
                      hintAr: 'صورة المتجر وبطاقة المنتج.',
                      hintEn: 'Store listing and product card.',
                    },
                    {
                      field: 'ad_banner_url' as const,
                      labelAr: 'بانر الإعلان',
                      labelEn: 'Ad banner',
                      hintAr: 'اختياري. إن لم تُرفع تُستخدم صورة البطاقة.',
                      hintEn: 'Optional. Falls back to the card image if empty.',
                    },
                    {
                      field: 'hover_image_url' as const,
                      labelAr: 'بطاقة التحويم',
                      labelEn: 'Hover card',
                      hintAr: 'اختياري. إن لم تُرفع تُستخدم صورة البطاقة.',
                      hintEn: 'Optional. Falls back to the card image if empty.',
                    },
                    {
                      field: 'hero_backdrop_url' as const,
                      labelAr: 'خلفية البطل',
                      labelEn: 'Hero backdrop',
                      hintAr: 'اختياري. إن لم تُرفع تُستخدم صورة البطاقة.',
                      hintEn: 'Optional. Falls back to the card image if empty.',
                    },
                  ] as const
                ).map((slot) => {
                  const url = form[slot.field];
                      const isAdBanner = slot.field === 'ad_banner_url';
                      const adsSizeName = (id: HomeAdsSize) =>
                        id === 'sm'
                          ? t('قصير', 'Short')
                          : id === 'md'
                            ? t('متوسط', 'Medium')
                            : id === 'lg'
                              ? t('طويل', 'Tall')
                              : t('أطول', 'Extra tall');
                  return (
                        <article
                          key={slot.field}
                          className={`pe-media__slot${url ? ' has-media' : ''}${
                            isAdBanner ? ' pe-media__slot--banner' : ''
                          }`}
                        >
                          <div className="pe-media__slot-preview">
                        {url ? (
                            <ProductMedia src={url} alt="" className="w-full h-full object-cover" />
                        ) : (
                              <span className="pe-media__slot-empty" aria-hidden>
                            <ImagePlus size={20} />
                              </span>
                            )}
                            {url && isVideoUrl(url) ? (
                              <span className="pe-media__slot-badge">MP4</span>
                            ) : null}
                          </div>
                          <div className="pe-media__slot-meta">
                            <p className="pe-media__slot-label">{t(slot.labelAr, slot.labelEn)}</p>
                            <p className="pe-media__slot-hint text-pretty">
                              {t(slot.hintAr, slot.hintEn)}
                            </p>
                            {isAdBanner ? (
                              <div className="pe-media__banner-guide">
                                <p className="pe-media__banner-guide-now">
                                  {t('المتجر يستخدم الآن', 'Store uses')}{' '}
                                  <strong>{adsSizeName(homeAdsSize)}</strong>
                                </p>
                                <ul className="pe-media__banner-guide-list">
                                  {HOME_ADS_SIZES.map((id) => {
                                    const g = HOME_ADS_SIZE_GUIDES[id];
                                    const current = id === homeAdsSize;
                                    return (
                                      <li
                                        key={id}
                                        className={
                                          current
                                            ? 'pe-media__banner-guide-item is-current'
                                            : 'pe-media__banner-guide-item'
                                        }
                                      >
                                        <span className="pe-media__banner-guide-name">
                                          {adsSizeName(id)}
                                          {current ? (
                                            <span className="pe-media__banner-guide-badge">
                                              {t('الحالي', 'Current')}
                                            </span>
                                          ) : null}
                                        </span>
                                        <span className="pe-media__banner-guide-spec" dir="ltr">
                                          {g.aspect} · {g.width}×{g.height}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                                <p className="pe-media__banner-guide-note text-pretty">
                                  {t(
                                    'غيّر الارتفاع من منشئ الموقع (بانر الإعلانات). ارفع صورة تناسب الحجم الحالي.',
                                    'Change height in Website Builder (Ad banner). Upload an image that fits the size in use.',
                                  )}
                                </p>
                              </div>
                            ) : null}
                            <div className="pe-media__actions">
                              <label className="pe-media__btn pe-media__btn--primary">
                                {uploading ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <ImagePlus size={13} />
                                )}
                                {t('رفع', 'Upload')}
                          <input
                            type="file"
                            accept={PRODUCT_MEDIA_ACCEPT}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadProductImage(slot.field, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <button
                          type="button"
                                className="pe-media__btn"
                          onClick={() => openMediaLibrary({ kind: 'field', field: slot.field })}
                        >
                          <FolderOpen size={13} />
                                {t('إعادة', 'Reuse')}
                        </button>
                              {url ? (
                          <button
                            type="button"
                            onClick={() => setField(slot.field, '')}
                                  className="pe-media__btn pe-media__btn--danger"
                          >
                                  <Trash2 size={12} />
                          </button>
                              ) : null}
                      </div>
                    </div>
                        </article>
                  );
                })}
                  </div>
                </section>
              </div>
            </details>
        </div>

        <aside className="hidden lg:block">
          <div className="pe-rail">
            <div className="pe-preview">
            {form.thumbnail_url ? (
                <div className="pe-preview__media">
                <ProductMedia src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
                <div className="pe-preview__media pe-preview__media--empty" aria-hidden>
                  <ImagePlus size={24} />
              </div>
            )}
              <p className="pe-preview__name line-clamp-2">{summaryName}</p>
              <p className="pe-preview__price tabular-nums">
                {form.price ? `$${form.price}` : '—'}
              </p>
              <div className="pe-preview__stats">
                <span className={statusChipClass}>{statusLabel(form.status)}</span>
                <span className="product-editor__chip tabular-nums">
                  {t('المخزون', 'Stock')} · {stockNum}
              </span>
            </div>
            </div>
            <nav className="pe-toc" aria-label={t('أقسام النموذج', 'Form sections')}>
              <p className="pe-toc__label">{t('انتقال', 'Jump')}</p>
              {tocLink('pe-basics', 'الأساسيات', 'Basics')}
              {tocLink('pe-pricing', 'التسعير', 'Pricing')}
              {tocLink('pe-fulfill', 'التسليم', 'Fulfillment')}
              {tocLink('pe-copy', 'الوصف', 'Description')}
              {tocLink('pe-fx', 'التأثيرات', 'Effects')}
              {productAtmOn ? tocLink('pe-atm', 'الأجواء', 'Atmosphere') : null}
              {tocLink('pe-media', 'الوسائط', 'Media')}
              {tocLink('pe-seller', 'البائع', 'Seller')}
              {tocLink('pe-req', 'المتطلبات', 'Requirements')}
              {tocLink('pe-author', 'أضيف بواسطة', 'Added by')}
            </nav>
          </div>
        </aside>
      </div>

      {mediaPickTarget ? (
        <div className="pe-media__picker-layer" role="presentation">
          <button
            type="button"
            className="pe-media__picker-backdrop"
            aria-label={t('إغلاق', 'Close')}
            onClick={() => setMediaPickTarget(null)}
          />
          <div
            className="pe-media__picker pe-media__picker--float"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pe-media-picker-title"
          >
            <div className="pe-media__picker-head">
              <div>
                <p id="pe-media-picker-title" className="pe-media__picker-title">
                  {t('الموارد', 'Resources')}
                </p>
                <p className="pe-media__picker-hint text-pretty">
                  {t(
                    'تضمينات محفوظة، مرفوعات، ووسائط من المنتجات.',
                    'Saved embeds, uploads, and media from products.',
                  )}
                </p>
    </div>
              <button
                type="button"
                className="pe-media__icon-btn"
                onClick={() => setMediaPickTarget(null)}
                aria-label={t('إغلاق', 'Close')}
              >
                <X size={14} />
              </button>
            </div>
            <div className="pe-media__resource-sorts" role="group" aria-label={t('تصفية', 'Filter')}>
              {(
                [
                  ['all', t('الكل', 'All')],
                  ['embed_video', t('فيديو مضمّن', 'Embedded vids')],
                  ['embed_image', t('صور مضمّنة', 'Embedded images')],
                  ['image', t('صور', 'Images')],
                  ['video_file', t('ملفات فيديو', 'Video files')],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`pe-media__resource-chip${resourceSort === id ? ' is-on' : ''}`}
                  onClick={() => setResourceSort(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {mediaLibraryLoading ? (
              <div className="pe-media__picker-loading">
                <Loader2 size={18} className="animate-spin opacity-50" />
              </div>
            ) : (() => {
              const list = mediaLibrary.filter((item) =>
                matchesResourceSort(item, resourceSort),
              );
              if (list.length === 0) {
                return (
                  <p className="pe-media__picker-empty text-pretty">
                    {t(
                      'لا موارد مطابقة بعد — ضمّن رابطاً أو ارفع ملفاً.',
                      'No matching resources yet — embed a link or upload a file.',
                    )}
                  </p>
                );
              }
              const pickSelected = (url: string) =>
                (mediaPickTarget.kind === 'field' && form[mediaPickTarget.field] === url) ||
                (mediaPickTarget.kind === 'video' &&
                  form.video_embeds.slots[0].withAds === url) ||
                (mediaPickTarget.kind === 'videoEmbed' &&
                  form.video_embeds.slots[mediaPickTarget.slot][mediaPickTarget.variant] ===
                    url) ||
                (mediaPickTarget.kind === 'gallery' && form.galleryUrls.includes(url));
              const pickDisabled = (url: string) =>
                mediaPickTarget.kind === 'gallery' &&
                (form.galleryUrls.includes(url) || form.galleryUrls.length >= GALLERY_MAX);
              const linkItems = list.filter((item) => item.kind === 'embed_video');
              const mediaItems = list.filter((item) => item.kind !== 'embed_video');
              return (
                <div className="pe-media__picker-body">
                  {linkItems.length > 0 ? (
                    <div className="pe-media__pick-links" role="list">
                      {linkItems.map(({ url }) => {
                        let host = url;
                        let path = '';
                        try {
                          const u = new URL(url);
                          host = u.host;
                          path = `${u.pathname}${u.search}` || '/';
                        } catch {
                          /* keep raw host */
                        }
                        return (
                          <button
                            key={url}
                            type="button"
                            role="listitem"
                            onClick={() => applyMediaPick(url)}
                            disabled={pickDisabled(url)}
                            className={`pe-media__pick pe-media__pick--link${
                              pickSelected(url) ? ' is-active' : ''
                            }`}
                            title={url}
                          >
                            <span className="pe-media__pick-host" dir="ltr">
                              {host}
                            </span>
                            {path ? (
                              <span className="pe-media__pick-path" dir="ltr">
                                {path}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {mediaItems.length > 0 ? (
                    <div className="pe-media__picker-grid">
                      {mediaItems.map(({ url }) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => applyMediaPick(url)}
                          disabled={pickDisabled(url)}
                          className={`pe-media__pick${pickSelected(url) ? ' is-active' : ''}`}
                          title={url}
                        >
                          <ProductMedia
                            src={url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={clearKeysOpen}
        onClose={() => !clearKeysBusy && setClearKeysOpen(false)}
        onConfirm={confirmClearUnclaimedKeys}
        busy={clearKeysBusy}
        danger
        title={t(
          'حذف كل المفاتيح غير المستخدمة؟ سيصبح المخزون 0.',
          'Delete all unused keys? Stock becomes 0.',
        )}
        confirmLabel={t('حذف', 'Delete')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />
      <ConfirmDialog
        open={leaveOpen}
        onClose={() => {
          setLeaveOpen(false);
          if (leaveBlocker.state === 'blocked') leaveBlocker.reset();
        }}
        onConfirm={() => {
          setLeaveOpen(false);
          if (leaveBlocker.state === 'blocked') leaveBlocker.proceed();
        }}
        title={t(
          'لديك تغييرات غير محفوظة. مغادرة الصفحة؟',
          'You have unsaved changes. Leave this page?',
        )}
        confirmLabel={t('مغادرة', 'Leave')}
        cancelLabel={t('البقاء', 'Stay')}
      />
    </div>
  );
}
