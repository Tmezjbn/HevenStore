import type { User } from '@supabase/supabase-js';
import { PRODUCT_MEDIA_ACCEPT, PRODUCT_MEDIA_MAX_BYTES, GALLERY_MAX } from './constants';
import { supabase } from '../../../lib/supabase';
import { upsertMediaResource, listMediaResources } from '../../../lib/mediaResources';
import { type VideoEmbedSlotIndex, type VideoEmbedVariant, setEmbedSlotUrl, emptyVideoEmbeds } from '../../../lib/videoEmbeds';
import { syncVideoUrlFromEmbeds, defaultResourceSort, urlsToItems, collectFormMediaUrls, fetchRecentCatalogMediaUrls, uniqueMediaItems } from './mediaHelpers';
import { MediaPickTarget, MediaLibraryItem, ResourceSort } from './types';
import { ProductForm } from './formModel';
import { type Dispatch, type SetStateAction, type MutableRefObject } from 'react';

type MediaUploadArgs = {
  setFormError: Dispatch<SetStateAction<string>>;
  t: (ar: string, en: string) => string;
  user: User | null;
  setUploading: Dispatch<SetStateAction<boolean>>;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  mediaPickTarget: MediaPickTarget | null;
  embedDrafts: Record<string, string>;
  form: ProductForm;
  setEmbedDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  mediaLibSeqRef: MutableRefObject<number>;
  setMediaPickTarget: Dispatch<SetStateAction<MediaPickTarget | null>>;
  setResourceSort: Dispatch<SetStateAction<ResourceSort>>;
  setMediaLibraryLoading: Dispatch<SetStateAction<boolean>>;
  setMediaLibrary: Dispatch<SetStateAction<MediaLibraryItem[]>>;
};

export function createMediaUpload({
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
}: MediaUploadArgs) {
  const uploadToBucket = async (file: File, tag: string): Promise<string | null> => {
    setFormError('');
    const okType = PRODUCT_MEDIA_ACCEPT.split(',').includes(file.type);
    if (!okType) {
      setFormError(t('صيغة غير مدعومة — صورة أو GIF أو MP4', 'Unsupported type — image, GIF, or MP4'));
      return null;
    }
    if (file.size > PRODUCT_MEDIA_MAX_BYTES) {
      setFormError(t('الحد الأقصى للملف 20 ميغابايت', 'Max file size is 20MB'));
      return null;
    }
    if (!user?.id) {
      setFormError(t('سجّل الدخول أولاً', 'Sign in first'));
      return null;
    }
    setUploading(true);
    try {
      // Derive ext from the validated MIME type — file names may lack a dot or
      // contain non-ASCII chars that make the storage key invalid.
      const ext =
        { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' }[
          file.type
        ] ?? 'bin';
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${tag}.${ext}`;
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
    let room = GALLERY_MAX - form.galleryUrls.length;
    if (room <= 0) {
      setFormError(t(`الحد الأقصى ${GALLERY_MAX} صور`, `Maximum ${GALLERY_MAX} gallery images`));
      return;
    }
    const list = Array.from(files).slice(0, room);
    for (const file of list) {
      // form.galleryUrls is stale mid-loop — decrement the local budget so a
      // multi-file batch can't upload objects the clamp would then drop.
      if (room <= 0) break;
      if (!file.type.startsWith('image/')) {
        setFormError(t('المعرض للصور فقط', 'Gallery accepts images only'));
        continue;
      }
      const url = await uploadToBucket(file, 'gallery');
      if (url) {
        room -= 1;
        setForm((prev) => ({
          ...prev,
          galleryUrls: [...prev.galleryUrls, url].slice(0, GALLERY_MAX),
        }));
        void upsertMediaResource(url);
      }
    }
  };

  const openMediaLibrary = async (target: MediaPickTarget) => {
    const seq = ++mediaLibSeqRef.current;
    setMediaPickTarget(target);
    setResourceSort(defaultResourceSort(target));
    setMediaLibraryLoading(true);
    setFormError('');
    try {
    const fromResources = await listMediaResources();
    if (seq !== mediaLibSeqRef.current) return;
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
    if (seq !== mediaLibSeqRef.current) return;
    // Resources first (typed kinds), then form/catalog/storage fill gaps.
    setMediaLibrary(
      uniqueMediaItems([
        ...fromResources.map((r) => ({ url: r.url, kind: r.kind })),
        ...fromForm,
        ...fromCatalog,
        ...fromStorage,
      ]),
    );
    } catch {
      // Network/storage failure: don't leave the picker spinning forever.
      if (seq === mediaLibSeqRef.current) {
        setFormError(t('تعذّر تحميل المكتبة', 'Could not load the media library'));
      }
    } finally {
      if (seq === mediaLibSeqRef.current) setMediaLibraryLoading(false);
    }
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

  return { uploadToBucket, uploadProductImage, uploadShowcaseVideo, applyEmbedDraft, clearAllEmbeds, uploadGalleryFiles, openMediaLibrary, applyMediaPick, moveGallery };
}
