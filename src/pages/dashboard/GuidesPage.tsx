import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, List } from 'lucide-react';
// PERF-2: defer guides CSS off storefront main chunk (loads with GuidesPage).
void import('../../styles/dashboard-docs.css');
import { useAuthStore } from '../../stores/authStore';
import {
  loadGuideReadIds,
  pickReadingSection,
  saveGuideReadIds,
} from '../../lib/guideReading';
import { useI18n } from '../../lib/i18n';
import { GUIDE_ROLES, ROLE_GUIDES } from '../../lib/roleGuides';
import { roleLabel } from '../../lib/roles';
import type { Role } from '../../types';

type DeepLink = { href: string; labelAr: string; labelEn: string };

/**
 * Deep links per role + section index. All role guides share the same
 * 4-section shape (what / can / how / benefit) — index survives heading renames.
 * Hrefs must match role-gated routes in DashboardLayout allLinks.
 */
const L = {
  products: { href: '/dashboard/products', labelAr: 'فتح المنتجات', labelEn: 'Open Products' },
  listings: { href: '/dashboard/products', labelAr: 'فتح عروضي', labelEn: 'Open My listings' },
  categories: { href: '/dashboard/categories', labelAr: 'فتح التصنيفات', labelEn: 'Open Categories' },
  orders: { href: '/dashboard/orders', labelAr: 'فتح الطلبات', labelEn: 'Open Orders' },
  myOrders: { href: '/dashboard/orders', labelAr: 'فتح طلباتي', labelEn: 'Open My Orders' },
  mySales: { href: '/dashboard/orders', labelAr: 'فتح مبيعاتي', labelEn: 'Open My sales' },
  users: { href: '/dashboard/users', labelAr: 'فتح المستخدمين', labelEn: 'Open Users' },
  coupons: { href: '/dashboard/coupons', labelAr: 'فتح الكوبونات', labelEn: 'Open Coupons' },
  badges: { href: '/dashboard/badges', labelAr: 'فتح الشارات', labelEn: 'Open Badges' },
  myBadges: { href: '/dashboard/my-badges', labelAr: 'فتح شاراتي', labelEn: 'Open My Badges' },
  analytics: { href: '/dashboard/analytics', labelAr: 'فتح التحليلات', labelEn: 'Open Analytics' },
  support: { href: '/dashboard/support', labelAr: 'فتح الدعم', labelEn: 'Open Support' },
  deletions: {
    href: '/dashboard/deletion-requests',
    labelAr: 'فتح طلبات الحذف',
    labelEn: 'Open Deletion requests',
  },
  settings: { href: '/dashboard/settings', labelAr: 'فتح الإعدادات', labelEn: 'Open Settings' },
  builder: { href: '/dashboard/builder', labelAr: 'فتح منشئ الموقع', labelEn: 'Open Website Builder' },
  themes: { href: '/dashboard/themes', labelAr: 'فتح الثيمات', labelEn: 'Open Themes' },
  changelogs: { href: '/dashboard/changelogs', labelAr: 'فتح السجلات', labelEn: 'Open Changelogs' },
  profile: { href: '/dashboard/profile', labelAr: 'فتح ملفي الشخصي', labelEn: 'Open My Profile' },
  store: { href: '/store', labelAr: 'تصفح المتجر', labelEn: 'Browse store' },
} as const satisfies Record<string, DeepLink>;

const SECTION_LINKS: Record<Role, Record<number, DeepLink[]>> = {
  // Index 2 = "How X does those things" — the doing section gets the links.
  owner: {
    2: [
      L.products, L.categories, L.orders, L.users, L.coupons, L.badges, L.analytics,
      L.support, L.deletions, L.settings, L.builder, L.themes, L.changelogs, L.profile,
    ],
  },
  admin: {
    2: [L.products, L.orders, L.users, L.coupons, L.badges, L.analytics, L.support, L.profile],
  },
  moderator: { 2: [L.support, L.myOrders, L.myBadges, L.profile] },
  support: { 2: [L.support, L.myOrders, L.myBadges, L.profile] },
  seller: { 2: [L.listings, L.mySales, L.support, L.myBadges, L.profile] },
  buyer: { 2: [L.myOrders, L.myBadges, L.support, L.profile, L.store] },
  member: { 2: [L.myOrders, L.myBadges, L.support, L.profile, L.store] },
};

function linksFor(role: Role, sectionIndex: number): DeepLink[] {
  return SECTION_LINKS[role]?.[sectionIndex] ?? [];
}

function sectionId(role: Role, index: number) {
  return `guide-${role}-${index}`;
}

