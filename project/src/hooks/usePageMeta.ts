import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from './useSiteSettings';
import { useI18n } from '../lib/i18n';

const DEFAULT_DESC =
  'HEVEN.FUN — Games, subscriptions, and digital keys. More fun, less spend.';

/** Production origin for sitemap/canonicals. Override with VITE_SITE_URL. */
export function siteOrigin(): string {
  const env = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://heven.fun';
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${CSS.escape(key)}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${CSS.escape(rel)}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertHreflang(hreflang: string, href: string) {
  let el = document.head.querySelector(
    `link[rel="alternate"][hreflang="${CSS.escape(hreflang)}"]`,
  ) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'alternate';
    el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertOgLocaleAlternate(content: string) {
  // One alternate locale meta (the non-primary language).
  let el = document.head.querySelector(
    'meta[property="og:locale:alternate"]',
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', 'og:locale:alternate');
    document.head.appendChild(el);
  }
  el.content = content;
}

export type PageMeta = {
  /** Page-specific title; site name is appended. Omit for brand-only title. */
  title?: string;
  description?: string;
  /** Absolute or site-relative image URL for og:image / twitter:image. */
  image?: string | null;
  /** Private/app routes — tell crawlers to skip. */
  noindex?: boolean;
};

/**
 * Sets document title + description + Open Graph + canonical for the current route.
 * Restores brand defaults on unmount so a later page without meta isn't stuck.
 */
export function usePageMeta({ title, description, image, noindex = false }: PageMeta) {
  const { settings } = useSiteSettings();
  const { lang } = useI18n();
  const { pathname } = useLocation();

  const siteName = settings.site_name.trim() || 'HEVEN.FUN';
  const tagline =
    (lang === 'ar' ? settings.site_tagline_ar : settings.site_tagline_en).trim() ||
    settings.site_tagline.trim();
  const brandTitle = tagline ? `${siteName} — ${tagline}` : siteName;
  const brandDesc =
    (lang === 'ar' ? settings.hero_desc_ar : settings.hero_desc_en).trim() || DEFAULT_DESC;

  const fullTitle = title?.trim() ? `${title.trim()} — ${siteName}` : brandTitle;
  const desc = (description?.trim() || brandDesc).slice(0, 160);
  const origin = siteOrigin();
  const canonical = `${origin}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;
  const DEFAULT_OG = '/og-image.png';
  const absImage = (() => {
    const raw = (image?.trim() || DEFAULT_OG);
    return raw.startsWith('http') ? raw : `${origin}${raw.startsWith('/') ? '' : '/'}${raw}`;
  })();

  useEffect(() => {
    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('property', 'og:locale', lang === 'ar' ? 'ar_SA' : 'en_US');
    upsertMeta('property', 'og:image', absImage);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', absImage);
    upsertLink('canonical', canonical);
    // SPA: one URL, client language switch — no /ar|/en paths (product decision).
    upsertHreflang('ar', canonical);
    upsertHreflang('en', canonical);
    upsertHreflang('x-default', canonical);
    upsertOgLocaleAlternate(lang === 'ar' ? 'en_US' : 'ar_SA');
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    return () => {
      document.title = brandTitle;
      upsertMeta('name', 'description', brandDesc.slice(0, 160));
      upsertMeta('property', 'og:title', brandTitle);
      upsertMeta('property', 'og:description', brandDesc.slice(0, 160));
      upsertMeta('property', 'og:image', `${origin}${DEFAULT_OG}`);
      upsertMeta('name', 'twitter:title', brandTitle);
      upsertMeta('name', 'twitter:image', `${origin}${DEFAULT_OG}`);
      upsertMeta('name', 'robots', 'index, follow');
    };
  }, [fullTitle, desc, canonical, absImage, noindex, brandTitle, brandDesc, siteName, lang, origin]);
}
