import { Save, Loader2, Check, LayoutList } from 'lucide-react';
import { isCategoryProductsSection, type PageSection, type HoverCardsMode, type ProductFindMoreMode, type SiteSettingsMap } from '../../../lib/siteSettings';
import { type AuraStyle } from '../../../lib/productEffects';
import { type Category } from '../../../types';
import { type UseMutationResult } from '@tanstack/react-query';
import { focusRing, SECTION_SHELL, SECTION_TITLE, type BuilderProduct, type SectionsEditorTab } from './constants';
import SectionEditor from './SectionEditor';
import SectionsWidgetsAPanel from './SectionsWidgetsAPanel';
import SectionsWidgetsBPanel from './SectionsWidgetsBPanel';

interface SectionsSectionProps {
  addCategoryId: string;
  addCategorySection: () => void;
  addStoreCategoryId: string;
  addStoreCategorySection: () => void;
  adsAura: AuraStyle;
  adsBladeColor: string;
  adsBladeEnabled: boolean;
  adsBladeOpacity: number;
  adsBladeSize: 'sm' | 'md' | 'lg';
  adsBladeTextAr: string;
  adsBladeTextEn: string;
  adsGlareHover: boolean;
  adsIntervalSec: number;
  adsProductIds: string[];
  adsSearch: string;
  adsSize: 'sm' | 'md' | 'lg' | 'xl';
  categorySectionCount: number;
  categoryTree: Category[];
  drawerCatsEnabled: boolean;
  findMoreEnabled: boolean;
  findMoreIntervalSec: number;
  findMoreMode: ProductFindMoreMode;
  findMoreProductIds: string[];
  findMoreSearch: string;
  findMoreSlots: number;
  homeSectionLabels: Record<string, string>;
  homeSections: PageSection[];
  hoverCount: number;
  hoverMode: HoverCardsMode;
  hoverProductIds: string[];
  hoverSearch: string;
  lang: 'ar' | 'en';
  merchMotionMode: 'off' | 'auto' | 'always';
  moveSection: (setter: React.Dispatch<React.SetStateAction<PageSection[]>>, index: number, dir: -1 | 1) => void;
  privacyBanner: boolean;
  products: BuilderProduct[];
  productsLoading: boolean;
  removeHomeSection: (id: string) => void;
  removeStoreSection: (id: string) => void;
  saveMutation: UseMutationResult<void, Error, { updates: Partial<SiteSettingsMap>; userId: string; }, unknown>;
  saveSections: () => Promise<void>;
  sectionsDirty: boolean;
  sectionsSaved: boolean;
  sectionsTab: SectionsEditorTab;
  setAddCategoryId: React.Dispatch<React.SetStateAction<string>>;
  setAddStoreCategoryId: React.Dispatch<React.SetStateAction<string>>;
  setAdsAura: React.Dispatch<React.SetStateAction<AuraStyle>>;
  setAdsBladeColor: React.Dispatch<React.SetStateAction<string>>;
  setAdsBladeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setAdsBladeOpacity: React.Dispatch<React.SetStateAction<number>>;
  setAdsBladeSize: React.Dispatch<React.SetStateAction<'sm' | 'md' | 'lg'>>;
  setAdsBladeTextAr: React.Dispatch<React.SetStateAction<string>>;
  setAdsBladeTextEn: React.Dispatch<React.SetStateAction<string>>;
  setAdsGlareHover: React.Dispatch<React.SetStateAction<boolean>>;
  setAdsIntervalSec: React.Dispatch<React.SetStateAction<number>>;
  setAdsProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  setAdsSearch: React.Dispatch<React.SetStateAction<string>>;
  setAdsSize: React.Dispatch<React.SetStateAction<'sm' | 'md' | 'lg' | 'xl'>>;
  setDrawerCatsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setFindMoreEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setFindMoreIntervalSec: React.Dispatch<React.SetStateAction<number>>;
  setFindMoreMode: React.Dispatch<React.SetStateAction<ProductFindMoreMode>>;
  setFindMoreProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  setFindMoreSearch: React.Dispatch<React.SetStateAction<string>>;
  setFindMoreSlots: React.Dispatch<React.SetStateAction<number>>;
  setHomeSections: React.Dispatch<React.SetStateAction<PageSection[]>>;
  setHoverCount: React.Dispatch<React.SetStateAction<number>>;
  setHoverMode: React.Dispatch<React.SetStateAction<HoverCardsMode>>;
  setHoverProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  setHoverSearch: React.Dispatch<React.SetStateAction<string>>;
  setMerchMotionMode: React.Dispatch<React.SetStateAction<'off' | 'auto' | 'always'>>;
  setPrivacyBanner: React.Dispatch<React.SetStateAction<boolean>>;
  setProductsTick: React.Dispatch<React.SetStateAction<number>>;
  setSectionsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setSectionsTab: React.Dispatch<React.SetStateAction<SectionsEditorTab>>;
  setStoreCatTreeExpand: React.Dispatch<React.SetStateAction<boolean>>;
  setStoreSections: React.Dispatch<React.SetStateAction<PageSection[]>>;
  storeCatTreeExpand: boolean;
  storeCategorySectionCount: number;
  storeSectionLabels: Record<string, string>;
  storeSections: PageSection[];
  t: (ar: string, en: string) => string;
  toggleSection: (setter: React.Dispatch<React.SetStateAction<PageSection[]>>, id: string) => void;
  usedCategorySectionIds: Set<string>;
  usedStoreCategorySectionIds: Set<string>;
}

