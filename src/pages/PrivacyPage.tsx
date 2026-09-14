import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { useSiteSettings } from '../hooks/useSiteSettings';
import {
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_TERMS_POLICY,
  parsePolicyDoc,
  type PolicyDocData,
} from '../lib/policyDocs';

type Section = { title: string; body: string[] };

function PolicyDoc({
  title,
  shortTitle,
  shortBullets,
  sections,
  updated,
  siblingHref,
  siblingLabel,
}: {
  title: string;
  shortTitle: string;
  shortBullets: string[];
  sections: Section[];
  updated: string;
  siblingHref: string;
  siblingLabel: string;
}) {
  const { t, contentDir } = useI18n();
  return (
    <div className="min-h-screen bg-base-100 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6" dir={contentDir}>
        <p className="text-xs text-base-content/65 mb-3">{updated}</p>
        <h1 className="text-3xl md:text-4xl font-black text-balance mb-6">{title}</h1>

        <div className="rounded-xl border border-base-300 bg-base-200/60 p-5 mb-10">
          <h2 className="text-sm font-semibold tracking-wide text-base-content/70 mb-3">{shortTitle}</h2>
          <ul className="list-disc ps-5 space-y-2 text-sm leading-relaxed text-base-content/80 text-pretty">
            {shortBullets.map((b, i) => (
              <li key={`${i}-${b.slice(0, 32)}`}>{b}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-8">
          {sections.map((s, si) => (
            <section key={`${si}-${s.title}`}>
              <h2 className="text-lg font-bold mb-2">{s.title}</h2>
              {s.body.map((p, pi) => (
                <p key={pi} className="text-sm text-base-content/80 leading-relaxed text-pretty mb-2">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm text-base-content/70">
          <Link to={siblingHref} className="link link-hover link-primary">
            {siblingLabel}
          </Link>
          {' · '}
          <Link to="/about" className="link link-hover">
            {t('من نحن', 'About us')}
          </Link>
          {' · '}
          <Link to="/updates" className="link link-hover">
            {t('التحديثات', 'Updates')}
          </Link>
        </p>
      </div>
    </div>
  );
}

function localizePolicy(doc: PolicyDocData, ar: boolean): {
  updated: string;
  shortBullets: string[];
  sections: Section[];
} {
  return {
    updated: ar ? doc.updated_ar : doc.updated_en,
    shortBullets: ar ? doc.short_bullets_ar : doc.short_bullets_en,
    sections: doc.sections.map((s) => ({
      title: ar ? s.title_ar : s.title_en,
      body: ar ? s.body_ar : s.body_en,
    })),
  };
}

export function PrivacyPage() {
  const { t, lang } = useI18n();
  const ar = lang === 'ar';
  const { settings } = useSiteSettings();
  const doc = parsePolicyDoc(settings.privacy_policy_json, DEFAULT_PRIVACY_POLICY);
  const localized = localizePolicy(doc, ar);

  usePageMeta({
    title: t('سياسة الخصوصية', 'Privacy policy'),
    description: t(
      'كيف تجمع HEVEN.FUN بياناتك وتستخدمها وتحميها.',
      'How HEVEN.FUN collects, uses, and protects your data.',
    ),
  });

  return (
    <PolicyDoc
      title={t('سياسة الخصوصية', 'Privacy policy')}
      shortTitle={t('ملخص سريع', 'Short version')}
      updated={localized.updated}
      siblingHref="/terms"
      siblingLabel={t('شروط الخدمة', 'Terms of service')}
      shortBullets={localized.shortBullets}
      sections={localized.sections}
    />
  );
}

export function TermsPage() {
  const { t, lang } = useI18n();
  const ar = lang === 'ar';
  const { settings } = useSiteSettings();
  const doc = parsePolicyDoc(settings.terms_policy_json, DEFAULT_TERMS_POLICY);
  const localized = localizePolicy(doc, ar);

  usePageMeta({
    title: t('شروط الخدمة', 'Terms of service'),
    description: t(
      'شروط استخدام متجر HEVEN.FUN للمنتجات الرقمية.',
      'Terms of use for the HEVEN.FUN digital store.',
    ),
  });

  return (
    <PolicyDoc
      title={t('شروط الخدمة', 'Terms of service')}
      shortTitle={t('ملخص سريع', 'Short version')}
      updated={localized.updated}
      siblingHref="/privacy"
      siblingLabel={t('سياسة الخصوصية', 'Privacy policy')}
      shortBullets={localized.shortBullets}
      sections={localized.sections}
    />
  );
}
