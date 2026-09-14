import { useEffect, useLayoutEffect } from 'react';
import { useAppearanceStore } from '../../stores/appearanceStore';
import { normalizeSkinId, resolveTheme } from '../../lib/appearance';
import { hexToDaisyVars } from '../../lib/oklch';
import { useSiteSettings } from '../../hooks/useSiteSettings';

const STYLE_ID = 'heven-brand-colors';

export default function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const { skin, mode, hasUserPickedSkin, syncSiteDefault } = useAppearanceStore();
  const { settings } = useSiteSettings();

  // Owner default skin (Vault unless changed) for visitors who haven't picked yet.
  useLayoutEffect(() => {
    if (hasUserPickedSkin) return;
    syncSiteDefault(normalizeSkinId(settings.default_skin));
  }, [settings.default_skin, hasUserPickedSkin, syncSiteDefault]);

  // Sync theme before paint so View Transitions capture the new skin.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolveTheme(skin, mode);
  }, [skin, mode]);

  // Owner-defined brand colors override the theme's primary / accent for every visitor.
  useEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    const rules: string[] = [];

    const primary = hexToDaisyVars(settings.brand_primary);
    if (primary) {
      rules.push(`--color-primary:oklch(${primary.base});--color-primary-content:oklch(${primary.content});`);
    }
    const accent = hexToDaisyVars(settings.brand_accent);
    if (accent) {
      rules.push(`--color-accent:oklch(${accent.base});--color-accent-content:oklch(${accent.content});`);
    }

    if (rules.length === 0) {
      style?.remove();
      return;
    }

    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `:root[data-theme]{${rules.join('')}}`;
    return () => {
      document.getElementById(STYLE_ID)?.remove();
    };
  }, [settings.brand_primary, settings.brand_accent]);

  // Document title / OG tags live in usePageMeta (per-route). Do not set them here.

  return <>{children}</>;
}
