import type { NavigateFunction } from 'react-router-dom';
import type { Role } from '../../../types';
import type { User } from '@supabase/supabase-js';
import { slugify, serializeFields, editorSnapshot, ProductForm } from './formModel';
import { clampSeed } from '../../../lib/productRating';
import { canEditProductAuthor } from '../../../lib/productAuthorLock';
import { normalizeVideoEmbeds, resolveDefaultVideoUrl } from '../../../lib/videoEmbeds';
import { clampVideoVolume } from '../../../lib/videoPlayback';
import { serializeRequirements } from '../../../lib/productRequirements';
import { serializeCardFx } from '../../../lib/productCardFx';
import { supabase } from '../../../lib/supabase';
import { Product } from '../../../types';
import { serializeSecretContent } from '../../../lib/fulfillment';
import { PendingStock, KeyOverride } from './stockHelpers';
import { type MutableRefObject, type Dispatch, type SetStateAction } from 'react';

type SaveProductArgs = {
  savingRef: MutableRefObject<boolean>;
  setFormError: Dispatch<SetStateAction<string>>;
  form: ProductForm;
  t: (ar: string, en: string) => string;
  pendingStock: PendingStock[];
  keyCounts: { available: number; claimed: number; };
  setSaving: Dispatch<SetStateAction<boolean>>;
  isSeller: boolean;
  user: User | null;
  editing: Product | null;
  isStaffAuthor: boolean;
  profileRole: Role | undefined;
  createdIdRef: MutableRefObject<string | null>;
  setEditing: Dispatch<SetStateAction<Product | null>>;
  setPendingStock: Dispatch<SetStateAction<PendingStock[]>>;
  setStockPaste: Dispatch<SetStateAction<string>>;
  setStockDraft: Dispatch<SetStateAction<string>>;
  setKeyCounts: Dispatch<SetStateAction<{ available: number; claimed: number; }>>;
  keyOverrides: KeyOverride[];
  setBaseline: Dispatch<SetStateAction<string>>;
  refreshStorefront: () => void;
  navigate: NavigateFunction;
};

export function createSaveProduct({
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
}: SaveProductArgs) {
  const save = async () => {
    if (savingRef.current) return;
    setFormError('');
    if (!form.name.trim() || !form.slug.trim() || !form.price.trim()) {
      setFormError(t('الاسم والمعرّف والسعر مطلوبة', 'Name, slug, and price are required'));
      return;
    }
    const slugValue = slugify(form.slug);
    if (!slugValue) {
      setFormError(t('المعرّف غير صالح', 'Invalid slug'));
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setFormError(t('السعر غير صالح', 'Invalid price'));
      return;
    }
    const originalPrice = form.original_price.trim() ? Number(form.original_price) : null;
    if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < 0)) {
      setFormError(t('السعر قبل الخصم غير صالح', 'Invalid original price'));
      return;
    }
    const pendingLines = pendingStock.filter((p) => p.content.trim());
    const hasKeys = keyCounts.available + keyCounts.claimed + pendingLines.length > 0;
    // Keyed products: stock is derived from unclaimed keys (DB trigger),
    // so the manual field is ignored to avoid overwriting the real count.
    const stock = hasKeys
      ? keyCounts.available + pendingLines.length
      : Math.max(0, Math.floor(Number(form.stock) || 0));

    savingRef.current = true;
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
      slug: slugValue,
      description: form.description.trim() || null,
      description_ar: form.description_ar.trim() || null,
      price,
      original_price: originalPrice,
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
      const targetId = editing?.id ?? createdIdRef.current;
      if (targetId) {
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', targetId)
          .select()
          .single();
        if (error) throw error;
        savedId = targetId;
        if (data && editing) {
          setEditing((prev) =>
            prev
              ? {
                  ...prev,
                  // Review gate may coerce 'active' → 'pending_review' — keep truth.
                  status: (data as Product).status ?? prev.status,
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
        createdIdRef.current = savedId;
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
        const { error: secDelErr } = await supabase
          .from('product_secrets')
          .delete()
          .eq('product_id', savedId);
        if (secDelErr) throw secDelErr;
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
    savingRef.current = false;
    setSaving(false);
  };

  return { save };
}