function isDangerSection(headingEn: string) {
  return /delet/i.test(headingEn);
}

export default function GuidesPage() {
  const { t, lang } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const myRole = (profile?.role ?? 'member') as Role;
  const canPick = myRole === 'owner' || myRole === 'admin';
  const [picked, setPicked] = useState<Role>(myRole);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadGuideReadIds());
  const [activeId, setActiveId] = useState<string>('');
  const articleRef = useRef<HTMLElement>(null);

  const role = canPick ? picked : myRole;
  const guide = useMemo(() => ROLE_GUIDES[role], [role]);
  const total = guide.sections.length;
  const roleSectionIds = useMemo(
    () => guide.sections.map((_, i) => sectionId(role, i)),
    [guide.sections, role],
  );
  const readCount = roleSectionIds.filter((id) => readIds.has(id)).length;
  const progress = total === 0 ? 0 : Math.round((readCount / total) * 100);
  const browsingOther = canPick && picked !== myRole;

  useEffect(() => {
    setActiveId(sectionId(role, 0));
  }, [role]);

  useEffect(() => {
    saveGuideReadIds(readIds);
  }, [readIds]);

  // Reading-band dwell: pick section nearest ~30% line in scroll pane (IO ratio fails on tall cards).
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>('[data-guide-section]')];
    if (nodes.length === 0) return;

    let scrollRoot: HTMLElement | null = null;
    let walk: Element | null = root.parentElement;
    while (walk && walk !== document.documentElement) {
      const oy = getComputedStyle(walk).overflowY;
      if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') {
        scrollRoot = walk as HTMLElement;
        break;
      }
      walk = walk.parentElement;
    }

    const dwellMs = 700;
    let timer: number | null = null;
    let pendingId: string | null = null;

    const startDwell = (id: string) => {
      setActiveId(id);
      if (pendingId === id) return;
      if (timer != null) window.clearTimeout(timer);
      pendingId = id;
      timer = window.setTimeout(() => {
        timer = null;
        pendingId = null;
        setReadIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }, dwellMs);
    };

    const tick = () => {
      const viewTop = scrollRoot ? scrollRoot.getBoundingClientRect().top : 0;
      const viewH = scrollRoot ? scrollRoot.clientHeight : window.innerHeight;
      const viewBottom = viewTop + viewH;
      const lineY = viewTop + viewH * 0.3;
      const rects = nodes.map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.id, top: r.top, bottom: r.bottom };
      });
      const id = pickReadingSection(rects, lineY, viewTop, viewBottom);
      if (id) startDwell(id);
    };

    scrollRoot?.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
    const raf = requestAnimationFrame(tick);

    return () => {
      if (timer != null) window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      scrollRoot?.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
    };
  }, [role, guide.sections.length]);

  const markRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const toggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAllRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const id of roleSectionIds) next.add(id);
      return next;
    });
  };

  const clearRoleRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const id of roleSectionIds) next.delete(id);
      return next;
    });
  };

  const onRoleKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    let next = index;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = GUIDE_ROLES.length - 1;
    else next = (index + dir + GUIDE_ROLES.length) % GUIDE_ROLES.length;
    setPicked(GUIDE_ROLES[next]);
    document.getElementById(`guide-role-${GUIDE_ROLES[next]}`)?.focus();
  };

  return (
    <div className="guides-page max-w-3xl mx-auto space-y-6 text-start">
      <header className="space-y-1">
        <h2 className="profile-section-title text-xl">{t('أدلة الرتب', 'Role guides')}</h2>
        <p className="text-sm text-base-content/70 text-pretty max-w-prose">
          {t(
            'لكل رتبة: شو هي، شو تقدر تسوي، كيف تسويها، وكيف تفيد نفسك والمتجر.',
            'For each role: what it is, what you can do, how to do it, and how that helps you and the store.',
          )}
        </p>
      </header>

      {canPick ? (
        <div className="space-y-2">
          <div
            className="guides-role-picker flex flex-wrap gap-2"
            role="radiogroup"
            aria-label={t('اختر رتبة', 'Pick a role')}
          >
            {GUIDE_ROLES.map((r, i) => (
              <button
                key={r}
                id={`guide-role-${r}`}
                type="button"
                role="radio"
                aria-checked={picked === r}
                className={`btn btn-sm ${picked === r ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPicked(r)}
                onKeyDown={(e) => onRoleKeyDown(e, i)}
              >
                {roleLabel(r, lang)}
              </button>
            ))}
          </div>
          {browsingOther ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setPicked(myRole)}
            >
              {t(`العودة لرتبتي (${roleLabel(myRole, lang)})`, `Back to my role (${roleLabel(myRole, lang)})`)}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-base-content/80">
          {t('رتبتك', 'Your role')}: <span className="font-semibold">{roleLabel(myRole, lang)}</span>
        </p>
      )}

      <div
        className="guides-progress"
        role="status"
        aria-live="polite"
        aria-label={t('تقدم القراءة', 'Reading progress')}
      >
        <div className="flex items-center justify-between gap-3 text-xs font-medium text-base-content/75 mb-1.5">
          <span>
            {readCount >= total && total > 0
              ? t('أكملت هذا الدليل — عمل رائع', 'Guide complete — nice work')
              : t(`${readCount} من ${total} أقسام`, `${readCount} of ${total} sections`)}
          </span>
          <span className="flex items-center gap-3">
            {readCount < total && total > 0 ? (
              <button type="button" className="btn btn-ghost btn-xs" onClick={markAllRead}>
                {t('تحديد الكل', 'Mark all')}
              </button>
            ) : null}
            {readCount > 0 ? (
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-base-content/70 hover:text-base-content">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked
                  onChange={clearRoleRead}
                  aria-label={t('إلغاء تحديد الكل كمقروء', 'Uncheck all read')}
                />
                <span>{t('إلغاء الكل', 'Uncheck all')}</span>
              </label>
            ) : null}
            <span className="tabular-nums">{progress}%</span>
          </span>
        </div>
        <div className="guides-progress__track" aria-hidden>
          <div className="guides-progress__fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <nav className="guides-toc" aria-label={t('في هذه الصفحة', 'On this page')}>
        <p className="guides-toc__label">
          <List size={14} aria-hidden />
          {t('المحتويات', 'Contents')}
        </p>
        <ol className="guides-toc__list">
          {guide.sections.map((s, i) => {
            const id = sectionId(role, i);
            const read = readIds.has(id);
            return (
              <li key={s.headingEn}>
                <a
                  href={`#${id}`}
                  className={`guides-toc__link${activeId === id ? ' is-active' : ''}${read ? ' is-read' : ''}`}
                  onClick={() => setActiveId(id)}
                >
                  {read ? <Check size={12} className="shrink-0 opacity-80" aria-hidden /> : null}
                  <span className="truncate">{lang === 'ar' ? s.headingAr : s.headingEn}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <article
        ref={articleRef}
        id={`guide-panel-${role}`}
        className="space-y-4"
        aria-label={lang === 'ar' ? guide.titleAr : guide.titleEn}
      >
        <h3 className="profile-section-title text-lg">{lang === 'ar' ? guide.titleAr : guide.titleEn}</h3>

        {guide.sections.map((s, i) => {
          const id = sectionId(role, i);
          const links = linksFor(role, i);
          const danger = isDangerSection(s.headingEn);
          const read = readIds.has(id);
          return (
            <section
              key={s.headingEn}
              id={id}
              data-guide-section
              className={`guides-card bg-base-200 border rounded-xl p-4 sm:p-5 space-y-3 text-start${
                danger ? ' border-error/35' : ' border-base-300'
              }${read ? ' is-read' : ' is-clickable'}`}
              onClick={() => markRead(id)}
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold text-base leading-snug text-balance">
                  {lang === 'ar' ? s.headingAr : s.headingEn}
                </h4>
                <button
                  type="button"
                  className={`badge badge-sm gap-1 shrink-0 ${
                    read ? 'badge-ghost text-success' : 'badge-outline text-base-content/70'
                  }`}
                  aria-pressed={read}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRead(id);
                  }}
                >
                  {read ? <Check size={12} aria-hidden /> : null}
                  {read ? t('مقروء', 'Read') : t('تحديد كمقروء', 'Mark read')}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-base-content/85 whitespace-pre-line text-pretty max-w-prose">
                {lang === 'ar' ? s.bodyAr : s.bodyEn}
              </p>
              {links.length ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {links.map((link) => (
                    <Link key={link.href} to={link.href} className="btn btn-sm btn-outline">
                      {lang === 'ar' ? link.labelAr : link.labelEn}
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}

        {readCount >= total && total > 0 ? (
          <p className="guides-complete text-sm font-medium text-success text-pretty" role="status">
            {t(
              'خلصت الدليل. افتح صفحة من الروابط أعلاه وجرّب خطوة واحدة.',
              'You finished the guide. Open a linked page above and try one real step.',
            )}
          </p>
        ) : null}
      </article>
    </div>
  );
}
