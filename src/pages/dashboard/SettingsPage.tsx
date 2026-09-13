import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';
// PERF-2: defer site-settings CSS off storefront main chunk (loads with this lazy route).
void import('../../styles/settings-page.css');
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useSiteSettings, useSaveSiteSettings } from '../../hooks/useSiteSettings';
import {
  parseAboutItems,
  parseSections,
  DEFAULT_HOME_SECTIONS,
  DEFAULT_STORE_SECTIONS,
  parseCategoryProductsSectionId,
  type PageSection,
  type SiteSettingsMap,
  type AboutItem,
} from '../../lib/siteSettings';
import {
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_TERMS_POLICY,
  joinBullets,
  joinParagraphs,
  parsePolicyDoc,
  splitBullets,
  splitParagraphs,
  type PolicyDocData,
  type PolicySection,
} from '../../lib/policyDocs';
import { ABOUT_ICON_NAMES, getAboutIcon } from '../../lib/aboutIcons';
import { BRAND_PALETTES, findBrandPalette, type BrandPaletteId } from '../../lib/brandPalettes';
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  ChevronUp,
  ChevronDown,
  Palette,
  Type,
  LayoutList,
  Info,
  ShieldAlert,
  Scale,
  Shield,
  FileText,
  Sparkles,
  ExternalLink,
  LayoutGrid,
  Megaphone,
  Star,
  Package,
  Layers,
  UserPlus,
  FolderOpen,
  Search,
  ArrowUpDown,
  Home,
  Store,
  Code2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  parseMultiAccountRoles,
  parseProductAuthorLock,
  parseSellerDailyProductLimit,
  type MultiAccountRoleFlags,
} from '../../lib/siteSettings';

type TFn = (ar: string, en: string) => string;

const SECTION_ICONS: Record<string, LucideIcon> = {
  categories: LayoutGrid,
  ads: Megaphone,
  featured: Star,
  products: Package,
  hover_cards: Layers,
  cta: UserPlus,
  search: Search,
  sort: ArrowUpDown,
};

function sectionIcon(id: string): LucideIcon {
  if (SECTION_ICONS[id]) return SECTION_ICONS[id];
  if (parseCategoryProductsSectionId(id)) return FolderOpen;
  return LayoutList;
}

const SETTINGS_NAV = [
  { id: 'settings-brand', labelAr: 'الهوية', labelEn: 'Brand' },
  { id: 'settings-colors', labelAr: 'الألوان', labelEn: 'Colors' },
  { id: 'settings-hero', labelAr: 'الهيرو', labelEn: 'Hero' },
  { id: 'settings-pages', labelAr: 'الأقسام', labelEn: 'Sections' },
  { id: 'settings-about', labelAr: 'من نحن', labelEn: 'About' },
  { id: 'settings-deletion', labelAr: 'حذف الحساب', labelEn: 'Deletion' },
  { id: 'settings-legal', labelAr: 'الخصوصية والشروط', labelEn: 'Privacy & Terms' },
  { id: 'settings-dev', labelAr: 'تطوير', labelEn: 'Dev', ownerOnly: true },
] as const;

function scrollToSettingsSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function SettingsPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isOwner = profile?.role === 'owner';
  const { settings, isLoading } = useSiteSettings();
  const saveMutation = useSaveSiteSettings();
  const [form, setForm] = useState<SiteSettingsMap>(settings);
  const [heroPreviewLang, setHeroPreviewLang] = useState<'ar' | 'en'>(lang === 'ar' ? 'ar' : 'en');
  const [pagesPreview, setPagesPreview] = useState<'home' | 'store'>('home');
  const [aboutPreviewLang, setAboutPreviewLang] = useState<'ar' | 'en'>(lang === 'ar' ? 'ar' : 'en');
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');
  const [legalPreviewLang, setLegalPreviewLang] = useState<'ar' | 'en'>(lang === 'ar' ? 'ar' : 'en');
  const [aboutItems, setAboutItems] = useState<AboutItem[]>(parseAboutItems(settings.about_items));
  const [privacyDoc, setPrivacyDoc] = useState<PolicyDocData>(
    parsePolicyDoc(settings.privacy_policy_json, DEFAULT_PRIVACY_POLICY)
  );
  const [termsDoc, setTermsDoc] = useState<PolicyDocData>(
    parsePolicyDoc(settings.terms_policy_json, DEFAULT_TERMS_POLICY)
  );
  const [homeSections, setHomeSections] = useState<PageSection[]>(
    parseSections(settings.home_sections, DEFAULT_HOME_SECTIONS)
  );
  const [storeSections, setStoreSections] = useState<PageSection[]>(
    parseSections(settings.store_sections, DEFAULT_STORE_SECTIONS)
  );
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setForm(settings);
      setAboutItems(parseAboutItems(settings.about_items));
      setPrivacyDoc(parsePolicyDoc(settings.privacy_policy_json, DEFAULT_PRIVACY_POLICY));
      setTermsDoc(parsePolicyDoc(settings.terms_policy_json, DEFAULT_TERMS_POLICY));
      setHomeSections(parseSections(settings.home_sections, DEFAULT_HOME_SECTIONS));
      setStoreSections(parseSections(settings.store_sections, DEFAULT_STORE_SECTIONS));
      setDirty(false);
      setSaved(false);
    }
  }, [settings, isLoading]);

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  const set = (key: keyof SiteSettingsMap, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    markDirty();
  };

  const applyPalette = (id: BrandPaletteId) => {
    const palette = findBrandPalette(id);
    if (!palette) return;
    setForm((prev) => ({
      ...prev,
      brand_palette: id,
      brand_primary: palette.primary,
      brand_accent: palette.accent,
    }));
    markDirty();
  };

  const setBrandColor = (key: 'brand_primary' | 'brand_accent', value: string) => {
    setForm((prev) => ({ ...prev, [key]: value, brand_palette: 'custom' }));
    markDirty();
  };

  const updateItem = (i: number, patch: Partial<AboutItem>) => {
    setAboutItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    markDirty();
  };

  const addItem = () => {
    setAboutItems((prev) => [
      ...prev,
      { icon: 'Star', title_ar: '', title_en: '', desc_ar: '', desc_en: '' },
    ]);
    markDirty();
  };

  const removeItem = (i: number) => {
    setAboutItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
    markDirty();
  };

  const moveAboutItem = (index: number, dir: -1 | 1) => {
    setAboutItems((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    markDirty();
  };

  const toggleSection = (
    setter: Dispatch<SetStateAction<PageSection[]>>,
    id: string
  ) => {
    setter((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    markDirty();
  };

  const moveSection = (
    setter: Dispatch<SetStateAction<PageSection[]>>,
    index: number,
    dir: -1 | 1
  ) => {
    setter((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    markDirty();
  };

  const handleSave = async () => {
    if (!user) return;
    const graceRaw = Number.parseInt(form.account_deletion_grace_days, 10);
    const graceDays = String(Math.max(1, Math.min(3650, Number.isFinite(graceRaw) ? graceRaw : 30)));
    try {
      await saveMutation.mutateAsync({
        updates: {
          ...form,
          account_deletion_grace_days: graceDays,
          about_items: JSON.stringify(aboutItems),
          privacy_policy_json: JSON.stringify(privacyDoc),
          terms_policy_json: JSON.stringify(termsDoc),
          home_sections: JSON.stringify(homeSections),
          store_sections: JSON.stringify(storeSections),
        },
        userId: user.id,
      });
      setForm((prev) => ({ ...prev, account_deletion_grace_days: graceDays }));
      setDirty(false);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  useEffect(() => {
    if (!saved || dirty) return;
    const id = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(id);
  }, [saved, dirty]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20" aria-busy="true">
        <span className="loading loading-spinner loading-md text-primary" aria-label={t('جارٍ التحميل', 'Loading')} />
      </div>
    );
  }

  const primaryPreview = form.brand_primary?.trim() || '#ececec';
  const accentPreview = form.brand_accent?.trim() || '#a3a3a8';
  const homeSectionLabels: Record<string, string> = {
    categories: t('الفئات', 'Categories'),
    ads: t('بانر الإعلانات', 'Ad banners'),
    featured: t('منتجات مميزة', 'Featured Products'),
    products: t('المنتجات', 'Products'),
    hover_cards: t('بطاقات تفاعلية', 'Hover cards'),
    cta: t('دعوة التسجيل', 'Sign-up CTA'),
    ...Object.fromEntries(
      homeSections
        .map((s) => parseCategoryProductsSectionId(s.id))
        .filter((id): id is string => Boolean(id))
        .map((id) => [`category_products:${id}`, t('منتجات تصنيف', 'Category products')]),
    ),
  };
  const storeSectionLabels: Record<string, string> = {
    search: t('شريط البحث', 'Search bar'),
    sort: t('قائمة الترتيب', 'Sort menu'),
  };
  const pagesPreviewSections = pagesPreview === 'home' ? homeSections : storeSections;
  const pagesPreviewLabels = pagesPreview === 'home' ? homeSectionLabels : storeSectionLabels;
  const pagesLiveStack = pagesPreviewSections.filter((s) => s.enabled);

  const saveControls = (
    <>
      <button
        type="button"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="btn btn-primary gap-2 settings-save-btn"
      >
        {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Save size={14} aria-hidden />}
        {t('حفظ التغييرات', 'Save Changes')}
      </button>
      {saved ? (
        <span className="settings-save-status text-success" role="status">
          <Check size={14} aria-hidden /> {t('تم الحفظ', 'Saved')}
        </span>
      ) : null}
      {saveMutation.isError ? (
        <span className="settings-save-status text-error" role="alert">
          {t('فشل الحفظ', 'Save failed')}
        </span>
      ) : null}
    </>
  );

  return (
    <div className="settings-page max-w-4xl mx-auto text-start">
      <header className="settings-page__hero">
        <div className="settings-page__hero-copy">
          <h2 className="profile-section-title text-xl sm:text-2xl">{t('إعدادات الموقع', 'Site Settings')}</h2>
          <p className="settings-page__lede text-pretty max-w-prose">
            {t(
              'تخصيص المحتوى والمظهر الظاهر للزوار. الحقول الفارغة تُخفى أو تعود للافتراضي.',
              'Customize the content and look visitors see. Empty fields hide or fall back to defaults.',
            )}
          </p>
        </div>
      </header>

      <nav className="settings-toc" aria-label={t('أقسام الإعدادات', 'Settings sections')}>
        <ol className="settings-toc__list">
          {SETTINGS_NAV.filter((item) => !('ownerOnly' in item && item.ownerOnly) || isOwner).map(
            (item) => (
            <li key={item.id}>
              <button
                type="button"
                className="settings-toc__link"
                onClick={() => scrollToSettingsSection(item.id)}
              >
                {t(item.labelAr, item.labelEn)}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Sticky dock: one Save that rides the bottom of main while dirty */}
      {dirty || saved || saveMutation.isError ? (
        <div className="settings-page__save-dock">
          <div className="settings-page__savebar" role="region" aria-label={t('حفظ الإعدادات', 'Save settings')}>
            {saveControls}
          </div>
        </div>
      ) : null}

      <div className="settings-page__stack">
        <SettingsPanel
          id="settings-brand"
          icon={Sparkles}
          title={t('الهوية', 'Brand')}
          hint={t('اسم المتجر والشعارات الظاهرة في التبويب والواجهة.', 'Store name and taglines used in the tab and UI.')}
        >
          <div
            className="settings-brand-preview"
            style={{
              ['--settings-preview-primary' as string]: primaryPreview,
              ['--settings-preview-accent' as string]: accentPreview,
            }}
          >
            <div className="settings-brand-preview__mark" aria-hidden />
            <div className="settings-brand-preview__text">
              <p className="settings-brand-preview__name">{form.site_name || 'HEVEN.FUN'}</p>
              <p className="settings-brand-preview__tag">
                {form.site_tagline || form.site_tagline_en || 'FUN MORE. PAY LESS.'}
              </p>
            </div>
          </div>

          <div className="settings-field-grid">
            <Field label={t('اسم الموقع', 'Site Name')} value={form.site_name} onChange={(v) => set('site_name', v)} />
            <Field label={t('الشعار (افتراضي)', 'Tagline (fallback)')} value={form.site_tagline} onChange={(v) => set('site_tagline', v)} />
            <Field label={t('شعار عنوان التبويب (عربي)', 'Title Tagline (Arabic)')} value={form.site_tagline_ar} onChange={(v) => set('site_tagline_ar', v)} placeholder={t('استمتع أكثر ادفع أقل', 'Fun More. Pay Less.')} />
            <Field label={t('شعار عنوان التبويب (إنجليزي)', 'Title Tagline (English)')} value={form.site_tagline_en} onChange={(v) => set('site_tagline_en', v)} placeholder="Fun More. Pay Less." />
          </div>

          <p className="settings-crosslink">
            {t('إدارة السمات والوضع الافتراضي في', 'Manage skins and site default in')}{' '}
            <Link to="/dashboard/themes" className="link link-hover font-semibold inline-flex items-center gap-1">
              {t('الثيمات', 'Themes')} <ExternalLink size={12} aria-hidden />
            </Link>
          </p>
        </SettingsPanel>

        <SettingsPanel
          id="settings-colors"
          icon={Palette}
          title={t('ألوان الموقع', 'Site Colors')}
          hint={t(
            'اختر لوحة جاهزة أو خصّص اللون الأساسي والثانوي. يُطبَّق على كل الزوار.',
            'Pick a preset or customize primary and accent. Applies site-wide for all visitors.',
          )}
        >
          <div
            className="settings-color-stage"
            style={{
              ['--settings-c-primary' as string]: primaryPreview,
              ['--settings-c-accent' as string]: accentPreview,
            }}
          >
            <div className="settings-color-stage__swatches" aria-hidden>
              <span className="settings-color-stage__block settings-color-stage__block--primary" />
              <span className="settings-color-stage__block settings-color-stage__block--accent" />
            </div>
            <div className="settings-color-stage__meta">
              <p className="settings-color-stage__eyebrow">{t('معاينة حية', 'Live preview')}</p>
              <p className="settings-color-stage__title">{form.site_name || 'HEVEN.FUN'}</p>
              <div className="settings-color-stage__demo">
                <span className="settings-color-stage__btn">{t('إجراء', 'Action')}</span>
                <span className="settings-color-stage__chip">{t('شارة', 'Badge')}</span>
              </div>
              <p className="settings-color-stage__hexes font-mono">
                <span>{primaryPreview}</span>
                <span aria-hidden>·</span>
                <span>{accentPreview}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="settings-subhead mb-2.5">{t('اللوحات', 'Presets')}</p>
            <div className="settings-palette-grid" role="listbox" aria-label={t('لوحات الألوان', 'Color palettes')}>
              {BRAND_PALETTES.map((palette) => {
                const active = form.brand_palette === palette.id;
                const swatchPrimary = palette.primary || '#ececec';
                const swatchAccent = palette.accent || '#a3a3a8';
                const shortLabel =
                  palette.id === 'default'
                    ? t('افتراضي', 'Default')
                    : t(palette.labelAr, palette.labelEn);
                return (
                  <button
                    key={palette.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-label={t(palette.labelAr, palette.labelEn)}
                    onClick={() => applyPalette(palette.id)}
                    className={`settings-palette-tile${active ? ' is-active' : ''}`}
                    style={{
                      ['--tile-primary' as string]: swatchPrimary,
                      ['--tile-accent' as string]: swatchAccent,
                    }}
                  >
                    <span className="settings-palette-tile__band" aria-hidden />
                    <span className="settings-palette-tile__body">
                      <span className="settings-palette-tile__label">{shortLabel}</span>
                      <span className="settings-palette-tile__codes font-mono">
                        {palette.primary ? `${swatchPrimary}` : t('سمة', 'Theme')}
                      </span>
                    </span>
                    {active ? (
                      <span className="settings-palette-tile__check" aria-hidden>
                        <Check size={14} strokeWidth={2.5} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <button
                type="button"
                role="option"
                aria-selected={form.brand_palette === 'custom'}
                aria-label={t('مخصص', 'Custom')}
                onClick={() => set('brand_palette', 'custom')}
                className={`settings-palette-tile settings-palette-tile--custom${form.brand_palette === 'custom' ? ' is-active' : ''}`}
                style={{
                  ['--tile-primary' as string]: primaryPreview,
                  ['--tile-accent' as string]: accentPreview,
                }}
              >
                <span className="settings-palette-tile__band" aria-hidden />
                <span className="settings-palette-tile__body">
                  <span className="settings-palette-tile__label">{t('مخصص', 'Custom')}</span>
                  <span className="settings-palette-tile__codes font-mono">{t('حرّك الأقلام', 'Pick hex')}</span>
                </span>
                {form.brand_palette === 'custom' ? (
                  <span className="settings-palette-tile__check" aria-hidden>
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className={`settings-color-editors${form.brand_palette === 'custom' ? ' is-open' : ''}`}
            style={{
              ['--settings-c-primary' as string]: primaryPreview,
              ['--settings-c-accent' as string]: accentPreview,
            }}
          >
            <p className="settings-subhead mb-2.5">
              {form.brand_palette === 'custom'
                ? t('ألوان مخصصة', 'Custom colors')
                : t('ضبط دقيق (يحوّل إلى مخصص)', 'Fine-tune (switches to Custom)')}
            </p>
            <div className="settings-color-editors__grid">
              <ColorField
                label={t('اللون الأساسي', 'Primary')}
                value={form.brand_primary}
                onChange={(v) => setBrandColor('brand_primary', v)}
                onClear={() => applyPalette('default')}
                clearLabel={t('إعادة', 'Reset')}
              />
              <ColorField
                label={t('اللون الثانوي', 'Accent')}
                value={form.brand_accent}
                onChange={(v) => setBrandColor('brand_accent', v)}
                onClear={() => applyPalette('default')}
                clearLabel={t('إعادة', 'Reset')}
              />
            </div>
          </div>
        </SettingsPanel>

        <SettingsPanel
          id="settings-hero"
          icon={Type}
          title={t('نص الهيرو', 'Hero Text')}
          hint={t(
            'نص بطاقة الترحيب في الصفحة الرئيسية — معاينة حية لكل لغة.',
            'Homepage welcome card copy — live preview per language.',
          )}
        >
          <div className="settings-hero-stage">
            <div className="settings-hero-stage__toolbar">
              <p className="settings-subhead">{t('معاينة الهيرو', 'Hero preview')}</p>
              <div className="settings-hero-stage__langs" role="group" aria-label={t('لغة المعاينة', 'Preview language')}>
                <button
                  type="button"
                  className={`settings-hero-stage__lang${heroPreviewLang === 'ar' ? ' is-active' : ''}`}
                  aria-pressed={heroPreviewLang === 'ar'}
                  onClick={() => setHeroPreviewLang('ar')}
                >
                  العربية
                </button>
                <button
                  type="button"
                  className={`settings-hero-stage__lang${heroPreviewLang === 'en' ? ' is-active' : ''}`}
                  aria-pressed={heroPreviewLang === 'en'}
                  onClick={() => setHeroPreviewLang('en')}
                >
                  English
                </button>
              </div>
            </div>
            <div
              key={heroPreviewLang}
              className="settings-hero-stage__card hero-welcome-card border border-base-300/40"
              dir={heroPreviewLang === 'ar' ? 'rtl' : 'ltr'}
            >
              <p className="hero-welcome-eyebrow text-base-content/60 font-semibold mb-2">
                {(heroPreviewLang === 'ar' ? form.hero_eyebrow_ar : form.hero_eyebrow_en).trim() ||
                  (heroPreviewLang === 'ar' ? 'مرحباً' : 'Welcome')}
              </p>
              <h1 className="hero-welcome-title font-black text-balance tracking-tight">
                <span className="block">
                  {(heroPreviewLang === 'ar' ? form.hero_title_ar : form.hero_title_en).trim() ||
                    (heroPreviewLang === 'ar' ? 'استمتع أكثر' : 'FUN MORE')}
                </span>
                <span className="block mt-1.5 text-base-content/90">
                  {(heroPreviewLang === 'ar' ? form.hero_subtitle_ar : form.hero_subtitle_en).trim() ||
                    (heroPreviewLang === 'ar' ? 'ادفع أقل' : 'PAY LESS')}
                </span>
              </h1>
              <p className="hero-welcome-desc opacity-70 max-w-md mx-auto mt-3 text-pretty">
                {(heroPreviewLang === 'ar' ? form.hero_desc_ar : form.hero_desc_en).trim() ||
                  (heroPreviewLang === 'ar'
                    ? 'ألعاب واشتراكات ومفاتيح رقمية — استمتع أكثر وادفع أقل.'
                    : 'Games, subscriptions, and digital keys — more fun, less spend.')}
              </p>
            </div>
          </div>

          <div className="settings-hero-editors">
            <div
              className="settings-hero-col"
              dir="rtl"
              onFocusCapture={() => setHeroPreviewLang('ar')}
            >
              <div className="settings-hero-col__head">
                <span className="settings-hero-col__badge">AR</span>
                <h4 className="settings-hero-col__title">{t('العربية', 'Arabic')}</h4>
              </div>
              <div className="settings-hero-col__fields">
                <Field label={t('الترحيب', 'Eyebrow')} value={form.hero_eyebrow_ar} onChange={(v) => set('hero_eyebrow_ar', v)} />
                <Field label={t('العنوان الرئيسي', 'Title')} value={form.hero_title_ar} onChange={(v) => set('hero_title_ar', v)} />
                <Field label={t('العنوان الثانوي', 'Subtitle')} value={form.hero_subtitle_ar} onChange={(v) => set('hero_subtitle_ar', v)} />
                <Field label={t('الوصف', 'Description')} value={form.hero_desc_ar} onChange={(v) => set('hero_desc_ar', v)} multiline />
              </div>
            </div>
            <div
              className="settings-hero-col"
              dir="ltr"
              onFocusCapture={() => setHeroPreviewLang('en')}
            >
              <div className="settings-hero-col__head">
                <span className="settings-hero-col__badge">EN</span>
                <h4 className="settings-hero-col__title">{t('الإنجليزية', 'English')}</h4>
              </div>
              <div className="settings-hero-col__fields">
                <Field label={t('الترحيب', 'Eyebrow')} value={form.hero_eyebrow_en} onChange={(v) => set('hero_eyebrow_en', v)} />
                <Field label={t('العنوان الرئيسي', 'Title')} value={form.hero_title_en} onChange={(v) => set('hero_title_en', v)} />
                <Field label={t('العنوان الثانوي', 'Subtitle')} value={form.hero_subtitle_en} onChange={(v) => set('hero_subtitle_en', v)} />
                <Field label={t('الوصف', 'Description')} value={form.hero_desc_en} onChange={(v) => set('hero_desc_en', v)} multiline />
              </div>
            </div>
          </div>
        </SettingsPanel>

        <SettingsPanel
          id="settings-pages"
          icon={LayoutList}
          title={t('أقسام الصفحات', 'Page Sections')}
          hint={
            <>
              {t(
                'فعّل، عطّل، وأعد ترتيب أقسام الصفحة. تأثيرات المنتجات في',
                'Toggle and reorder page blocks. Product effects live in',
              )}{' '}
              <Link to="/dashboard/products" className="link link-hover font-semibold inline-flex items-center gap-1">
                {t('المنتجات', 'Products')} <ExternalLink size={12} aria-hidden />
              </Link>
              .
            </>
          }
        >
          <div className="settings-pages-stage">
            <div className="settings-pages-stage__toolbar">
              <p className="settings-subhead">{t('معاينة الترتيب', 'Order preview')}</p>
              <div
                className="settings-pages-stage__tabs"
                role="group"
                aria-label={t('صفحة المعاينة', 'Preview page')}
              >
                <button
                  type="button"
                  className={`settings-pages-stage__tab${pagesPreview === 'home' ? ' is-active' : ''}`}
                  aria-pressed={pagesPreview === 'home'}
                  onClick={() => setPagesPreview('home')}
                >
                  <Home size={13} aria-hidden />
                  {t('الرئيسية', 'Home')}
                </button>
                <button
                  type="button"
                  className={`settings-pages-stage__tab${pagesPreview === 'store' ? ' is-active' : ''}`}
                  aria-pressed={pagesPreview === 'store'}
                  onClick={() => setPagesPreview('store')}
                >
                  <Store size={13} aria-hidden />
                  {t('المتجر', 'Store')}
                </button>
              </div>
            </div>
            <ol
              key={pagesPreview}
              className="settings-pages-stage__stack"
              aria-label={t('الأقسام المفعّلة', 'Enabled sections')}
            >
              {pagesLiveStack.length === 0 ? (
                <li className="settings-pages-stage__empty">
                  {t('لا أقسام مفعّلة — الصفحة فارغة.', 'No sections on — page is empty.')}
                </li>
              ) : (
                pagesLiveStack.map((s, i) => {
                  const Icon = sectionIcon(s.id);
                  return (
                    <li key={s.id} className="settings-pages-stage__block" style={{ ['--i' as string]: i }}>
                      <span className="settings-pages-stage__n" aria-hidden>
                        {i + 1}
                      </span>
                      <span className="settings-pages-stage__ico" aria-hidden>
                        <Icon size={14} strokeWidth={2.25} />
                      </span>
                      <span className="settings-pages-stage__label">
                        {pagesPreviewLabels[s.id] ?? s.id}
                      </span>
                    </li>
                  );
                })
              )}
            </ol>
          </div>

          <div className="settings-pages-editors">
            <div onFocusCapture={() => setPagesPreview('home')}>
              <SectionEditor
                title={t('الصفحة الرئيسية', 'Homepage')}
                icon={Home}
                sections={homeSections}
                labels={homeSectionLabels}
                onToggle={(id) => toggleSection(setHomeSections, id)}
                onMove={(i, dir) => moveSection(setHomeSections, i, dir)}
                t={t}
              />
            </div>
            <div onFocusCapture={() => setPagesPreview('store')}>
              <SectionEditor
                title={t('تصفح المتجر', 'Explore Store')}
                icon={Store}
                sections={storeSections}
                labels={storeSectionLabels}
                onToggle={(id) => toggleSection(setStoreSections, id)}
                onMove={(i, dir) => moveSection(setStoreSections, i, dir)}
                t={t}
              />
            </div>
          </div>
        </SettingsPanel>

        <SettingsPanel
          id="settings-about"
          icon={Info}
          title={t('صفحة من نحن', 'About Page')}
          hint={t(
            'عنوان ومقدمة وبطاقات المزايا — معاينة حية لكل لغة.',
            'Title, intro, and feature cards — live preview per language.',
          )}
        >
          <div className="settings-about-stage">
            <div className="settings-about-stage__toolbar">
              <p className="settings-subhead">{t('معاينة الصفحة', 'Page preview')}</p>
              <div
                className="settings-about-stage__langs"
                role="group"
                aria-label={t('لغة المعاينة', 'Preview language')}
              >
                <button
                  type="button"
                  className={`settings-about-stage__lang${aboutPreviewLang === 'ar' ? ' is-active' : ''}`}
                  aria-pressed={aboutPreviewLang === 'ar'}
                  onClick={() => setAboutPreviewLang('ar')}
                >
                  العربية
                </button>
                <button
                  type="button"
                  className={`settings-about-stage__lang${aboutPreviewLang === 'en' ? ' is-active' : ''}`}
                  aria-pressed={aboutPreviewLang === 'en'}
                  onClick={() => setAboutPreviewLang('en')}
                >
                  English
                </button>
              </div>
            </div>
            <div
              key={aboutPreviewLang}
              className="settings-about-stage__page"
              dir={aboutPreviewLang === 'ar' ? 'rtl' : 'ltr'}
            >
              <h2 className="settings-about-stage__title text-balance">
                {(aboutPreviewLang === 'ar' ? form.about_title_ar : form.about_title_en).trim() ||
                  (aboutPreviewLang === 'ar' ? 'من نحن' : 'About Us')}
              </h2>
              <p className="settings-about-stage__intro text-pretty">
                {(aboutPreviewLang === 'ar' ? form.about_intro_ar : form.about_intro_en).trim() ||
                  (aboutPreviewLang === 'ar'
                    ? 'متجرك للألعاب والاشتراكات الرقمية — تسليم سريع وأسعار واضحة.'
                    : 'Your premier platform for digital games and premium subscriptions.')}
              </p>
              <ul className="settings-about-stage__grid">
                {aboutItems.map((item, i) => {
                  const Icon = getAboutIcon(item.icon);
                  const cardTitle =
                    (aboutPreviewLang === 'ar' ? item.title_ar : item.title_en).trim() ||
                    (aboutPreviewLang === 'ar' ? 'عنوان' : 'Title');
                  const cardDesc =
                    (aboutPreviewLang === 'ar' ? item.desc_ar : item.desc_en).trim() ||
                    (aboutPreviewLang === 'ar' ? 'وصف البطاقة' : 'Card description');
                  return (
                    <li
                      key={`${item.icon}-${i}`}
                      className="settings-about-stage__card"
                      style={{ ['--i' as string]: i }}
                    >
                      <span className="settings-about-stage__card-ico" aria-hidden>
                        <Icon size={16} strokeWidth={2.25} />
                      </span>
                      <span className="settings-about-stage__card-title">{cardTitle}</span>
                      <span className="settings-about-stage__card-desc">{cardDesc}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="settings-about-copy">
            <div
              className="settings-about-col"
              dir="rtl"
              onFocusCapture={() => setAboutPreviewLang('ar')}
            >
              <div className="settings-about-col__head">
                <span className="settings-about-col__badge">AR</span>
                <h4 className="settings-about-col__title">{t('العربية', 'Arabic')}</h4>
              </div>
              <div className="settings-about-col__fields">
                <Field
                  label={t('العنوان', 'Title')}
                  value={form.about_title_ar}
                  onChange={(v) => set('about_title_ar', v)}
                  placeholder="من نحن"
                />
                <Field
                  label={t('المقدمة', 'Intro')}
                  value={form.about_intro_ar}
                  onChange={(v) => set('about_intro_ar', v)}
                  multiline
                />
              </div>
            </div>
            <div
              className="settings-about-col"
              dir="ltr"
              onFocusCapture={() => setAboutPreviewLang('en')}
            >
              <div className="settings-about-col__head">
                <span className="settings-about-col__badge">EN</span>
                <h4 className="settings-about-col__title">{t('الإنجليزية', 'English')}</h4>
              </div>
              <div className="settings-about-col__fields">
                <Field
                  label={t('العنوان', 'Title')}
                  value={form.about_title_en}
                  onChange={(v) => set('about_title_en', v)}
                  placeholder="About Us"
                />
                <Field
                  label={t('المقدمة', 'Intro')}
                  value={form.about_intro_en}
                  onChange={(v) => set('about_intro_en', v)}
                  multiline
                />
              </div>
            </div>
          </div>

          <div className="settings-about-features">
            <div className="settings-about-features__head">
              <h4 className="settings-about-features__title">
                {t('بطاقات المزايا', 'Feature Cards')}
                <span className="settings-about-features__count tabular-nums">
                  {aboutItems.length}
                </span>
              </h4>
              <button type="button" onClick={addItem} className="btn btn-ghost btn-xs gap-1">
                <Plus size={12} aria-hidden /> {t('إضافة', 'Add')}
              </button>
            </div>

            <div className="settings-about-features__list">
              {aboutItems.map((item, i) => {
                const Icon = getAboutIcon(item.icon);
                return (
                  <div key={i} className="settings-about-item">
                    <div className="settings-about-item__head">
                      <span className="settings-about-item__n tabular-nums" aria-hidden>
                        {i + 1}
                      </span>
                      <span className="settings-about-item__preview" aria-hidden>
                        <Icon size={16} strokeWidth={2.25} />
                      </span>
                      <select
                        value={item.icon}
                        onChange={(e) => updateItem(i, { icon: e.target.value })}
                        className="select select-bordered select-sm settings-about-item__select"
                        aria-label={t('الأيقونة', 'Icon')}
                      >
                        {ABOUT_ICON_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <div className="settings-about-item__moves">
                        <button
                          type="button"
                          onClick={() => moveAboutItem(i, -1)}
                          disabled={i === 0}
                          className="btn btn-ghost btn-xs btn-square disabled:opacity-20"
                          aria-label={t('تحريك لأعلى', 'Move up')}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAboutItem(i, 1)}
                          disabled={i === aboutItems.length - 1}
                          className="btn btn-ghost btn-xs btn-square disabled:opacity-20"
                          aria-label={t('تحريك لأسفل', 'Move down')}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          disabled={aboutItems.length <= 1}
                          className="btn btn-ghost btn-xs btn-square text-error disabled:opacity-30"
                          aria-label={t('حذف', 'Remove')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="settings-about-item__fields">
                      <Field
                        label={t('العنوان (عربي)', 'Title (AR)')}
                        value={item.title_ar}
                        onChange={(v) => {
                          setAboutPreviewLang('ar');
                          updateItem(i, { title_ar: v });
                        }}
                      />
                      <Field
                        label={t('العنوان (إنجليزي)', 'Title (EN)')}
                        value={item.title_en}
                        onChange={(v) => {
                          setAboutPreviewLang('en');
                          updateItem(i, { title_en: v });
                        }}
                      />
                      <Field
                        label={t('الوصف (عربي)', 'Desc (AR)')}
                        value={item.desc_ar}
                        onChange={(v) => {
                          setAboutPreviewLang('ar');
                          updateItem(i, { desc_ar: v });
                        }}
                      />
                      <Field
                        label={t('الوصف (إنجليزي)', 'Desc (EN)')}
                        value={item.desc_en}
                        onChange={(v) => {
                          setAboutPreviewLang('en');
                          updateItem(i, { desc_en: v });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SettingsPanel>

        <SettingsPanel
          id="settings-deletion"
          icon={ShieldAlert}
          title={t('حذف الحساب', 'Account deletion')}
          tone="danger"
          hint={
            <>
              {t(
                'عدد أيام السماح بعد موافقتك قبل التنظيف الناعم. الطلبات الجديدة فقط. التنظيف اليومي يحتاج تفعيل الكرون مرة واحدة.',
                'Grace days after you approve before soft-purge. New approvals only. Daily cleanup needs cron enabled once.',
              )}{' '}
              <Link to="/dashboard/deletion-requests" className="link link-hover font-semibold inline-flex items-center gap-1">
                {t('طلبات حذف الحساب', 'Deletion requests')} <ExternalLink size={12} aria-hidden />
              </Link>
            </>
          }
        >
          <div className="max-w-xs">
            <Field
              label={t('عدد أيام السماح قبل الحذف النهائي', 'Grace days')}
              type="number"
              value={form.account_deletion_grace_days}
              onChange={(v) => set('account_deletion_grace_days', v.replace(/\D/g, '').slice(0, 4) || '')}
              placeholder="30"
            />
          </div>
        </SettingsPanel>

        <SettingsPanel
          id="settings-legal"
          icon={Scale}
          title={t('سياسة الخصوصية وشروط الخدمة', 'Privacy Policy and Terms of service')}
          hint={t(
            'حرّر الصفحتين هنا. فقرات الجسم: سطر فارغ بين كل فقرة. النقاط: سطر لكل نقطة.',
            'Edit both pages here. Body: blank line between paragraphs. Bullets: one line each.',
          )}
        >
          <div className="settings-legal-stage">
            <div className="settings-legal-stage__toolbar">
              <div
                className="settings-legal-stage__docs"
                role="tablist"
                aria-label={t('المستند', 'Document')}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={legalTab === 'privacy'}
                  className={`settings-legal-stage__doc${legalTab === 'privacy' ? ' is-active' : ''}`}
                  onClick={() => setLegalTab('privacy')}
                >
                  <Shield size={13} aria-hidden />
                  {t('الخصوصية', 'Privacy')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={legalTab === 'terms'}
                  className={`settings-legal-stage__doc${legalTab === 'terms' ? ' is-active' : ''}`}
                  onClick={() => setLegalTab('terms')}
                >
                  <FileText size={13} aria-hidden />
                  {t('الشروط', 'Terms')}
                </button>
              </div>
              <div
                className="settings-legal-stage__langs"
                role="group"
                aria-label={t('لغة المعاينة', 'Preview language')}
              >
                <button
                  type="button"
                  className={`settings-legal-stage__lang${legalPreviewLang === 'ar' ? ' is-active' : ''}`}
                  aria-pressed={legalPreviewLang === 'ar'}
                  onClick={() => setLegalPreviewLang('ar')}
                >
                  العربية
                </button>
                <button
                  type="button"
                  className={`settings-legal-stage__lang${legalPreviewLang === 'en' ? ' is-active' : ''}`}
                  aria-pressed={legalPreviewLang === 'en'}
                  onClick={() => setLegalPreviewLang('en')}
                >
                  English
                </button>
              </div>
            </div>
            {(() => {
              const liveDoc = legalTab === 'privacy' ? privacyDoc : termsDoc;
              const arPrev = legalPreviewLang === 'ar';
              const updated = (arPrev ? liveDoc.updated_ar : liveDoc.updated_en).trim();
              const bullets = arPrev ? liveDoc.short_bullets_ar : liveDoc.short_bullets_en;
              const pageTitle =
                legalTab === 'privacy'
                  ? arPrev
                    ? 'سياسة الخصوصية'
                    : 'Privacy Policy'
                  : arPrev
                    ? 'شروط الخدمة'
                    : 'Terms of Service';
              const previewSections = liveDoc.sections.slice(0, 2);
              return (
                <div
                  key={`${legalTab}-${legalPreviewLang}`}
                  className="settings-legal-stage__page"
                  dir={arPrev ? 'rtl' : 'ltr'}
                >
                  <p className="settings-legal-stage__updated font-mono">
                    {updated || (arPrev ? 'آخر تحديث' : 'Last updated')}
                  </p>
                  <h2 className="settings-legal-stage__title text-balance">{pageTitle}</h2>
                  <div className="settings-legal-stage__bullets">
                    <p className="settings-legal-stage__bullets-label">
                      {arPrev ? 'باختصار' : 'In short'}
                    </p>
                    <ul>
                      {(bullets.length ? bullets : [arPrev ? 'لا نقاط بعد.' : 'No bullets yet.']).map(
                        (b, i) => (
                          <li key={`${i}-${b.slice(0, 24)}`}>{b}</li>
                        ),
                      )}
                    </ul>
                  </div>
                  <ol className="settings-legal-stage__toc">
                    {previewSections.map((s, i) => {
                      const st = (arPrev ? s.title_ar : s.title_en).trim();
                      const body = (arPrev ? s.body_ar : s.body_en)[0]?.trim();
                      return (
                        <li key={i} className="settings-legal-stage__toc-item" style={{ ['--i' as string]: i }}>
                          <span className="settings-legal-stage__toc-title">
                            {st || (arPrev ? `قسم ${i + 1}` : `Section ${i + 1}`)}
                          </span>
                          {body ? (
                            <span className="settings-legal-stage__toc-body text-pretty">
                              {body.length > 140 ? `${body.slice(0, 140)}…` : body}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                    {liveDoc.sections.length > 2 ? (
                      <li className="settings-legal-stage__toc-more">
                        {arPrev
                          ? `+${liveDoc.sections.length - 2} أقسام أخرى`
                          : `+${liveDoc.sections.length - 2} more sections`}
                      </li>
                    ) : null}
                  </ol>
                  <p className="settings-legal-stage__link">
                    <Link
                      to={legalTab === 'privacy' ? '/privacy' : '/terms'}
                      className="link link-hover font-semibold inline-flex items-center gap-1"
                    >
                      {arPrev ? 'فتح الصفحة العامة' : 'Open public page'}
                      <ExternalLink size={12} aria-hidden />
                    </Link>
                  </p>
                </div>
              );
            })()}
          </div>

          {legalTab === 'privacy' ? (
            <PolicyEditor
              title={t('سياسة الخصوصية', 'Privacy policy')}
              icon={Shield}
              doc={privacyDoc}
              onChange={(next) => {
                setPrivacyDoc(next);
                markDirty();
              }}
              onFocusLang={setLegalPreviewLang}
              t={t}
            />
          ) : (
            <PolicyEditor
              title={t('شروط الخدمة', 'Terms of service')}
              icon={FileText}
              doc={termsDoc}
              onChange={(next) => {
                setTermsDoc(next);
                markDirty();
              }}
              onFocusLang={setLegalPreviewLang}
              t={t}
            />
          )}
        </SettingsPanel>

        {isOwner ? (
          <SettingsPanel
            id="settings-dev"
            icon={Code2}
            title={t('تطوير فقط', 'Dev only')}
            hint={t(
              'قفل حذف المنتج، وحدّ إنشاء العروض اليومي، وتسجيل الدخول بحسابين.',
              'Product delete lock, seller daily create cap, and dual-account sign-in.',
            )}
          >
            <label className="flex items-start gap-3 cursor-pointer max-w-xl">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mt-0.5"
                checked={parseProductAuthorLock(form.product_author_lock)}
                onChange={(e) => set('product_author_lock', e.target.checked ? 'true' : 'false')}
              />
              <span className="text-sm">
                <span className="font-medium block">
                  {t('قفل حذف المنتج بالمؤلّف', 'Product author delete lock')}
                </span>
                <span className="text-base-content/65 text-pretty">
                  {t(
                    'افتراضي: مفعّل. أنت تظهر كمؤلّف عند الإضافة، ويمكنك نسب المنتج لمدير.',
                    'Default: on. You are the author on add; you can attribute to an admin.',
                  )}
                </span>
              </span>
            </label>
            <label className="flex flex-col gap-1.5 max-w-xs mt-4">
              <span className="text-sm font-medium">
                {t('حد إضافة العروض اليومي للبائع', 'Seller daily listing create limit')}
              </span>
              <input
                type="number"
                min={0}
                max={100}
                className="input input-bordered input-sm"
                value={parseSellerDailyProductLimit(form.seller_daily_product_limit)}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  set(
                    'seller_daily_product_limit',
                    String(Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 3),
                  );
                }}
              />
              <span className="text-xs text-base-content/65 text-pretty">
                {t(
                  'افتراضي ٣ يومياً (UTC). ٠ = بلا حد.',
                  'Default 3 per UTC day. 0 = unlimited.',
                )}
              </span>
            </label>
            <div className="mt-5 max-w-xl space-y-2">
              <p className="text-sm font-medium">
                {t('تسجيل الدخول بحسابين', 'Multi-account sign-in')}
              </p>
              <p className="text-xs text-base-content/65 text-pretty">
                {t(
                  'المالك مفعّل دائماً. فعّل الأدوار الأخرى لتسمح لها بحفظ حساب ثانٍ والتبديل بينهما.',
                  'Owner is always on. Enable other roles to let them park a second account and switch.',
                )}
              </p>
              {(
                [
                  ['admin', 'مدير', 'Admin'],
                  ['moderator', 'مشرف', 'Moderator'],
                  ['support', 'دعم', 'Support'],
                  ['seller', 'بائع', 'Seller'],
                ] as const
              ).map(([key, ar, en]) => {
                const flags = parseMultiAccountRoles(form.multi_account_roles_json);
                return (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={flags[key]}
                      onChange={(e) => {
                        const next: MultiAccountRoleFlags = {
                          ...flags,
                          [key]: e.target.checked,
                        };
                        set('multi_account_roles_json', JSON.stringify(next));
                      }}
                    />
                    <span className="text-sm">{t(ar, en)}</span>
                  </label>
                );
              })}
            </div>
          </SettingsPanel>
        ) : null}
      </div>
    </div>
  );
}

function SettingsPanel({
  id,
  icon: Icon,
  title,
  hint,
  children,
  tone,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  tone?: 'danger';
}) {
  return (
    <section
      id={id}
      className={`settings-panel${tone === 'danger' ? ' settings-panel--danger' : ''}`}
    >
      <header className="settings-panel__head">
        <h3 className="settings-panel__title">
          <span className="settings-panel__icon" aria-hidden>
            <Icon size={18} strokeWidth={2.25} />
          </span>
          {title}
        </h3>
        {hint ? <p className="settings-panel__hint text-pretty">{hint}</p> : null}
      </header>
      <div className="settings-panel__body">{children}</div>
    </section>
  );
}

function PolicyEditor({
  title,
  icon: DocIcon,
  doc,
  onChange,
  onFocusLang,
  t,
}: {
  title: string;
  icon: LucideIcon;
  doc: PolicyDocData;
  onChange: (next: PolicyDocData) => void;
  onFocusLang: (lang: 'ar' | 'en') => void;
  t: TFn;
}) {
  const patch = (p: Partial<PolicyDocData>) => onChange({ ...doc, ...p });
  const patchSection = (i: number, p: Partial<PolicySection>) => {
    onChange({
      ...doc,
      sections: doc.sections.map((s, idx) => (idx === i ? { ...s, ...p } : s)),
    });
  };
  const addSection = () => {
    onChange({
      ...doc,
      sections: [
        ...doc.sections,
        { title_ar: '', title_en: '', body_ar: [''], body_en: [''] },
      ],
    });
  };
  const removeSection = (i: number) => {
    if (doc.sections.length <= 1) return;
    onChange({ ...doc, sections: doc.sections.filter((_, idx) => idx !== i) });
  };
  const moveSection = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= doc.sections.length) return;
    const next = [...doc.sections];
    [next[index], next[j]] = [next[j], next[index]];
    onChange({ ...doc, sections: next });
  };

  return (
    <div className="settings-legal-editor">
      <div className="settings-legal-editor__head">
        <h4 className="settings-legal-editor__title">
          <span className="settings-legal-editor__icon" aria-hidden>
            <DocIcon size={15} strokeWidth={2.25} />
          </span>
          {title}
        </h4>
        <span className="settings-legal-editor__count tabular-nums">
          {doc.sections.length}
        </span>
      </div>

      <div className="settings-legal-meta">
        <div className="settings-legal-meta__col" dir="rtl" onFocusCapture={() => onFocusLang('ar')}>
          <div className="settings-legal-meta__badge-row">
            <span className="settings-legal-meta__badge">AR</span>
          </div>
          <Field
            label={t('تاريخ التحديث', 'Updated')}
            value={doc.updated_ar}
            onChange={(v) => patch({ updated_ar: v })}
          />
          <Field
            label={t('ملخص سريع (سطر لكل نقطة)', 'Short bullets (one per line)')}
            value={joinBullets(doc.short_bullets_ar)}
            onChange={(v) => patch({ short_bullets_ar: splitBullets(v) })}
            multiline
          />
        </div>
        <div className="settings-legal-meta__col" dir="ltr" onFocusCapture={() => onFocusLang('en')}>
          <div className="settings-legal-meta__badge-row">
            <span className="settings-legal-meta__badge">EN</span>
          </div>
          <Field
            label={t('تاريخ التحديث', 'Updated')}
            value={doc.updated_en}
            onChange={(v) => patch({ updated_en: v })}
          />
          <Field
            label={t('ملخص سريع (سطر لكل نقطة)', 'Short bullets (one per line)')}
            value={joinBullets(doc.short_bullets_en)}
            onChange={(v) => patch({ short_bullets_en: splitBullets(v) })}
            multiline
          />
        </div>
      </div>

      <div className="settings-legal-sections">
        <div className="settings-legal-sections__head">
          <h5 className="settings-legal-sections__title">{t('الأقسام', 'Sections')}</h5>
          <button type="button" onClick={addSection} className="btn btn-ghost btn-xs gap-1">
            <Plus size={12} aria-hidden /> {t('إضافة قسم', 'Add section')}
          </button>
        </div>
        <div className="settings-legal-sections__list">
          {doc.sections.map((s, i) => (
            <div key={i} className="settings-legal-section">
              <div className="settings-legal-section__head">
                <span className="settings-legal-section__n tabular-nums" aria-hidden>
                  {i + 1}
                </span>
                <span className="settings-legal-section__name text-balance">
                  {(s.title_en || s.title_ar).trim() || t('قسم بدون عنوان', 'Untitled section')}
                </span>
                <div className="settings-legal-section__moves">
                  <button
                    type="button"
                    onClick={() => moveSection(i, -1)}
                    disabled={i === 0}
                    className="btn btn-ghost btn-xs btn-square disabled:opacity-20"
                    aria-label={t('تحريك لأعلى', 'Move up')}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(i, 1)}
                    disabled={i === doc.sections.length - 1}
                    className="btn btn-ghost btn-xs btn-square disabled:opacity-20"
                    aria-label={t('تحريك لأسفل', 'Move down')}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(i)}
                    disabled={doc.sections.length <= 1}
                    className="btn btn-ghost btn-xs btn-square text-error disabled:opacity-30"
                    aria-label={t('حذف', 'Remove')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="settings-legal-section__fields">
                <Field
                  label={t('عنوان (عربي)', 'Title (AR)')}
                  value={s.title_ar}
                  onChange={(v) => {
                    onFocusLang('ar');
                    patchSection(i, { title_ar: v });
                  }}
                />
                <Field
                  label={t('عنوان (إنجليزي)', 'Title (EN)')}
                  value={s.title_en}
                  onChange={(v) => {
                    onFocusLang('en');
                    patchSection(i, { title_en: v });
                  }}
                />
                <Field
                  label={t('النص (عربي)', 'Body (AR)')}
                  value={joinParagraphs(s.body_ar)}
                  onChange={(v) => {
                    onFocusLang('ar');
                    patchSection(i, { body_ar: splitParagraphs(v) });
                  }}
                  multiline
                />
                <Field
                  label={t('النص (إنجليزي)', 'Body (EN)')}
                  value={joinParagraphs(s.body_en)}
                  onChange={(v) => {
                    onFocusLang('en');
                    patchSection(i, { body_en: splitParagraphs(v) });
                  }}
                  multiline
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionEditor({
  title, icon: GroupIcon, sections, labels, onToggle, onMove, t,
}: {
  title: string;
  icon: LucideIcon;
  sections: PageSection[];
  labels: Record<string, string>;
  onToggle: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  t: TFn;
}) {
  const enabledCount = sections.filter((s) => s.enabled).length;
  return (
    <div className="settings-sec-group">
      <div className="settings-sec-group__head">
        <h4 className="settings-sec-group__title">
          <span className="settings-sec-group__icon" aria-hidden>
            <GroupIcon size={15} strokeWidth={2.25} />
          </span>
          {title}
        </h4>
        <span className="settings-sec-group__count tabular-nums">
          {enabledCount}/{sections.length}
        </span>
      </div>
      <ul className="settings-sec-group__list">
        {sections.map((s, i) => {
          const Icon = sectionIcon(s.id);
          return (
            <li key={s.id} className={`settings-sec-row${s.enabled ? '' : ' is-off'}`}>
              <span className="settings-sec-row__index tabular-nums" aria-hidden>
                {i + 1}
              </span>
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={s.enabled}
                onChange={() => onToggle(s.id)}
                aria-label={labels[s.id] ?? s.id}
              />
              <span className="settings-sec-row__ico" aria-hidden>
                <Icon size={14} strokeWidth={2.25} />
              </span>
              <span className="settings-sec-row__label">{labels[s.id] ?? s.id}</span>
              <div className="settings-sec-row__moves">
                <button
                  type="button"
                  onClick={() => onMove(i, -1)}
                  disabled={i === 0}
                  className="btn btn-ghost btn-xs btn-square disabled:opacity-20"
                  aria-label={t('تحريك لأعلى', 'Move up')}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(i, 1)}
                  disabled={i === sections.length - 1}
                  className="btn btn-ghost btn-xs btn-square disabled:opacity-20"
                  aria-label={t('تحريك لأسفل', 'Move down')}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({
  label, value, onChange, multiline, type = 'text', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="settings-field">
      <span className="profile-field-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="textarea textarea-bordered w-full text-sm resize-y min-h-[5rem]"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input input-bordered w-full text-sm"
        />
      )}
    </label>
  );
}

function ColorField({
  label, value, onChange, onClear, clearLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  clearLabel: string;
}) {
  const valid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
  const preview = valid ? value : '#2dd4bf';
  return (
    <div className="settings-color-field">
      <span className="profile-field-label">{label}</span>
      <div className="settings-color-field__row">
        <label className="settings-color-field__picker" style={{ ['--pick' as string]: preview }}>
          <input
            type="color"
            value={preview}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2dd4bf"
          spellCheck={false}
          className="input input-bordered input-sm flex-1 font-mono text-sm settings-color-field__hex"
        />
        {value ? (
          <button type="button" onClick={onClear} className="btn btn-ghost btn-square btn-sm" aria-label={clearLabel}>
            <RotateCcw size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
