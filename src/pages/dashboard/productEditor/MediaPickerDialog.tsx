import { X, Loader2 } from 'lucide-react';
import { matchesResourceSort } from './mediaHelpers';
import { GALLERY_MAX } from './constants';
import ProductMedia from '../../../components/ui/ProductMedia';
import { MediaPickTarget, ResourceSort, MediaLibraryItem } from './types';
import { ProductForm } from './formModel';
import { type Dispatch, type SetStateAction } from 'react';

type MediaPickerDialogProps = {
  mediaPickTarget: MediaPickTarget | null;
  t: (ar: string, en: string) => string;
  setMediaPickTarget: Dispatch<SetStateAction<MediaPickTarget | null>>;
  resourceSort: ResourceSort;
  setResourceSort: Dispatch<SetStateAction<ResourceSort>>;
  mediaLibraryLoading: boolean;
  mediaLibrary: MediaLibraryItem[];
  form: ProductForm;
  applyMediaPick: (url: string) => void;
};

export default function MediaPickerDialog({
  mediaPickTarget,
  t,
  setMediaPickTarget,
  resourceSort,
  setResourceSort,
  mediaLibraryLoading,
  mediaLibrary,
  form,
  applyMediaPick,
}: MediaPickerDialogProps) {
  return (
    <>
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
                    <div className="pe-media__pick-links">
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
    </>
  );
}
