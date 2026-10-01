import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Twitter, Youtube, Send } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { parseFooterNav } from '../../lib/siteSettings';
import { safeHref } from '../../lib/safeHref';
import { useAuthStore } from '../../stores/authStore';
import BrandLogo from '../ui/BrandLogo';

function FooterHref({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const safe = safeHref(href);
  if (!safe) return null;
  const external = /^https:\/\//i.test(safe) || safe.startsWith('mailto:');
  if (external) {
    return (
      <a
        href={safe}
        className={className}
        {...(safe.startsWith('https') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={safe} className={className}>
      {children}
    </Link>
  );
}

const AUTH_HREFS = new Set(['/auth/login', '/auth/register']);

export default function Footer() {
  const { t, lang } = useI18n();
  const { settings } = useSiteSettings();
  const user = useAuthStore((s) => s.user);
  const columns = parseFooterNav(settings.footer_nav).filter((c) => c.enabled);

  const ownerDescription =
    lang === 'ar' ? settings.footer_description_ar : settings.footer_description_en;
  const tagline = settings.site_tagline?.trim() ?? '';
  const legacyTagline =
    /play more|have fun more|العب أكثر|مرح أكثر/i.test(tagline);
  const description =
    ownerDescription?.trim() ||
    (!legacyTagline && tagline) ||
    t('استمتع أكثر ادفع أقل', 'FUN MORE. PAY LESS.');

  const socials = [
    { key: 'twitter', href: settings.social_twitter, icon: Twitter, label: 'Twitter' },
    { key: 'youtube', href: settings.social_youtube, icon: Youtube, label: 'YouTube' },
    { key: 'telegram', href: settings.social_telegram, icon: Send, label: 'Telegram' },
  ]
    .map((s) => ({ ...s, href: safeHref(s.href) }))
    .filter((s): s is { key: string; href: string; icon: typeof Twitter; label: string } =>
      Boolean(s.href),
    );

  const year = new Date().getFullYear();

  return (
    <>
      {columns.length > 0 && (
        <div className="footer sm:footer-horizontal bg-base-200 text-base-content p-10 border-t border-base-300 place-content-center justify-items-center gap-x-20 sm:gap-x-28 gap-y-8">
          {columns.map((col) => {
            const title =
              lang === 'ar' ? col.title_ar || col.title_en : col.title_en || col.title_ar;
            return (
              <nav key={col.id} aria-label={title} className="flex flex-col gap-3 items-center text-center">
                <span className="footer-title !normal-case !text-2xl md:!text-3xl !font-black !text-base-content !opacity-100 tracking-tight leading-none mb-1.5 text-balance">
                  {title}
                </span>
                {col.links.map((link, i) => {
                  const safe = safeHref(link.href);
                  if (safe && user && AUTH_HREFS.has(safe.replace(/\/$/, '') || '/')) return null;
                  const label =
                    lang === 'ar' ? link.label_ar || link.label_en : link.label_en || link.label_ar;
                  if (!label) return null;
                  return (
                    <FooterHref
                      key={`${col.id}-${i}`}
                      href={link.href}
                      className="link link-hover text-base md:text-lg font-medium text-base-content/75 hover:text-base-content leading-snug"
                    >
                      {label}
                    </FooterHref>
                  );
                })}
              </nav>
            );
          })}
        </div>
      )}

      <footer className="footer bg-base-200 text-base-content border-base-300 border-t px-10 py-5 md:py-6">
        <aside className="grid-flow-col items-center gap-4">
          <BrandLogo size="lg" />
          <p className="text-base opacity-75 text-pretty leading-snug">
            {description}
            <br />
            <span className="text-sm text-base-content/70">
              © {year}. {t('جميع الحقوق محفوظة لهذا المتجر.', 'All rights reserved.')}
            </span>
          </p>
        </aside>
        {socials.length > 0 && (
          <nav aria-label="Social media" className="md:place-self-center md:justify-self-end">
            <div className="grid grid-flow-col gap-5">
              {socials.map(({ key, href, icon: Icon, label }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-75 hover:opacity-100 transition-opacity"
                  aria-label={label}
                >
                  <Icon size={28} strokeWidth={1.75} className="fill-none stroke-current" aria-hidden />
                </a>
              ))}
            </div>
          </nav>
        )}
      </footer>
    </>
  );
}
