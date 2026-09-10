import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { parseUserChangelog } from '../lib/changelogs';

export default function ChangelogPage() {
  const { t, lang, contentDir } = useI18n();
  const { settings } = useSiteSettings();
  const entries = parseUserChangelog(settings.user_changelog_json);
  const ar = lang === 'ar';

  usePageMeta({
    title: t('التحديثات', 'Updates'),
    description: t(
      'أحدث التحديثات على متجر HEVEN.FUN.',
      'Latest updates to the HEVEN.FUN store.',
    ),
  });

  return (
    <div className="min-h-screen bg-base-100 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6" dir={contentDir}>
        <h1 className="text-3xl md:text-4xl font-black text-balance mb-3">
          {t('التحديثات', 'Updates')}
        </h1>
        <p className="text-sm text-base-content/70 mb-10 text-pretty">
          {t(
            'تحديثات المتجر التي ينشرها فريق الموقع.',
            'Store updates published by the site team.',
          )}
        </p>

        {entries.length === 0 ? (
          <p className="text-sm text-base-content/60">
            {t('لا توجد تحديثات منشورة بعد.', 'No updates published yet.')}
          </p>
        ) : (
          <ol className="space-y-8">
            {entries.map((e) => (
              <li key={e.id} className="border-s-2 border-primary/40 ps-4">
                {e.date && (
                  <p className="text-xs text-base-content/55 mb-1 font-mono">{e.date}</p>
                )}
                <h2 className="text-lg font-bold mb-2">
                  {ar ? e.title_ar || e.title_en : e.title_en || e.title_ar}
                </h2>
                <p className="text-sm text-base-content/80 leading-relaxed text-pretty whitespace-pre-wrap">
                  {ar ? e.body_ar || e.body_en : e.body_en || e.body_ar}
                </p>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-12 text-sm text-base-content/70">
          <Link to="/about" className="link link-hover">
            {t('من نحن', 'About us')}
          </Link>
          {' · '}
          <Link to="/privacy" className="link link-hover">
            {t('سياسة الخصوصية', 'Privacy policy')}
          </Link>
        </p>
      </div>
    </div>
  );
}