export default function SectionsSection({
  addCategoryId,
  addCategorySection,
  addStoreCategoryId,
  addStoreCategorySection,
  adsAura,
  adsBladeColor,
  adsBladeEnabled,
  adsBladeOpacity,
  adsBladeSize,
  adsBladeTextAr,
  adsBladeTextEn,
  adsGlareHover,
  adsIntervalSec,
  adsProductIds,
  adsSearch,
  adsSize,
  categorySectionCount,
  categoryTree,
  drawerCatsEnabled,
  findMoreEnabled,
  findMoreIntervalSec,
  findMoreMode,
  findMoreProductIds,
  findMoreSearch,
  findMoreSlots,
  homeSectionLabels,
  homeSections,
  hoverCount,
  hoverMode,
  hoverProductIds,
  hoverSearch,
  lang,
  merchMotionMode,
  moveSection,
  privacyBanner,
  products,
  productsLoading,
  removeHomeSection,
  removeStoreSection,
  saveMutation,
  saveSections,
  sectionsDirty,
  sectionsSaved,
  sectionsTab,
  setAddCategoryId,
  setAddStoreCategoryId,
  setAdsAura,
  setAdsBladeColor,
  setAdsBladeEnabled,
  setAdsBladeOpacity,
  setAdsBladeSize,
  setAdsBladeTextAr,
  setAdsBladeTextEn,
  setAdsGlareHover,
  setAdsIntervalSec,
  setAdsProductIds,
  setAdsSearch,
  setAdsSize,
  setDrawerCatsEnabled,
  setFindMoreEnabled,
  setFindMoreIntervalSec,
  setFindMoreMode,
  setFindMoreProductIds,
  setFindMoreSearch,
  setFindMoreSlots,
  setHomeSections,
  setHoverCount,
  setHoverMode,
  setHoverProductIds,
  setHoverSearch,
  setMerchMotionMode,
  setPrivacyBanner,
  setProductsTick,
  setSectionsSaved,
  setSectionsTab,
  setStoreCatTreeExpand,
  setStoreSections,
  storeCatTreeExpand,
  storeCategorySectionCount,
  storeSectionLabels,
  storeSections,
  t,
  toggleSection,
  usedCategorySectionIds,
  usedStoreCategorySectionIds,
}: SectionsSectionProps) {
  return (
      <section id="builder-sections" className={SECTION_SHELL} aria-labelledby="builder-sections-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 id="builder-sections-title" className={SECTION_TITLE}>
            <span className="size-8 rounded-lg border border-base-content/25 bg-base-100 text-base-content/80 flex items-center justify-center shrink-0">
              <LayoutList size={15} aria-hidden />
            </span>
            {t('أقسام الصفحات', 'Page sections')}
          </h3>
          <button
            type="button"
            onClick={saveSections}
            disabled={!sectionsDirty || saveMutation.isPending}
            className={`btn btn-primary btn-sm gap-1.5 self-start ${focusRing}`}
          >
            {saveMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : sectionsSaved && !sectionsDirty ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            {sectionsSaved && !sectionsDirty
              ? t('تم الحفظ', 'Saved')
              : t('حفظ الأقسام', 'Save sections')}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('محرّر الأقسام', 'Sections editor')}>
          {(
            [
              { id: 'order' as const, ar: 'الترتيب', en: 'Order' },
              { id: 'widgets' as const, ar: 'الودجات', en: 'Widgets' },
              { id: 'site' as const, ar: 'الموقع', en: 'Site' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={sectionsTab === tab.id}
              className={`btn btn-xs gap-1 border ${focusRing} ${
                sectionsTab === tab.id
                  ? 'border-base-content/30 bg-base-100 text-base-content'
                  : 'btn-ghost border-base-300 text-base-content/70'
              }`}
              onClick={() => setSectionsTab(tab.id)}
            >
              <span className="font-semibold tracking-tight">{t(tab.ar, tab.en)}</span>
            </button>
          ))}
        </div>

        {sectionsTab === 'site' ? (
          <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3.5 cursor-pointer transition-colors has-[:checked]:border-warning/40 has-[:checked]:bg-warning/5">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={privacyBanner}
            onChange={(e) => {
              setPrivacyBanner(e.target.checked);
              setSectionsSaved(false);
            }}
          />
          <span className="text-start">
            <span className="block text-sm font-semibold tracking-tight">
              {t('رسالة موافقة الخصوصية', 'Privacy consent message')}
            </span>
            <span className="block text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'اعرض بانر قبول/رفض التحليلات. الرفض يوقف Databuddy. إن عطّلت الرسالة يختفي البانر لكن التحليلات تبقى متوقفة حتى يقبل الزائر من التفضيلات.',
                'Show Accept/Decline analytics banner. Decline blocks Databuddy. Turning the message off hides the banner, but analytics stay off until the visitor accepts in prefs.'
              )}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3.5 cursor-pointer transition-colors has-[:checked]:border-info/40 has-[:checked]:bg-info/5">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={drawerCatsEnabled}
            onChange={(e) => {
              setDrawerCatsEnabled(e.target.checked);
              setSectionsSaved(false);
            }}
          />
          <span className="text-start">
            <span className="block text-sm font-semibold tracking-tight">
              {t('فئات قائمة الجوال', 'Drawer categories')}
            </span>
            <span className="block text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'اعرض قسم الفئات (مع عنوان Categories) في قائمة الهامبرغر.',
                'Show the Categories section (label + links) in the hamburger drawer.',
              )}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3.5 cursor-pointer transition-colors has-[:checked]:border-info/40 has-[:checked]:bg-info/5">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={storeCatTreeExpand}
            onChange={(e) => {
              setStoreCatTreeExpand(e.target.checked);
              setSectionsSaved(false);
            }}
          />
          <span className="text-start">
            <span className="block text-sm font-semibold tracking-tight">
              {t('توسيع تصنيفات المتجر', 'Store category expand')}
            </span>
            <span className="block text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'أزرار التوسيع بجانب شرائح التصنيف في تصفح المتجر. معطّلة افتراضياً — تظهر التصنيفات الرئيسية فقط.',
                'Expand chevrons beside category chips on Explore Store. Off by default — top-level chips only.',
              )}
            </span>
          </span>
        </label>
          </div>
        ) : null}

        {sectionsTab === 'order' ? (
          <div className="space-y-4">
        <SectionEditor
          title={t('الصفحة الرئيسية', 'Homepage')}
          sections={homeSections}
          labels={homeSectionLabels}
          onToggle={(id) => toggleSection(setHomeSections, id)}
          onMove={(i, dir) => moveSection(setHomeSections, i, dir)}
          onRemove={removeHomeSection}
          canRemove={isCategoryProductsSection}
          t={t}
        />
        <SectionEditor
          title={t('تصفح المتجر', 'Explore Store')}
          sections={storeSections}
          labels={storeSectionLabels}
          onToggle={(id) => toggleSection(setStoreSections, id)}
          onMove={(i, dir) => moveSection(setStoreSections, i, dir)}
          onRemove={removeStoreSection}
          canRemove={isCategoryProductsSection}
          t={t}
        />
          </div>
        ) : null}

        {sectionsTab === 'widgets' ? (
          <div className="space-y-4">
<SectionsWidgetsAPanel {...{ addCategoryId, addCategorySection, addStoreCategoryId, addStoreCategorySection, adsAura, adsBladeColor, adsBladeEnabled, adsBladeOpacity, adsBladeSize, adsBladeTextAr, adsBladeTextEn, adsGlareHover, adsIntervalSec, adsProductIds, adsSearch, adsSize, categorySectionCount, categoryTree, lang, merchMotionMode, products, productsLoading, setAddCategoryId, setAddStoreCategoryId, setAdsAura, setAdsBladeColor, setAdsBladeEnabled, setAdsBladeOpacity, setAdsBladeSize, setAdsBladeTextAr, setAdsBladeTextEn, setAdsGlareHover, setAdsIntervalSec, setAdsProductIds, setAdsSearch, setAdsSize, setMerchMotionMode, setProductsTick, setSectionsSaved, storeCategorySectionCount, t, usedCategorySectionIds, usedStoreCategorySectionIds }} />
<SectionsWidgetsBPanel {...{ findMoreEnabled, findMoreIntervalSec, findMoreMode, findMoreProductIds, findMoreSearch, findMoreSlots, hoverCount, hoverMode, hoverProductIds, hoverSearch, lang, products, productsLoading, setFindMoreEnabled, setFindMoreIntervalSec, setFindMoreMode, setFindMoreProductIds, setFindMoreSearch, setFindMoreSlots, setHoverCount, setHoverMode, setHoverProductIds, setHoverSearch, setSectionsSaved, t }} />
          </div>
        ) : null}
      </section>
  );
}
