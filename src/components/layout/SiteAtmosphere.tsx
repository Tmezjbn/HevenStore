import { useEffect, useLayoutEffect, useMemo, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { useProductBySlug } from '../../hooks/useCatalog';
import {
  parseProductDetailFx,
  resolveAtmosphereLayers,
  resolveHeroWelcomeLayers,
  type AtmospherePatternId,
  type ProductDetailFxConfig,
} from '../../lib/siteSettings';
import { atmospherePageFromPath } from '../../lib/atmospherePages';
import {
  ATMOSPHERE_LOGO_IDS,
  resolveAtmosphereLogos,
  type AtmosphereLogoEntry,
} from '../../lib/atmosphereLogos';

type Particle = {
  id: number;
  x: number;
  y: number;
  kind: 'x' | 'plus' | 'box' | 'diamond' | 'dot';
  size: number;
  dur: number;
  delay: number;
  dx: number;
  dy: number;
};

type LogoPlace = {
  entry: AtmosphereLogoEntry;
  left: string;
  top: string;
  size: string;
  rotate: number;
  opacityScale: number;
  dur: number;
  delay: number;
  dx: number;
  dy: number;
};

const LOGO_SLOTS = [
  { left: '6%', top: '14%', sizeRem: 4.5, rotate: -14, opacityScale: 1 },
  { left: '78%', top: '22%', sizeRem: 3.75, rotate: 16, opacityScale: 0.9 },
  { left: '12%', top: '62%', sizeRem: 5, rotate: 10, opacityScale: 0.85 },
  { left: '70%', top: '68%', sizeRem: 4, rotate: -18, opacityScale: 0.8 },
  { left: '42%', top: '78%', sizeRem: 5.5, rotate: -6, opacityScale: 0.75 },
  { left: '48%', top: '18%', sizeRem: 3.5, rotate: 22, opacityScale: 0.7 },
  { left: '88%', top: '48%', sizeRem: 3.25, rotate: -12, opacityScale: 0.65 },
  { left: '28%', top: '38%', sizeRem: 3, rotate: 8, opacityScale: 0.6 },
  { left: '58%', top: '52%', sizeRem: 4.25, rotate: -20, opacityScale: 0.7 },
  { left: '8%', top: '88%', sizeRem: 3.5, rotate: 14, opacityScale: 0.55 },
  { left: '82%', top: '8%', sizeRem: 3, rotate: -8, opacityScale: 0.6 },
  { left: '35%', top: '8%', sizeRem: 2.75, rotate: 18, opacityScale: 0.5 },
] as const;

function buildParticles(count: number, sizeScale = 1, speedScale = 1): Particle[] {
  const kinds: Particle['kind'][] = ['x', 'plus', 'box', 'diamond', 'dot'];
  const out: Particle[] = [];
  let seed = count * 9973 + 13;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const speed = Math.max(0.25, speedScale);
  for (let i = 0; i < count; i++) {
    const ang = next() * Math.PI * 2;
    const dist = 36 + next() * 48;
    const base = kinds[i % kinds.length] === 'dot' ? 4 + next() * 4 : 10 + next() * 14;
    out.push({
      id: i,
      x: next() * 100,
      y: next() * 100,
      kind: kinds[i % kinds.length],
      size: Math.max(2, base * sizeScale),
      dur: (10 + next() * 10) / speed,
      delay: -next() * 16,
      dx: Math.cos(ang) * dist,
      dy: Math.sin(ang) * dist,
    });
  }
  return out;
}

function buildLogoPlaces(
  entries: AtmosphereLogoEntry[],
  sizeScale = 1,
  count = 4,
  speedScale = 1,
): LogoPlace[] {
  if (entries.length === 0) return [];
  const n = Math.min(LOGO_SLOTS.length, Math.max(1, count));
  const speed = Math.max(0.25, speedScale);
  let seed = n * 7919 + entries.length * 13;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return LOGO_SLOTS.slice(0, n).map((slot, i) => {
    const ang = next() * Math.PI * 2;
    const dist = 18 + next() * 28;
    return {
      entry: entries[i % entries.length],
      left: slot.left,
      top: slot.top,
      size: `${(slot.sizeRem * sizeScale).toFixed(2)}rem`,
      rotate: slot.rotate,
      opacityScale: slot.opacityScale,
      dur: (14 + next() * 12) / speed,
      delay: -next() * 20,
      dx: Math.cos(ang) * dist,
      dy: Math.sin(ang) * dist,
    };
  });
}

function AtmosphereLayers({
  config,
  logoIds,
  contained = false,
  /** Product PDP: keep all FX under content so showcase video isn't covered/tiled. */
  preferUnder = false,
}: {
  config: ProductDetailFxConfig;
  logoIds: string[];
  /** Clip FX to parent (hero welcome card) — always under sibling text. */
  contained?: boolean;
  preferUnder?: boolean;
}) {
  const particleScale = config.particleSize / 100;
  const logoScale = config.logoSize / 100;
  const particleSpeed = config.particleSpeed / 100;
  const logoSpeed = config.logoSpeed / 100;
  const patterns = config.grid ? config.patterns : [];
  const patternsBehind =
    !contained && patterns.length > 0 && (preferUnder || config.patternLayer === 'behind');
  const patternsAbove =
    !contained &&
    !preferUnder &&
    patterns.length > 0 &&
    config.patternLayer !== 'behind';
  const patternsContained = contained && patterns.length > 0;

  const particles = useMemo(
    () =>
      config.particles
        ? buildParticles(config.particleCount, particleScale, particleSpeed)
        : [],
    [config.particles, config.particleCount, particleScale, particleSpeed],
  );
  const logos = useMemo(() => {
    if (!config.logo) return [];
    return buildLogoPlaces(
      resolveAtmosphereLogos(logoIds, config.customLogos ?? []),
      logoScale,
      config.logoCount ?? 4,
      logoSpeed,
    );
  }, [config.logo, config.logoCount, config.customLogos, logoIds, logoScale, logoSpeed]);

  // Higher gridSize % → denser (more cells). 25%≈sparse, 100%≈48px, 250%≈many.
  const t = Math.max(0.25, config.gridSize / 100);
  const cellPx = Math.round(Math.min(120, Math.max(10, 48 / t)));
  const vars = {
    '--pdp-grid-opacity': String(Math.max(config.gridOpacity, 8) / 100),
    '--pdp-particle-opacity': String(Math.max(config.particleOpacity, 12) / 100),
    '--pdp-logo-opacity': String(Math.max(config.logoOpacity, 8) / 100),
    '--pdp-grid-size': `${cellPx}px`,
  } as CSSProperties;

  const patternNodes = (list: AtmospherePatternId[]) =>
    list.map((id) => (
      <div
        key={id}
        className={`pdp-fx__pattern pdp-fx__pattern--${id} absolute inset-0`}
        style={
          {
            backgroundSize: `${cellPx}px ${cellPx}px`,
            // Cross uses 3 layers — set each so density always sticks
            ['--pdp-grid-size' as string]: `${cellPx}px`,
          } as CSSProperties
        }
      />
    ));

  const marks = (
    <>
      {particles.length > 0 && (
        <div className="pdp-fx__particles absolute inset-0">
          {particles.map((p) => (
            <span
              key={p.id}
              className={`pdp-fx__mark pdp-fx__mark--${p.kind}`}
              style={
                {
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                  animationDuration: `${p.dur}s`,
                  animationDelay: `${p.delay}s`,
                  '--pdp-dx': `${p.dx.toFixed(1)}px`,
                  '--pdp-dy': `${p.dy.toFixed(1)}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      {logos.length > 0 && (
        <div className="pdp-fx__logos absolute inset-0">
          {logos.map((place, i) => (
            <img
              key={`${place.entry.id}-${i}`}
              src={place.entry.src}
              alt=""
              className={`pdp-fx__game-logo${place.entry.stylized ? ' pdp-fx__game-logo--stylized' : ''}${
                place.entry.themeInk ? ' atmosphere-logo--ink' : ''
              }`}
              draggable={false}
              style={
                {
                  left: place.left,
                  top: place.top,
                  width: place.size,
                  height: place.size,
                  opacity: `calc(var(--pdp-logo-opacity, 0.12) * ${place.opacityScale})`,
                  animationDuration: `${place.dur}s`,
                  animationDelay: `${place.delay}s`,
                  '--pdp-dx': `${place.dx.toFixed(1)}px`,
                  '--pdp-dy': `${place.dy.toFixed(1)}px`,
                  '--pdp-rot': `${place.rotate}deg`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </>
  );

  if (contained) {
    if (!patternsContained && particles.length === 0 && logos.length === 0) return null;
    return (
      <div
        className="pdp-fx pdp-fx--contained pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
        style={vars}
      >
        {patternsContained && patternNodes(patterns)}
        {marks}
      </div>
    );
  }

  const showOver =
    !preferUnder && (patternsAbove || particles.length > 0 || logos.length > 0);
  const showUnder =
    patternsBehind ||
    (preferUnder && (patterns.length > 0 || particles.length > 0 || logos.length > 0));
  if (!showUnder && !showOver) return null;

  return (
    <>
      {showUnder && (
        <div
          className="pdp-fx pdp-fx--under pointer-events-none fixed inset-0 overflow-hidden"
          aria-hidden
          style={vars}
        >
          {(patternsBehind || preferUnder) && patterns.length > 0 && patternNodes(patterns)}
          {preferUnder ? marks : null}
        </div>
      )}

      {showOver && (
        <div
          className="pdp-fx pdp-fx--over pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
          style={vars}
        >
          {patternsAbove && patternNodes(patterns)}
          {marks}
        </div>
      )}
    </>
  );
}

/** Patterns / particles / logo clipped inside the home welcome card (under text). */
export function HeroWelcomeAtmosphere() {
  const { settings } = useSiteSettings();
  const config = useMemo(
    () => parseProductDetailFx(settings.product_detail_fx_json, ATMOSPHERE_LOGO_IDS),
    [settings.product_detail_fx_json],
  );
  if (!config.enabled || !config.pages.heroWelcome) return null;
  const layers = resolveHeroWelcomeLayers(config);
  if (!layers.grid && !layers.particles && !layers.logo) return null;
  return (
    <AtmosphereLayers
      contained
      config={{ ...config, grid: layers.grid, particles: layers.particles, logo: layers.logo }}
      logoIds={config.logoIds}
    />
  );
}

/**
 * Site-wide Morphine-style atmosphere: patterns + drifting marks + game icons.
 * Page flags + optional product.atmosphere_logo_ids override.
 */
export default function SiteAtmosphere() {
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();
  const config = useMemo(
    () => parseProductDetailFx(settings.product_detail_fx_json, ATMOSPHERE_LOGO_IDS),
    [settings.product_detail_fx_json],
  );
  const pageKey = atmospherePageFromPath(pathname);
  const productSlug = pathname.match(/^\/product\/([^/]+)/)?.[1];
  const { data: product } = useProductBySlug(pageKey === 'product' ? productSlug : undefined);

  const pageOn = config.enabled && config.pages[pageKey];
  const layers = resolveAtmosphereLayers(config, pageKey);
  const hasAnyLayer = layers.grid || layers.particles || layers.logo;
  const active = pageOn && layers.grid && config.patterns.length > 0;
  // Product PDP: force under-layer — over paints above main (z-10) and breaks showcase video.
  const preferUnder = pageKey === 'product';
  const behind =
    (active && config.patternLayer === 'behind') || (preferUnder && pageOn && hasAnyLayer);
  const chromeHero = pageKey === 'home' && pageOn && hasAnyLayer && config.pages.heroWelcome;
  const chromeFooter = pageOn && hasAnyLayer && config.pages.footer;
  const chromeDrawer = pageOn && hasAnyLayer && config.pages.drawer;
  // Unchecked = solid chrome above over-layer (see-through only when checked).
  const solidFooter = pageOn && hasAnyLayer && !config.pages.footer;
  const solidDrawer = pageOn && hasAnyLayer && !config.pages.drawer;

  // Opaque page shells (bg-base-100) bury z-0 patterns — punch them transparent while behind.
  // Footer / drawer: chrome = see-through; solid = lift above atmosphere so FX never paints on them.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('atm-pattern-behind', behind);
    root.classList.toggle('atm-chrome-hero', chromeHero);
    root.classList.toggle('atm-chrome-footer', chromeFooter);
    root.classList.toggle('atm-chrome-drawer', chromeDrawer);
    root.classList.toggle('atm-solid-footer', solidFooter);
    root.classList.toggle('atm-solid-drawer', solidDrawer);
    return () => {
      root.classList.remove(
        'atm-pattern-behind',
        'atm-chrome-hero',
        'atm-chrome-footer',
        'atm-chrome-drawer',
        'atm-solid-footer',
        'atm-solid-drawer',
      );
    };
  }, [behind, chromeHero, chromeFooter, chromeDrawer, solidFooter, solidDrawer]);

  // Cut a hole in the site over-layer so card-local FX stays behind welcome text.
  useEffect(() => {
    if (!chromeHero) {
      document.querySelectorAll<HTMLElement>('.pdp-fx--over').forEach((n) => {
        n.style.clipPath = '';
      });
      return;
    }
    const sync = () => {
      const node = document.querySelector<HTMLElement>('.pdp-fx--over');
      const card = document.querySelector('.hero-welcome-card');
      if (!node || !card) return;
      const r = card.getBoundingClientRect();
      const pr = node.getBoundingClientRect();
      if (pr.width < 1 || pr.height < 1) return;
      const x = r.left - pr.left;
      const y = r.top - pr.top;
      node.style.clipPath = `polygon(evenodd, 0 0, ${pr.width}px 0, ${pr.width}px ${pr.height}px, 0 ${pr.height}px, 0 0, ${x}px ${y}px, ${x}px ${y + r.height}px, ${x + r.width}px ${y + r.height}px, ${x + r.width}px ${y}px, ${x}px ${y}px)`;
    };
    // Scroll fires a lot — coalesce to one layout read per frame.
    let raf = 0;
    const onScrollOrResize = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };
    sync();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
    const card = document.querySelector('.hero-welcome-card');
    const ro = card ? new ResizeObserver(onScrollOrResize) : null;
    if (card && ro) ro.observe(card);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      ro?.disconnect();
      document.querySelectorAll<HTMLElement>('.pdp-fx--over').forEach((n) => {
        n.style.clipPath = '';
      });
    };
  }, [chromeHero, pageOn, hasAnyLayer]);

  if (!pageOn || !hasAnyLayer) return null;

  const override = product?.atmosphere_logo_ids;
  const logoIds =
    pageKey === 'product' && Array.isArray(override) && override.length > 0
      ? override
      : config.logoIds;

  const pageConfig: ProductDetailFxConfig = {
    ...config,
    grid: layers.grid,
    particles: layers.particles,
    logo: layers.logo,
  };

  return <AtmosphereLayers config={pageConfig} logoIds={logoIds} preferUnder={preferUnder} />;
}
