import { useEffect, useId, useState, type FormEvent } from 'react';
import { BadgeCheck, Loader2, PenLine, Star, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import {
  armReviewCooldown,
  formatCooldown,
  getReviewCooldownMs,
  REVIEW_SUBMIT_COOLDOWN_MS,
} from '../../lib/reviewCooldown';
import {
  COMMENT_MAX,
  useProductReviews,
  type ReviewWithAuthor,
} from '../../hooks/useProductReviews';
import ConfirmDialog from '../dashboard/ConfirmDialog';
import Modal from '../ui/Modal';
import UserAvatar from '../ui/UserAvatar';
import RatingStars from '../ui/RatingStars';
import { UGC_TEXT_CLASS, ugcAlignClass, ugcDir, ugcDisplay } from '../../lib/bidi';

type Props = {
  productId: string;
  productSlug: string;
  userId: string | undefined;
  /** Product aggregate for the header (DB-backed). */
  rating?: number;
  reviewCount?: number;
};

function StarRow({
  value,
  size = 14,
  interactive,
  onPick,
  label,
}: {
  value: number;
  size?: number;
  interactive?: boolean;
  onPick?: (n: number) => void;
  label: string;
}) {
  return (
    <div
      className={`pe-reviews__stars${interactive ? ' pe-reviews__stars--interactive' : ''}`}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={label}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = n <= value;
        const star = (
          <Star
            size={size}
            strokeWidth={filled ? 0 : 1.75}
            className={filled ? 'pe-reviews__star is-on' : 'pe-reviews__star'}
            aria-hidden
          />
        );
        if (!interactive || !onPick) {
          return (
            <span key={n} className="pe-reviews__star-wrap">
              {star}
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}`}
            className="pe-reviews__star-btn"
            onClick={() => onPick(n)}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

function authorLabel(
  r: ReviewWithAuthor,
  selfId: string | undefined,
  t: (ar: string, en: string) => string,
): string {
  if (selfId && r.user_id === selfId) return t('أنت', 'You');
  const name = r.author?.full_name?.trim() || r.author?.username?.trim();
  if (name) return name;
  return t('مشتري', 'Buyer');
}

function avgFromList(reviews: ReviewWithAuthor[]): number | null {
  if (!reviews.length) return null;
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export default function ProductReviews({
  productId,
  productSlug,
  userId,
  rating: productRating,
  reviewCount: productReviewCount,
}: Props) {
  const { t, lang } = useI18n();
  const profileRole = useAuthStore((s) => s.profile?.role);
  const isReviewStaff =
    profileRole === 'owner' || profileRole === 'admin' || profileRole === 'moderator';
  const titleId = useId();
  const {
    reviews,
    isLoading,
    ownReview,
    canReview,
    canReviewLoading,
    save,
    remove,
    staffReply,
    invalidateAll,
  } = useProductReviews(productId, userId);

  const [composeOpen, setComposeOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [staffDeleteId, setStaffDeleteId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [cooldownMs, setCooldownMs] = useState(() => getReviewCooldownMs(productId, userId));
  const [submitLockMs, setSubmitLockMs] = useState(0);

  useEffect(() => {
    setCooldownMs(getReviewCooldownMs(productId, userId));
  }, [productId, userId]);

  useEffect(() => {
    if (cooldownMs <= 0 && submitLockMs <= 0) return;
    const id = window.setInterval(() => {
      setCooldownMs(getReviewCooldownMs(productId, userId));
      setSubmitLockMs((n) => Math.max(0, n - 250));
    }, 250);
    return () => window.clearInterval(id);
  }, [cooldownMs, submitLockMs, productId, userId]);

  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
  const count = productReviewCount ?? reviews.length;
  const avg =
    count > 0
      ? (productRating && productRating > 0 ? productRating : avgFromList(reviews)) ?? null
      : null;

  const cooling = cooldownMs > 0;
  const canWrite =
    Boolean(userId) &&
    !ownReview &&
    canReview &&
    !canReviewLoading &&
    !cooling;

  const openCompose = () => {
    if (!canWrite) return;
    setRating(5);
    setComment('');
    setFormError(null);
    setComposeOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitLockMs > 0) return;
    setFormError(null);
    setSubmitLockMs(REVIEW_SUBMIT_COOLDOWN_MS);
    try {
      await save.mutateAsync({ rating, comment });
      setComposeOpen(false);
      await invalidateAll(productSlug);
    } catch {
      setFormError(
        t(
          'تعذر نشر التقييم. تأكد أنك اشتريت هذا المنتج ولم تقيّمه من قبل.',
          'Could not post review. Make sure you bought this product and have not reviewed it yet.',
        ),
      );
    }
  };

  const onDelete = async () => {
    if (!ownReview || !userId) return;
    try {
      await remove.mutateAsync(ownReview.id);
      armReviewCooldown(productId, userId);
      setCooldownMs(getReviewCooldownMs(productId, userId));
      setConfirmDelete(false);
      setFormError(null);
      await invalidateAll(productSlug);
    } catch {
      setFormError(t('تعذر حذف التقييم', 'Could not delete review'));
    }
  };

  const onStaffDelete = async () => {
    if (!staffDeleteId) return;
    try {
      await remove.mutateAsync(staffDeleteId);
      setStaffDeleteId(null);
      setFormError(null);
      await invalidateAll(productSlug);
    } catch {
      setFormError(t('تعذر حذف التقييم', 'Could not delete review'));
    }
  };

  const onStaffReply = async (reviewId: string) => {
    const reply = (replyDrafts[reviewId] ?? '').trim();
    try {
      await staffReply.mutateAsync({ reviewId, reply });
      // Clear the draft so the freshly saved reply isn't masked by it.
      setReplyDrafts((d) => {
        const next = { ...d };
        delete next[reviewId];
        return next;
      });
      setFormError(null);
      await invalidateAll(productSlug);
    } catch {
      setFormError(t('تعذر حفظ الرد', 'Could not save reply'));
    }
  };

  return (
    <section className="pe-reviews rounded-xl border border-base-300 bg-base-200/50 p-5" aria-labelledby="product-reviews-heading">
      <header className="pe-reviews__head">
        <div className="pe-reviews__head-main">
          <h2 id="product-reviews-heading" className="pe-reviews__title">
            {t('التقييمات', 'Reviews')}
          </h2>
          {avg != null && count > 0 ? (
            <div className="pe-reviews__summary">
              <span className="pe-reviews__avg tabular-nums">{avg.toFixed(1)}</span>
              <RatingStars value={avg} size={16} label={`${avg} / 5`} />
              <span className="pe-reviews__count">
                {t(`${count} تقييم`, count === 1 ? '1 review' : `${count} reviews`)}
              </span>
            </div>
          ) : null}
        </div>

        {canWrite ? (
          <button type="button" className="pe-reviews__write btn btn-primary btn-sm gap-1.5" onClick={openCompose}>
            <PenLine size={14} strokeWidth={2.25} aria-hidden />
            {t('أضف تقييماً', 'Add a review')}
          </button>
        ) : null}

        {userId && cooling && !ownReview ? (
          <p className="pe-reviews__cooldown" role="status">
            {t(
              `يمكنك التقييم مرة أخرى بعد ${formatCooldown(cooldownMs, true)}`,
              `You can review again in ${formatCooldown(cooldownMs, false)}`,
            )}
          </p>
        ) : null}

        {userId && !ownReview && !canReviewLoading && !canReview && count > 0 ? (
          <p className="pe-reviews__hint">
            {t('اشترِ هذا المنتج لتتمكن من تقييمه.', 'Buy this product to leave a review.')}
          </p>
        ) : null}
      </header>

      {!composeOpen && formError ? (
        <p className="text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="pe-reviews__loading" aria-busy="true">
          <Loader2 size={16} className="animate-spin opacity-50" aria-hidden />
          <span>{t('جاري التحميل…', 'Loading…')}</span>
        </div>
      ) : reviews.length === 0 ? (
        <p className="pe-reviews__empty">{t('لا تقييمات بعد.', 'No reviews yet.')}</p>
      ) : (
        <ul className="pe-reviews__list">
          {reviews.map((r, i) => {
            const name = authorLabel(r, userId, t);
            const mine = Boolean(userId && r.user_id === userId);
            return (
              <li
                key={r.id}
                className={`pe-reviews__item${mine ? ' is-mine' : ''}`}
                style={{ ['--i' as string]: i }}
              >
                <div className="pe-reviews__item-top">
                  <UserAvatar
                    avatarUrl={r.author?.avatar_url}
                    name={name}
                    sizeClass="w-9"
                    className="pe-reviews__avatar"
                  />
                  <div className="pe-reviews__meta">
                    <div className="pe-reviews__who">
                      <span className="pe-reviews__name">{name}</span>
                      {r.is_verified_purchase ? (
                        <span className="pe-reviews__verified">
                          <BadgeCheck size={13} strokeWidth={2.25} aria-hidden />
                          {t('شراء موثّق', 'Verified purchase')}
                        </span>
                      ) : null}
                    </div>
                    <time className="pe-reviews__date tabular-nums" dateTime={r.created_at}>
                      {new Date(r.created_at).toLocaleDateString(locale)}
                    </time>
                  </div>
                </div>
                <StarRow value={r.rating} size={15} label={`${r.rating} / 5`} />
                {r.comment ? (
                  <p
                    className={`pe-reviews__body text-pretty ${UGC_TEXT_CLASS} ${ugcAlignClass(r.comment)}`}
                    dir={ugcDir(r.comment)}
                  >
                    {ugcDisplay(r.comment)}
                  </p>
                ) : null}
                {r.staff_reply ? (
                  <p
                    className={`pe-reviews__body text-pretty mt-2 border-s-2 border-primary/40 ps-2 text-sm text-base-content/80 ${UGC_TEXT_CLASS} ${ugcAlignClass(r.staff_reply)}`}
                    dir={ugcDir(r.staff_reply)}
                  >
                    <span className="block text-[11px] font-semibold opacity-70 mb-0.5">
                      {t('رد المتجر', 'Store reply')}
                    </span>
                    {ugcDisplay(r.staff_reply)}
                  </p>
                ) : null}
                {mine ? (
                  <button
                    type="button"
                    className="pe-reviews__delete"
                    onClick={() => setConfirmDelete(true)}
                    disabled={remove.isPending}
                    aria-label={t('حذف تقييمك', 'Delete your review')}
                  >
                    <Trash2 size={14} aria-hidden />
                    <span>{t('حذف', 'Delete')}</span>
                  </button>
                ) : null}
                {isReviewStaff && !mine ? (
                  <div className="mt-2 space-y-1.5">
                    <textarea
                      className="textarea textarea-bordered textarea-xs w-full min-h-14"
                      placeholder={t('رد المتجر…', 'Store reply…')}
                      value={replyDrafts[r.id] ?? r.staff_reply ?? ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      maxLength={2000}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        disabled={staffReply.isPending}
                        onClick={() => void onStaffReply(r.id)}
                      >
                        {t('حفظ الرد', 'Save reply')}
                      </button>
                      <button
                        type="button"
                        className="pe-reviews__delete"
                        onClick={() => setStaffDeleteId(r.id)}
                        disabled={remove.isPending}
                      >
                        <Trash2 size={14} aria-hidden />
                        <span>{t('حذف', 'Delete')}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        labelledBy={titleId}
        boxClassName="pe-reviews-modal__box"
      >
        <div className="pe-reviews-modal">
          <div className="pe-reviews-modal__bar">
            <h3 id={titleId} className="pe-reviews-modal__title">
              {t('قيّم تجربتك', 'Rate your experience')}
            </h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              onClick={() => setComposeOpen(false)}
              aria-label={t('إغلاق', 'Close')}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <form onSubmit={(e) => void onSubmit(e)} className="pe-reviews-modal__form">
            <StarRow
              value={rating}
              size={28}
              interactive
              onPick={setRating}
              label={t('تقييمك', 'Your rating')}
            />
            <label className="pe-reviews-modal__field">
              <span>{t('تعليق (اختياري)', 'Comment (optional)')}</span>
              <textarea
                className={`textarea textarea-bordered w-full min-h-[7rem] leading-relaxed ${UGC_TEXT_CLASS}`}
                dir={ugcDir(comment)}
                maxLength={COMMENT_MAX}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('كيف كانت التجربة؟', 'How was it?')}
              />
              <span className="pe-reviews-modal__count tabular-nums">
                {comment.length}/{COMMENT_MAX}
              </span>
            </label>
            {formError ? (
              <p className="text-sm text-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="pe-reviews-modal__actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setComposeOpen(false)}
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm gap-2 min-w-[7rem]"
                disabled={save.isPending || submitLockMs > 0}
              >
                {save.isPending ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : null}
                {t('نشر', 'Post')}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
          setFormError(null);
        }}
        onConfirm={() => void onDelete()}
        title={t('حذف التقييم؟', 'Delete review?')}
        body={t(
          'بعد الحذف تنتظر ساعة قبل تقييم هذا المنتج من جديد.',
          'After delete you wait one hour before reviewing this product again.',
        )}
        confirmLabel={t('حذف', 'Delete')}
        cancelLabel={t('إلغاء', 'Cancel')}
        danger
        busy={remove.isPending}
        error={confirmDelete ? formError : null}
      />
      <ConfirmDialog
        open={Boolean(staffDeleteId)}
        onClose={() => {
          setStaffDeleteId(null);
          setFormError(null);
        }}
        onConfirm={() => void onStaffDelete()}
        title={t('حذف تقييم الزبون؟', 'Delete this review?')}
        body={t('يُحذف التقييم نهائياً من صفحة المنتج.', 'Removes the review from the product page.')}
        confirmLabel={t('حذف', 'Delete')}
        cancelLabel={t('إلغاء', 'Cancel')}
        danger
        busy={remove.isPending}
        error={staffDeleteId ? formError : null}
      />
    </section>
  );
}
