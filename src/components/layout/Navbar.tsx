import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, lazy, Suspense, Fragment } from 'react';
import { useDrawerDrag } from '../../hooks/useDrawerDrag';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Search, Filter, LogOut, Menu, LayoutDashboard,
  Sun, Moon, LogIn, UserPlus, Heart, Settings2, ChevronRight, EyeOff,
} from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useAppearanceStore } from '../../stores/appearanceStore';
import { originFromElement } from '../../lib/viewTransition';
import { SKINS, resolveTheme } from '../../lib/appearance';
import type { SkinId } from '../../lib/appearance';
import {
  getAnalyticsConsent,
  getAnalyticsConsentCooldownMs,
  onAnalyticsConsentChange,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from '../../lib/analyticsConsent';
import { useI18n } from '../../lib/i18n';
import { useCategories } from '../../hooks/useCatalog';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { parseDrawerCategoriesEnabled } from '../../lib/siteSettings';
import { buildCategoryForest, type CategoryNode } from '../../lib/categories';
import {
  STORE_SORT_KEYS,
  storeSortLabel,
  parseStoreSort,
  type StoreSortKey,
} from '../../lib/storeSort';
import BrandLogo from '../ui/BrandLogo';
import SearchFxShell from '../ui/SearchFxShell';
import AccountSwitch from '../dashboard/AccountSwitch';

/** First N root cats in drawer; rest behind Show More. */
const DRAWER_CAT_LIMIT = 4;
const DRAWER_CATS_HIDDEN_KEY = 'heven-drawer-cats-hidden';

function readDrawerCatsHidden(): boolean {
  try {
    return localStorage.getItem(DRAWER_CATS_HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDrawerCatsHidden(hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(DRAWER_CATS_HIDDEN_KEY, '1');
    else localStorage.removeItem(DRAWER_CATS_HIDDEN_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

// Pulls in framer-motion — only signed-in users pay for it, async.
const NotificationBell = lazy(() => import('../notifications/NotificationBell'));
import UserAvatar from '../ui/UserAvatar';

// Owner adds more nav links from dashboard later.
const barLinks = [
  { label: 'الرئيسية', labelEn: 'Home', href: '/' },
  { label: 'تصفح المتجر', labelEn: 'Explore Store', href: '/store' },
];

const MENU_ID = 'main-menu';

/** Label-scale count pill — tabular nums, min width so single digits don't collapse. */
const cartCountPill =
  'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-base-content/15 text-base-content text-xs font-semibold tabular-nums leading-none px-1 shrink-0';

function closeMenu() {
  const el = document.getElementById(MENU_ID) as HTMLInputElement | null;
  if (el) el.checked = false;
}

export default function Navbar() {
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const itemCount = useCartStore((s) => s.itemCount());
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { skin, mode, setSkin, toggleMode } = useAppearanceStore();
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSort, setSearchSort] = useState<StoreSortKey>('popular');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [drawerCatsOpen, setDrawerCatsOpen] = useState(false);
  const [userCatsHidden, setUserCatsHidden] = useState(readDrawerCatsHidden);
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerPanelRef = useRef<HTMLElement | null>(null);
  const barLinksRef = useRef<HTMLUListElement | null>(null);
  const barLinksRectRef = useRef<DOMRect | null>(null);
  // Panel node swaps between menu <ul> and prefs <div> — state, not just a
  // ref, so the focus trap re-runs on the new element.
  const [drawerPanelEl, setDrawerPanelEl] = useState<HTMLElement | null>(null);
  const setDrawerPanelRef = useCallback((el: HTMLElement | null) => {
    drawerPanelRef.current = el;
    setDrawerPanelEl(el);
  }, []);
  const drawerTrapRef = useMemo(
    () => ({ current: drawerPanelEl }),
    [drawerPanelEl],
  );
  useDrawerDrag(MENU_ID, drawerPanelRef);

  const dismissDrawer = useCallback(() => {
    setPrefsOpen(false);
    closeMenu();
    setMenuOpen(false);
  }, []);

  const onDrawerEscape = useCallback(() => {
    // Prefs view: Escape steps back to the menu list, not out of the drawer.
    if (prefsOpen) setPrefsOpen(false);
    else dismissDrawer();
  }, [prefsOpen, dismissDrawer]);

  useFocusTrap(menuOpen, drawerTrapRef, onDrawerEscape);

  useEffect(() => {
    const el = document.getElementById(MENU_ID) as HTMLInputElement | null;
    if (!el) return;
    const sync = () => {
      const open = el.checked;
      setMenuOpen(open);
      if (!open) setPrefsOpen(false);
    };
    sync();
    el.addEventListener('change', sync);
    return () => el.removeEventListener('change', sync);
  }, []);

  const [consent, setConsent] = useState<AnalyticsConsent | null>(() => getAnalyticsConsent());
  const [cooldownMs, setCooldownMs] = useState(() => getAnalyticsConsentCooldownMs());
  /** Guest re-accept: keep row mounted while it fades out. */
  const [guestAnalyticsHold, setGuestAnalyticsHold] = useState(false);
  const [guestAnalyticsExiting, setGuestAnalyticsExiting] = useState(false);
  const { data: categories = [] } = useCategories();
  const { settings } = useSiteSettings();
  const drawerCatsEnabled = parseDrawerCategoriesEnabled(settings.drawer_categories_enabled);
  const drawerForest = useMemo(() => buildCategoryForest(categories), [categories]);
  const showDrawerCats =
    drawerCatsEnabled && !userCatsHidden && drawerForest.length > 0;
  const canRestoreDrawerCats =
    drawerCatsEnabled && userCatsHidden && drawerForest.length > 0;
  const drawerRoots = drawerCatsOpen
    ? drawerForest
    : drawerForest.slice(0, DRAWER_CAT_LIMIT);
  const drawerHasMoreCats = drawerForest.length > DRAWER_CAT_LIMIT;

  // Hysteresis + rAF: enter compact later than we exit, so the threshold doesn't flicker.
  useEffect(() => {
    const SCROLL_ON = 56;
    const SCROLL_OFF = 16;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setScrolled((prev) => (prev ? y > SCROLL_OFF : y > SCROLL_ON));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // ScrollToTop resets during the route commit; sync chrome before that commit paints.
  useLayoutEffect(() => {
    if (window.scrollY <= 16) setScrolled(false);
  }, [location.pathname]);

  useEffect(() => {
    return onAnalyticsConsentChange(() => {
      setConsent(getAnalyticsConsent());
      setCooldownMs(getAnalyticsConsentCooldownMs());
    });
  }, []);

  const consentCooling = cooldownMs > 0;
  useEffect(() => {
    if (!consentCooling) return;
    const id = window.setInterval(() => setCooldownMs(getAnalyticsConsentCooldownMs()), 1000);
    return () => window.clearInterval(id);
  }, [consentCooling]);

  useEffect(() => {
    const el = document.getElementById(MENU_ID) as HTMLInputElement | null;
    if (!el) return;
    const onToggle = () => {
      if (!el.checked) {
        setPrefsOpen(false);
        setDrawerCatsOpen(false);
      }
    };
    el.addEventListener('change', onToggle);
    return () => el.removeEventListener('change', onToggle);
  }, []);

  // Keep bar query/sort in sync when browsing the store.
  useEffect(() => {
    if (location.pathname !== '/store') return;
    const params = new URLSearchParams(location.search);
    setSearchSort(parseStoreSort(params.get('sort')));
    setSearchQuery(params.get('q') ?? '');
  }, [location.pathname, location.search]);

  // Catalog pages already have in-page search — hide nav duplicate.
  const hideNavSearch =
    location.pathname === '/store' ||
    location.pathname === '/subscriptions' ||
    location.pathname === '/gift-cards';

  // Compact = scrolled chrome, but keep search expanded while the user is typing in it.
  const compact = scrolled && !searchFocused;
  // No nav search (store / catalog) → center + enlarge links like scrolled chrome.
  const centerLinks = compact || hideNavSearch;

  // FLIP the links across relative/centered layouts; changing position itself cannot transition.
  useLayoutEffect(() => {
    const links = barLinksRef.current;
    if (!links) return;
    const next = links.getBoundingClientRect();
    const prev = barLinksRectRef.current;
    barLinksRectRef.current = next;
    if (!prev || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Hidden links measure 0×0 → scale would be NaN/Infinity (invalid keyframe).
    if (!next.width || !next.height || !prev.width || !prev.height) return;
    const x = prev.left + prev.width / 2 - (next.left + next.width / 2);
    const y = prev.top + prev.height / 2 - (next.top + next.height / 2);
    const scaleX = prev.width / next.width;
    const scaleY = prev.height / next.height;
    if (
      Math.abs(x) < 1 &&
      Math.abs(y) < 1 &&
      Math.abs(scaleX - 1) < 0.01 &&
      Math.abs(scaleY - 1) < 0.01
    ) return;
    const animation = links.animate(
      {
        translate: [`${x}px ${y}px`, '0 0'],
        scale: [`${scaleX} ${scaleY}`, '1 1'],
      },
      { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
    return () => animation.cancel();
  }, [centerLinks, location.pathname]);

  const navClass = `storefront-navbar fixed top-0 z-50 w-full ${
    scrolled ? 'storefront-navbar--scrolled' : ''
  }`;

  const submitSearch = () => {
    const q = searchQuery.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (searchSort !== 'popular') params.set('sort', searchSort);
    const qs = params.toString();
    navigate(qs ? `/store?${qs}` : '/store');
  };

  const pickSearchSort = (sort: StoreSortKey) => {
    setSearchSort(sort);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const searchBar = (
    <form
      onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
      role="search"
      className="w-full min-w-0"
    >
      <SearchFxShell>
        <span className="nav-search-fx__search-icon" aria-hidden>
          <Search size={18} strokeWidth={2} />
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder={t('ابحث في المتجر...', 'Search the store...')}
          className="nav-search-fx__input"
          aria-label={t('بحث', 'Search')}
        />
        <span className="nav-search-fx__input-mask" aria-hidden />
        <span className="nav-search-fx__accent-blob" aria-hidden />
        <div
          className="nav-search-fx__go-wrap dropdown dropdown-end"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setSearchFocused(false);
            }
          }}
        >
          <span className="nav-search-fx__go-ring" aria-hidden />
          <button
            type="button"
            tabIndex={0}
            className={`nav-search-fx__go${searchSort !== 'popular' ? ' nav-search-fx__go--active' : ''}`}
            aria-label={`${t('ترتيب', 'Sort')}: ${storeSortLabel(searchSort, t)}`}
            aria-haspopup="menu"
            onFocus={() => setSearchFocused(true)}
          >
            <Filter size={16} strokeWidth={2.25} />
          </button>
          <ul
            tabIndex={0}
            role="menu"
            aria-label={t('ترتيب حسب', 'Sort by')}
            className="nav-search-fx__menu dropdown-content z-[70]"
          >
            {STORE_SORT_KEYS.map((key) => {
              const selected = searchSort === key;
              return (
                <li key={key} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={`nav-search-fx__menu-item${selected ? ' is-active' : ''}`}
                    onClick={() => pickSearchSort(key)}
                  >
                    {storeSortLabel(key, t)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </SearchFxShell>
    </form>
  );

  const pickSkin = (id: SkinId) => setSkin(id);

  const consentLocked = cooldownMs > 0;
  const cooldownSec = Math.ceil(cooldownMs / 1000);

  // Signed-in: always. Guest: only while declined (or mid accept fade-out).
  const showAnalyticsPrefs =
    Boolean(user) || consent === 'declined' || guestAnalyticsHold;

  const onPrivacyToggle = (on: boolean) => {
    if (consentLocked) return;
    const next: AnalyticsConsent = on ? 'accepted' : 'declined';
    if (!setAnalyticsConsent(next, { cooldown: true })) return;
    setConsent(next);
    setCooldownMs(getAnalyticsConsentCooldownMs());

    if (!user && next === 'accepted') {
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        setGuestAnalyticsHold(false);
        setGuestAnalyticsExiting(false);
        return;
      }
      setGuestAnalyticsHold(true);
      setGuestAnalyticsExiting(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setGuestAnalyticsExiting(true);
          window.setTimeout(() => {
            setGuestAnalyticsHold(false);
            setGuestAnalyticsExiting(false);
          }, 220);
        });
      });
    }
  };

  useEffect(() => {
    if (consent === 'declined') {
      setGuestAnalyticsHold(false);
      setGuestAnalyticsExiting(false);
    }
  }, [consent]);

  return (
    <>
      <div className="drawer">
        <input id={MENU_ID} type="checkbox" className="drawer-toggle" />
        <div className="drawer-content">
          <div className={navClass}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
              <div className="navbar relative min-h-20 py-1 gap-2">
                <div className="flex items-center gap-2 shrink-0 z-10">
                  <label
                    htmlFor={MENU_ID}
                    className="nav-menu-btn btn btn-ghost btn-lg btn-square min-h-14 min-w-14 text-base-content"
                    aria-label={t('القائمة', 'Menu')}
                  >
                    <Menu size={24} strokeWidth={2.75} aria-hidden />
                  </label>
                  <div
                    className={`nav-chrome-slot whitespace-nowrap ${
                      compact ? 'nav-chrome-slot--collapsed' : ''
                    }`}
                    aria-hidden={compact || undefined}
                  >
                    <BrandLogo size="lg" />
                  </div>
                </div>

                <ul
                  ref={barLinksRef}
                  className={`menu menu-horizontal px-1 hidden md:flex items-center ${
                    centerLinks
                      ? 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-2.5 px-2 z-20'
                      : 'relative shrink-0 gap-1 z-10'
                  }`}
                >
                  {barLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className={`rounded-md whitespace-nowrap !min-h-0 ${
                          centerLinks
                            ? hideNavSearch
                              ? 'text-lg lg:text-xl px-4 py-2.5 tracking-tight'
                              : 'text-base lg:text-lg px-3.5 py-2 tracking-tight'
                            : 'text-sm lg:text-base px-2.5 py-1'
                        } ${
                          location.pathname === link.href
                            ? 'active font-semibold text-primary bg-primary/10'
                            : centerLinks
                              ? 'font-semibold'
                              : 'font-medium'
                        }`}
                      >
                        {t(link.label, link.labelEn)}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div
                  className="flex flex-1 items-center gap-1 sm:gap-2 min-w-0 justify-end z-10"
                >
                  {!hideNavSearch && (
                  <div
                    className={`nav-chrome-slot nav-chrome-slot--search flex-1 min-w-20 max-w-[26rem] ${
                      compact ? 'nav-chrome-slot--collapsed' : ''
                    }`}
                    aria-hidden={compact || undefined}
                  >
                    {searchBar}
                  </div>
                  )}
                  <Link
                    to="/cart"
                    className="btn btn-ghost btn-md btn-square min-h-11 min-w-11 indicator"
                    aria-label={t('سلة التسوق', 'Cart')}
                  >
                    {itemCount > 0 && (
                      <span className={`indicator-item top-1.5 end-1.5 ${cartCountPill} border-0 outline-none ring-0 shadow-none`}>
                        {itemCount > 9 ? '9+' : itemCount}
                      </span>
                    )}
                    <ShoppingCart size={20} />
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => toggleMode(originFromElement(e.currentTarget))}
                    className="btn btn-ghost btn-md btn-square min-h-11 min-w-11"
                    aria-label={mode === 'dark' ? t('الوضع الفاتح', 'Light mode') : t('الوضع الداكن', 'Dark mode')}
                  >
                    {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                    className="nav-lang-btn btn btn-ghost btn-md btn-square min-h-11 min-w-11"
                    aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
                  >
                    <span className="nav-lang-btn__viewport" aria-hidden>
                      <span
                        className={`nav-lang-btn__label${lang === 'ar' ? ' is-on' : ''}`}
                        data-code="en"
                      >
                        EN
                      </span>
                      <span
                        className={`nav-lang-btn__label${lang === 'en' ? ' is-on' : ''}`}
                        data-code="ar"
                      >
                        ع
                      </span>
                    </span>
                  </button>
                  {user && (
                    <Suspense fallback={null}>
                      <NotificationBell />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="drawer-side z-[60]">
          <label
            htmlFor={MENU_ID}
            aria-label={t('إغلاق', 'Close sidebar')}
            className={`drawer-overlay ${prefsOpen ? '!bg-base-content/20' : ''}`}
          />

          {prefsOpen ? (
            <div
              ref={setDrawerPanelRef}
              role="dialog"
              aria-modal={menuOpen ? true : undefined}
              aria-label={t('تفضيلات', 'Preferences')}
              className="drawer-drag-panel bg-base-200/50 text-base-content min-h-full w-80 max-w-[85vw] p-4 flex flex-col gap-4 overflow-y-auto backdrop-blur-md border-e border-base-content/10"
            >
              <button
                type="button"
                onClick={() => setPrefsOpen(false)}
                className="btn btn-ghost w-full min-h-14 font-semibold text-base"
              >
                {t('رجوع', 'Back')}
              </button>

              <fieldset className="fieldset p-0 gap-2">
                <legend className="fieldset-legend px-0 pt-0 text-xs opacity-70">
                  {t('السمة', 'Theme')}
                </legend>
                <div className="join join-vertical w-full heven-skin-join">
                  {SKINS.map((s) => (
                    <input
                      key={s.id}
                      type="radio"
                      name="heven-skin-radios"
                      data-skin={s.id}
                      className="btn theme-controller join-item justify-start border-transparent shadow-none checked:border-transparent"
                      aria-label={t(s.labelAr, s.labelEn)}
                      value={resolveTheme(s.id, mode)}
                      checked={skin === s.id}
                      onChange={() => pickSkin(s.id)}
                    />
                  ))}
                </div>
              </fieldset>

              {showAnalyticsPrefs && (
                <fieldset
                  className={`fieldset p-0 gap-2 drawer-prefs-analytics${
                    guestAnalyticsExiting
                      ? ' drawer-prefs-analytics--exit'
                      : ''
                  }`}
                  aria-hidden={guestAnalyticsExiting || undefined}
                >
                  <legend className="fieldset-legend px-0 pt-0 text-xs opacity-70">
                    {t('التحليلات', 'Analytics')}
                  </legend>
                  <label
                    className={`drawer-prefs-analytics__row flex items-center justify-between gap-3 min-h-12 px-4 rounded-btn bg-base-100/50 ${
                      consentLocked || guestAnalyticsExiting
                        ? 'cursor-not-allowed opacity-70'
                        : 'cursor-pointer'
                    }`}
                    aria-disabled={consentLocked || guestAnalyticsExiting || undefined}
                  >
                    <span className="text-sm font-semibold tracking-tight text-base-content">
                      {t('تحليلات الاستخدام', 'Usage analytics')}
                    </span>
                    <input
                      type="checkbox"
                      className="toggle shrink-0"
                      checked={consent === 'accepted'}
                      disabled={consentLocked || guestAnalyticsExiting}
                      onChange={(e) => onPrivacyToggle(e.target.checked)}
                      aria-label={t('موافقة التحليلات', 'Analytics consent')}
                    />
                  </label>
                  <p className="drawer-prefs-analytics__hint text-xs leading-relaxed text-base-content/70 text-pretty px-1">
                    {consentLocked
                      ? t(
                          `يمكنك التغيير بعد ${cooldownSec} ث`,
                          `You can change again in ${cooldownSec}s`
                        )
                      : user
                        ? t(
                            'إحصاءات لتحسين المتجر. إيقافها يزيل شارة المساعِد.',
                            'Visit stats to improve the store. Turning off removes the Helper badge.'
                          )
                        : t(
                            'إحصاءات زيارات لتحسين المتجر. يمكنك الإيقاف في أي وقت.',
                            'Visit stats to improve the store. Turn off anytime.'
                          )}
                  </p>
                </fieldset>
              )}
            </div>
          ) : (
            <ul
              ref={setDrawerPanelRef}
              role="dialog"
              aria-modal={menuOpen ? true : undefined}
              aria-label={t('القائمة', 'Menu')}
              className="drawer-drag-panel menu bg-base-200 text-base-content min-h-full w-80 max-w-[85vw] p-4 gap-1 flex flex-col"
            >
              <li>
                <label htmlFor={MENU_ID} className="justify-center font-semibold min-h-12">
                  {t('رجوع', 'Go Back')}
                </label>
              </li>

              <li>
                <Link to="/cart" onClick={closeMenu} className="justify-between">
                  <span className="flex items-center gap-3">
                    <ShoppingCart size={20} /> {t('سلة التسوق', 'Cart')}
                  </span>
                  {itemCount > 0 && (
                    <span className={cartCountPill}>{itemCount > 9 ? '9+' : itemCount}</span>
                  )}
                </Link>
              </li>
              <li>
                <Link to="/wishlist" onClick={closeMenu}>
                  <Heart size={20} /> {t('قائمة المفضلة', 'Wishlist')}
                </Link>
              </li>
              <li>
                <button type="button" onClick={() => setPrefsOpen(true)} className="justify-between">
                  <span className="flex items-center gap-3">
                    <Settings2 size={20} /> {t('التفضيلات', 'Preferences')}
                  </span>
                  <ChevronRight size={18} className="opacity-40 rtl:rotate-180" aria-hidden />
                </button>
              </li>

              {showDrawerCats && (
                <>
                  <div className="flex items-center gap-1 my-1 min-h-9">
                    <div className="divider divider-start text-xs opacity-60 flex-1 m-0 min-h-9 h-9">
                      {t('الفئات', 'Categories')}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square shrink-0 min-h-9 min-w-9 opacity-60 hover:opacity-100"
                      aria-label={t('إخفاء الفئات', 'Hide categories')}
                      onClick={() => {
                        writeDrawerCatsHidden(true);
                        setUserCatsHidden(true);
                        setDrawerCatsOpen(false);
                      }}
                    >
                      <EyeOff size={18} aria-hidden />
                    </button>
                  </div>

                  <DrawerCategoryLinks
                    nodes={drawerRoots}
                    lang={lang}
                    depth={0}
                  />
                  {drawerHasMoreCats && !drawerCatsOpen && (
                    <li>
                      <button type="button" onClick={() => setDrawerCatsOpen(true)}>
                        {t('عرض المزيد!', 'Show More!')}
                      </button>
                    </li>
                  )}
                </>
              )}

              {canRestoreDrawerCats && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      writeDrawerCatsHidden(false);
                      setUserCatsHidden(false);
                    }}
                  >
                    {t('إظهار الفئات', 'Show categories')}
                  </button>
                </li>
              )}

              <div className="divider my-1" />

              {user ? (
                <>
                  <li className="account-switch-profile">
                    <Link
                      to="/dashboard/profile"
                      onClick={closeMenu}
                      aria-label={t('الملف ولوحة التحكم', 'Profile and dashboard')}
                    >
                      <UserAvatar
                        name={profile?.full_name}
                        email={user.email}
                        avatarUrl={profile?.avatar_url}
                        sizeClass="w-10"
                      />
                      <span className="account-switch-profile__name truncate text-sm font-medium">
                        {profile?.full_name || user.email}
                      </span>
                      {/* Decorative — whole row is the hit target */}
                      <span className="account-switch-profile__dash" aria-hidden>
                        <LayoutDashboard size={22} strokeWidth={2.25} />
                      </span>
                    </Link>
                  </li>
                  <AccountSwitch variant="menu" onDone={closeMenu} />
                  <li>
                    <button
                      type="button"
                      onClick={async () => { closeMenu(); await signOut(); navigate('/'); }}
                      className="text-error"
                    >
                      <LogOut size={20} /> {t('تسجيل الخروج', 'Sign Out')}
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/auth/login" onClick={closeMenu}>
                      <LogIn size={20} /> {t('تسجيل الدخول', 'Log In')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/auth/register" onClick={closeMenu} className="btn btn-primary justify-start mt-1">
                      <UserPlus size={20} /> {t('إنشاء حساب جديد', 'Sign Up')}
                    </Link>
                  </li>
                </>
              )}

              <li className="mt-auto pt-8">
                <Link to="/about" onClick={closeMenu} className="justify-center text-sm text-base-content/70">
                  {t('من نحن', 'About Us')}
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerCategoryLinks({
  nodes,
  lang,
  depth,
}: {
  nodes: CategoryNode[];
  lang: string;
  depth: number;
}) {
  return (
    <>
      {nodes.map((node) => {
        const label = lang === 'ar' ? node.name_ar || node.name : node.name;
        return (
          <Fragment key={node.id}>
            <li style={depth > 0 ? { paddingInlineStart: `${depth * 0.85}rem` } : undefined}>
              <Link
                to={`/store?category=${encodeURIComponent(node.slug)}`}
                onClick={closeMenu}
              >
                {label}
              </Link>
            </li>
            {node.children.length > 0 ? (
              <DrawerCategoryLinks nodes={node.children} lang={lang} depth={depth + 1} />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}
