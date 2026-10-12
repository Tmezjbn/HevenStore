import { Loader2, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
// PERF-2: defer editor CSS off storefront main chunk (loads with this lazy route).
void import('../../styles/product-editor.css');
import { useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { parseSecretContent } from '../../lib/fulfillment';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import type { Product, Category } from '../../types';
import { CATEGORY_COLS } from '../../lib/dbCols';
import { PRODUCT_EDITOR_COLS } from '../../hooks/useCatalog';
import { useSaveSiteSettings, useSiteSettings } from '../../hooks/useSiteSettings';
import {
  allProductTypes,
  isValidProductTypeId,
  parseProductTypesJson,
  serializeProductTypesJson,
  slugifyProductType,
  type ProductTypeDef,
} from '../../lib/productTypes';
import {
  parseHomeAdsSize,
  parsePlyrConfig,
  parseProductDetailFx,
  parseSellerDailyProductLimit,
  utcDayStartIso,
} from '../../lib/siteSettings';
import { ATMOSPHERE_LOGO_IDS } from '../../lib/atmosphereLogos';

import BasicsSection from './productEditor/BasicsSection';
import PricingSection from './productEditor/PricingSection';
import FulfillSection from './productEditor/FulfillSection';
import CopySection from './productEditor/CopySection';
import EffectsSection from './productEditor/EffectsSection';
import AtmosphereSection from './productEditor/AtmosphereSection';
import SellerSection from './productEditor/SellerSection';
import RequirementsSection from './productEditor/RequirementsSection';
import AuthorSection from './productEditor/AuthorSection';
import MediaSection from './productEditor/MediaSection';
import PreviewRail from './productEditor/PreviewRail';
import MediaPickerDialog from './productEditor/MediaPickerDialog';
import { createRenderStockCard } from './productEditor/stockCard';
import { createMediaUpload } from './productEditor/mediaUpload';
import { createSaveProduct } from './productEditor/saveProduct';
import { createStockActions } from './productEditor/stockActions';
import { createPanelHelpers } from './productEditor/panels';
import { GALLERY_MAX } from './productEditor/constants';
import { SellerPick, SellerSort, LoadState, EditorNavState, MediaPickTarget, ResourceSort, MediaLibraryItem } from './productEditor/types';
import { filterAndSortSellers } from './productEditor/sellers';
import { SecretField, ProductForm, newField, parseFields, EMPTY_FORM, editorSnapshot, buildFormFromProduct, slugify, looksLikeUuid } from './productEditor/formModel';
import { KeyOverride, PendingStock, StockListItem, keyHasCustom, BulkDeliveryPasteTarget, keyOverridesFromRows } from './productEditor/stockHelpers';
import { collectFormMediaUrls } from './productEditor/mediaHelpers';

export default function ProductEditorPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { settings, isPlaceholderData: settingsPending } = useSiteSettings();
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
  const savingRef = useRef(false);
  // Id of a row inserted by a save that failed later — retry must update, not re-insert.
  const createdIdRef = useRef<string | null>(null);
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
  /** Seller review gate: new/edited listings pend until owner/admin approves. */
  const [needsReview, setNeedsReview] = useState(false);
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
  /** Route-init guards: survive dep-triggered re-runs (profile/settings hydration). */
  const seededCreateRef = useRef(false);
  const loadedProductRef = useRef<Product | null>(null);
  const limitCheckedRef = useRef(false);
  /** Latest media-library open wins — a stale fetch must not overwrite it. */
  const mediaLibSeqRef = useRef(0);

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
    if (!isValidProductTypeId(id)) {
      // slugify keeps non-ASCII letters; the column only allows a-z0-9_ —
      // reject here instead of silently dropping the type on serialize.
      setFormError(
        t(
          'اسم النوع بالإنجليزية يحتاج حرفاً لاتينياً أو رقماً واحداً على الأقل',
          'English type name needs at least one Latin letter or digit',
        ),
      );
      return;
    }
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
    createdIdRef.current = null;
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

  const mapExtrasToForm = (
    base: ProductForm,
    extras: Awaited<ReturnType<typeof fetchProductExtras>>,
  ): {
    form: ProductForm;
    keyCounts: { available: number; claimed: number } | null;
    keyOverrides: KeyOverride[];
  } => {
    let next = base;
    let counts: { available: number; claimed: number } | null = null;
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
      counts = mapped.counts;
      overrides = mapped.overrides;
    }
    return { form: next, keyCounts: counts, keyOverrides: overrides };
  };

  const applyExtrasToForm = (
    base: ProductForm,
    extras: Awaited<ReturnType<typeof fetchProductExtras>>,
  ): { form: ProductForm; keyOverrides: KeyOverride[] } => {
    const mapped = mapExtrasToForm(base, extras);
    if (mapped.keyCounts) setKeyCounts(mapped.keyCounts);
    setKeyOverrides(mapped.keyOverrides);
    return { form: mapped.form, keyOverrides: mapped.keyOverrides };
  };

  useEffect(() => {
    if (!isSeller || !profileId) return;
    let cancelled = false;
    void supabase
      .rpc('seller_needs_listing_review', { p_seller: profileId })
      .then(({ data }) => {
        if (!cancelled) setNeedsReview(data === true);
      });
    return () => {
      cancelled = true;
    };
  }, [isSeller, profileId]);

  const loadProductForEdit = async (product: Product, isCancelled: () => boolean) => {
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
    // A route change during the fetch must not let the old product's
    // secrets/gallery overwrite the new init.
    if (isCancelled()) return;
    const applied = applyExtrasToForm(next, extras);
    next = applied.form;
    loadedProductRef.current = product;
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
        loadedProductRef.current = null;
        // Gate on settled settings — placeholder defaults would false-block.
        if (
          isSeller &&
          profileId &&
          !settingsPending &&
          sellerDailyLimit > 0 &&
          !limitCheckedRef.current
        ) {
          limitCheckedRef.current = true;
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
        // Re-runs (profile/settings resolving) refresh meta but must not
        // wipe a form the user already started typing in.
        if (!seededCreateRef.current) {
          seededCreateRef.current = true;
          seedCreateForm();
        }
        return;
      }

      // Leaving create mode: the next /new visit (same mounted page) must reseed.
      seededCreateRef.current = false;
      createdIdRef.current = null;

      // List → Edit: product already in location.state — paint now, extras in background.
      if (warmProduct) {
        const shell = buildFormFromProduct(warmProduct, { isSeller, userId: user?.id });
        // Re-runs (profile/settings hydration, uuid→slug canonicalize) must not
        // reset a form the user already started editing.
        const alreadyShown = loadedProductRef.current?.id === warmProduct.id;
        loadedProductRef.current = warmProduct;
        if (!alreadyShown) {
          setEditing(warmProduct);
          setForm(shell);
          setKeyOverrides([]);
          setBaseline(editorSnapshot(shell, [], []));
          setLoadState('ready');
          setTopOut(false);
        }
        const [[{ data: cats }, sellersRes], extras] = await Promise.all([
          loadMeta(),
          fetchProductExtras(warmProduct.id),
        ]);
        if (cancelled) return;
        setCategories((cats as unknown as Category[]) || []);
        setSellers(sellersRes.data || []);
        setForm((prev) => {
          const wasClean = editorSnapshot(prev, [], []) === editorSnapshot(shell, [], []);
          const mapped = mapExtrasToForm(wasClean ? shell : prev, extras);
          queueMicrotask(() => {
            if (cancelled) return;
            if (mapped.keyCounts) setKeyCounts(mapped.keyCounts);
            setKeyOverrides(mapped.keyOverrides);
            if (wasClean) setBaseline(editorSnapshot(mapped.form, [], mapped.keyOverrides));
          });
          return mapped.form;
        });
        // Canonicalize after extras land — the slug-URL re-run skips reload
        // via loadedProductRef instead of dropping this in-flight apply.
        loadedProductRef.current = warmProduct;
        canonicalizeEditUrl(warmProduct);
        return;
      }

      const key = productSlug!;
      const loaded = loadedProductRef.current;
      // Canonicalization (uuid → slug) re-runs this effect with the same
      // product already on screen — skip the redundant reload.
      if (loaded && (loaded.slug === key || loaded.id === key)) return;
      setLoadState('loading');
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
      await loadProductForEdit(row, () => cancelled);
      if (cancelled) return;
      canonicalizeEditUrl(row);
    };

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init when route slug/mode or auth/settings readiness changes
  }, [productSlug, isCreate, profileRole, profileId, canAssignSeller, sellerDailyLimit, settingsPending]);

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

  const { uploadProductImage, uploadShowcaseVideo, applyEmbedDraft, clearAllEmbeds, uploadGalleryFiles, openMediaLibrary, applyMediaPick, moveGallery } = createMediaUpload({
    setFormError,
    t,
    user,
    setUploading,
    setForm,
    mediaPickTarget,
    embedDrafts,
    form,
    setEmbedDrafts,
    mediaLibSeqRef,
    setMediaPickTarget,
    setResourceSort,
    setMediaLibraryLoading,
    setMediaLibrary,
  });

  const { save } = createSaveProduct({
    savingRef,
    setFormError,
    form,
    t,
    pendingStock,
    keyCounts,
    setSaving,
    isSeller,
    user,
    editing,
    isStaffAuthor,
    profileRole,
    createdIdRef,
    setEditing,
    setPendingStock,
    setStockPaste,
    setStockDraft,
    setKeyCounts,
    keyOverrides,
    setBaseline,
    refreshStorefront,
    navigate,
  });

  const { clearUnclaimedKeys, confirmClearUnclaimedKeys, removeStockUnit, queuePasteAsStock, applyBulkDelivery, setDeliveryPasteClamped, bulkLabelFields, renameBulkLabel, addBulkLabel, removeBulkLabel, queueDraftStock, setPendingDetails, setPendingField, addPendingField, removePendingField, removePendingStock, setKeyOverrideDetails, setKeyOverrideField, addKeyOverrideField, removeKeyOverrideField } = createStockActions({
    editing,
    setClearKeysOpen,
    clearKeysBusy,
    setClearKeysBusy,
    setFormError,
    t,
    setKeyCounts,
    setKeyOverrides,
    refreshStorefront,
    stockPaste,
    setPendingStock,
    setStockPaste,
    setFulfillTab,
    pendingStock,
    keyOverrides,
    deliveryPaste,
    deliveryTwoLinesPerUnit,
    deliveryPasteTarget,
    setDeliveryPasteWarn,
    setDeliveryPaste,
    stockDraft,
    setStockDraft,
  });

  const { field, primarySection, tocLink } = createPanelHelpers(t);

  const pendingKeyCount = pendingStock.length;

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
    s === 'active'
      ? t('نشط', 'Active')
      : s === 'inactive'
        ? t('غير نشط', 'Inactive')
        : s === 'pending_review'
          ? t('قيد المراجعة', 'In review')
          : s === 'rejected'
            ? t('مرفوض', 'Rejected')
            : t('مسودة', 'Draft');

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
    // When blockLeave flips false while 'blocked', React Router auto-resets
    // the blocker — close the dialog too or it stays open with no pending nav.
    setLeaveOpen(leaveBlocker.state === 'blocked');
  }, [leaveBlocker.state]);

  const bumpStockPerPage = (delta: number) => {
    setStockPerPage((n) => Math.max(3, n + delta));
  };

  const renderStockCard = createRenderStockCard({
    t,
  });

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
      : form.status === 'draft' || form.status === 'pending_review'
        ? 'product-editor__chip product-editor__chip--warn'
        : form.status === 'rejected'
          ? 'product-editor__chip product-editor__chip--danger'
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
            <BasicsSection
              primarySection={primarySection}
              summaryName={summaryName}
              form={form}
              t={t}
              field={field}
              setField={setField}
              categories={categories}
              productTypeOptions={productTypeOptions}
              canManageTypes={canManageTypes}
              addingType={addingType}
              newTypeEn={newTypeEn}
              setNewTypeEn={setNewTypeEn}
              newTypeAr={newTypeAr}
              setNewTypeAr={setNewTypeAr}
              saveSettings={saveSettings}
              addCustomProductType={addCustomProductType}
              setAddingType={setAddingType}
            />

            <PricingSection
              primarySection={primarySection}
              form={form}
              discountPct={discountPct}
              statusLabel={statusLabel}
              t={t}
              stockNum={stockNum}
              keyedProduct={keyedProduct}
              setField={setField}
              field={field}
              keyCounts={keyCounts}
              pendingKeyCount={pendingKeyCount}
              isSeller={isSeller}
              needsReview={needsReview}
              editing={editing}
            />

            <FulfillSection
              primarySection={primarySection}
              t={t}
              keyCounts={keyCounts}
              pendingKeyCount={pendingKeyCount}
              customStockCount={customStockCount}
              fulfillTab={fulfillTab}
              setFulfillTab={setFulfillTab}
              stockDraft={stockDraft}
              setStockDraft={setStockDraft}
              queueDraftStock={queueDraftStock}
              stockPaste={stockPaste}
              setStockPaste={setStockPaste}
              pasteLineCount={pasteLineCount}
              queuePasteAsStock={queuePasteAsStock}
              totalStockUnits={totalStockUnits}
              deliveryPasteTarget={deliveryPasteTarget}
              setDeliveryPasteTarget={setDeliveryPasteTarget}
              bulkLabelFields={bulkLabelFields}
              renameBulkLabel={renameBulkLabel}
              removeBulkLabel={removeBulkLabel}
              addBulkLabel={addBulkLabel}
              deliveryPaste={deliveryPaste}
              setDeliveryPasteClamped={setDeliveryPasteClamped}
              deliveryTwoLinesPerUnit={deliveryTwoLinesPerUnit}
              setDeliveryTwoLinesPerUnit={setDeliveryTwoLinesPerUnit}
              deliveryPasteWarn={deliveryPasteWarn}
              deliveryPasteUnitCount={deliveryPasteUnitCount}
              deliveryPasteLineCount={deliveryPasteLineCount}
              applyBulkDelivery={applyBulkDelivery}
              stockListAll={stockListAll}
              setStockListAll={setStockListAll}
              setStockPage={setStockPage}
              stockPerPage={stockPerPage}
              bumpStockPerPage={bumpStockPerPage}
              stockPaged={stockPaged}
              stockPageCount={stockPageCount}
              safeStockPage={safeStockPage}
              keyOverrides={keyOverrides}
              pendingStock={pendingStock}
              visibleStockItems={visibleStockItems}
              renderStockCard={renderStockCard}
              setPendingDetails={setPendingDetails}
              setPendingField={setPendingField}
              addPendingField={addPendingField}
              removePendingField={removePendingField}
              removePendingStock={removePendingStock}
              setKeyOverrideDetails={setKeyOverrideDetails}
              setKeyOverrideField={setKeyOverrideField}
              addKeyOverrideField={addKeyOverrideField}
              removeKeyOverrideField={removeKeyOverrideField}
              removeStockUnit={removeStockUnit}
              editing={editing}
              clearUnclaimedKeys={clearUnclaimedKeys}
              form={form}
              setForm={setForm}
              setSecretField={setSecretField}
              removeSecretField={removeSecretField}
              addSecretField={addSecretField}
              keyedProduct={keyedProduct}
            />

            <CopySection
              primarySection={primarySection}
              t={t}
              lang={lang}
              form={form}
              copyLang={copyLang}
              setCopyLang={setCopyLang}
              setField={setField}
            />

            <EffectsSection
              form={form}
              t={t}
              summaryName={summaryName}
              setForm={setForm}
            />

            <AtmosphereSection
              productAtmOn={productAtmOn}
              t={t}
              form={form}
              setForm={setForm}
            />

            <SellerSection
              t={t}
              form={form}
              sellers={sellers}
              isSeller={isSeller}
              canAssignSeller={canAssignSeller}
              lang={lang}
              sellerQuery={sellerQuery}
              setSellerQuery={setSellerQuery}
              sellerRoleFilter={sellerRoleFilter}
              setSellerRoleFilter={setSellerRoleFilter}
              sellerSort={sellerSort}
              setSellerSort={setSellerSort}
              pickSeller={pickSeller}
              sellerOptions={sellerOptions}
              setForm={setForm}
            />

            <RequirementsSection
              t={t}
              form={form}
              addRequirementField={addRequirementField}
              setRequirementField={setRequirementField}
              removeRequirementField={removeRequirementField}
            />

            <AuthorSection
              t={t}
              form={form}
              user={user}
              profile={profile}
              staffAuthors={staffAuthors}
              sellers={sellers}
              editing={editing}
              isStaffAuthor={isStaffAuthor}
              profileRole={profileRole}
              setForm={setForm}
              isOwner={isOwner}
              lang={lang}
            />

            <MediaSection
              t={t}
              hasMedia={hasMedia}
              form={form}
              setForm={setForm}
              plyrConfig={plyrConfig}
              uploading={uploading}
              uploadShowcaseVideo={uploadShowcaseVideo}
              clearAllEmbeds={clearAllEmbeds}
              embedDrafts={embedDrafts}
              setEmbedDrafts={setEmbedDrafts}
              resourcesPickEnabled={resourcesPickEnabled}
              openMediaLibrary={openMediaLibrary}
              applyEmbedDraft={applyEmbedDraft}
              mediaPickTarget={mediaPickTarget}
              setMediaPickTarget={setMediaPickTarget}
              setResourcesPickEnabled={setResourcesPickEnabled}
              moveGallery={moveGallery}
              uploadGalleryFiles={uploadGalleryFiles}
              homeAdsSize={homeAdsSize}
              uploadProductImage={uploadProductImage}
              setField={setField}
            />
        </div>

            <PreviewRail
              form={form}
              summaryName={summaryName}
              statusChipClass={statusChipClass}
              statusLabel={statusLabel}
              t={t}
              stockNum={stockNum}
              tocLink={tocLink}
              productAtmOn={productAtmOn}
            />
      </div>

            <MediaPickerDialog
              mediaPickTarget={mediaPickTarget}
              t={t}
              setMediaPickTarget={setMediaPickTarget}
              resourceSort={resourceSort}
              setResourceSort={setResourceSort}
              mediaLibraryLoading={mediaLibraryLoading}
              mediaLibrary={mediaLibrary}
              form={form}
              applyMediaPick={applyMediaPick}
            />

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
