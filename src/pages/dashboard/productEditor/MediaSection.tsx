import type { PlyrSiteConfig } from '../../../lib/siteSettings';
import { Images, ImagePlus, Loader2, Trash2, FolderOpen, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import ProductVideoPlayer from '../../../components/ui/ProductVideoPlayer';
import ProductMedia from '../../../components/ui/ProductMedia';
import { SHOWCASE_VIDEO_ACCEPT, GALLERY_MAX, GALLERY_ACCEPT, PRODUCT_MEDIA_ACCEPT } from './constants';
import { slotHasUrl, DEFAULT_VIDEO_EMBED_LABELS, type VideoEmbedLabels, type VideoEmbedSlotIndex, type VideoEmbedVariant } from '../../../lib/videoEmbeds';
import { syncVideoUrlFromEmbeds } from './mediaHelpers';
import { clampVideoVolume } from '../../../lib/videoPlayback';
import { type HomeAdsSize, HOME_ADS_SIZES, HOME_ADS_SIZE_GUIDES } from '../../../lib/siteSettings';
import { isVideoUrl } from '../../../lib/mediaUrl';
import { ProductForm } from './formModel';
import { MediaPickTarget } from './types';
import { type Dispatch, type SetStateAction } from 'react';

type MediaSectionProps = {
  t: (ar: string, en: string) => string;
  hasMedia: boolean;
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  plyrConfig: PlyrSiteConfig;
  uploading: boolean;
  uploadShowcaseVideo: (file: File) => Promise<void>;
  clearAllEmbeds: () => void;
  embedDrafts: Record<string, string>;
  setEmbedDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  resourcesPickEnabled: boolean;
  openMediaLibrary: (target: MediaPickTarget) => Promise<void>;
  applyEmbedDraft: (slot: VideoEmbedSlotIndex, variant: VideoEmbedVariant) => void;
  mediaPickTarget: MediaPickTarget | null;
  setMediaPickTarget: Dispatch<SetStateAction<MediaPickTarget | null>>;
  setResourcesPickEnabled: Dispatch<SetStateAction<boolean>>;
  moveGallery: (index: number, dir: -1 | 1) => void;
  uploadGalleryFiles: (files: FileList | null) => Promise<void>;
  homeAdsSize: "sm" | "md" | "lg" | "xl";
  uploadProductImage: (field: "thumbnail_url" | "ad_banner_url" | "hover_image_url" | "hero_backdrop_url", file: File) => Promise<void>;
  setField: (key: keyof ProductForm, value: string) => void;
};

export default function MediaSection({
  t,
  hasMedia,
  form,
  setForm,
  plyrConfig,
  uploading,
  uploadShowcaseVideo,
  clearAllEmbeds,
  embedDrafts,
  setEmbedDrafts,
  resourcesPickEnabled,
  openMediaLibrary,
  applyEmbedDraft,
  mediaPickTarget,
  setMediaPickTarget,
  setResourcesPickEnabled,
  moveGallery,
  uploadGalleryFiles,
  homeAdsSize,
  uploadProductImage,
  setField,
}: MediaSectionProps) {
  return (
    <>
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
                          disabled={uploading}
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
                                        aria-label={`${t(`تضمين ${slot + 1}`, `Embed ${slot + 1}`)} — ${label}`}
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
                          disabled={uploading || form.galleryUrls.length >= GALLERY_MAX}
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
                            disabled={uploading}
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
                            aria-label={t('إزالة', 'Remove')}
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
    </>
  );
}
