import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { parseAboutItems } from '../lib/siteSettings';
import { getAboutIcon } from '../lib/aboutIcons';
import Reveal from '../components/ui/Reveal';

const DEFAULT_TITLE_AR = 'من نحن';
const DEFAULT_TITLE_EN = 'About Us';
const DEFAULT_INTRO_AR =
  'متجرك للألعاب والاشتراكات الرقمية — منتجات مختارة بأسعار واضحة وتسليم سريع.';
const DEFAULT_INTRO_EN =
  'Your premier platform for digital games and premium subscriptions. We strive to offer the best products at the best prices.';

export default function AboutPage() {
  const { lang, t, contentDir } = useI18n();
  const { settings } = useSiteSettings();

  const items = parseAboutItems(settings.about_items);
  const title = lang === 'ar'
    ? settings.about_title_ar || DEFAULT_TITLE_AR
    : settings.about_title_en || DEFAULT_TITLE_EN;
  const intro = lang === 'ar'
    ? settings.about_intro_ar || DEFAULT_INTRO_AR
    : settings.about_intro_en || DEFAULT_INTRO_EN;
  usePageMeta({ title: title || t(DEFAULT_TITLE_AR, DEFAULT_TITLE_EN), description: intro });

  return (
    <div className="min-h-screen bg-base-100 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6" dir={contentDir}>
        <Reveal className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black mb-4">{title}</h1>
          <p className="text-base-content/75 leading-relaxed max-w-2xl mx-auto">{intro}</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item, i) => {
            const Icon = getAboutIcon(item.icon);
            return (
              <Reveal
                key={`${item.icon}-${i}`}
                delay={i * 80}
                className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors"
              >
                <div className="card-body">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary mb-2">
                    <Icon size={20} />
                  </div>
                  <h3 className="card-title text-base">
                    {lang === 'ar' ? item.title_ar : item.title_en}
                  </h3>
                  <p className="text-sm text-base-content/70">
                    {lang === 'ar' ? item.desc_ar : item.desc_en}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
