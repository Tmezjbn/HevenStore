/** Up to 3 showcase embeds; each has ads + no-ads URLs. */

export type VideoEmbedVariant = 'withAds' | 'withoutAds';
export type VideoEmbedSlotIndex = 0 | 1 | 2;

export type VideoEmbedSlot = {
  withAds: string | null;
  withoutAds: string | null;
};

/** Empty string = use DEFAULT_VIDEO_EMBED_LABELS on the storefront. */
export type VideoEmbedLabelPair = { ar: string; en: string };

export type VideoEmbedLabels = {
  title: VideoEmbedLabelPair;
  /** withAds button */
  player1: VideoEmbedLabelPair;
  /** withoutAds button */
  player2: VideoEmbedLabelPair;
};

export type VideoEmbeds = {
  slots: [VideoEmbedSlot, VideoEmbedSlot, VideoEmbedSlot];
  defaultSlot: VideoEmbedSlotIndex;
  defaultVariant: VideoEmbedVariant;
  labels: VideoEmbedLabels;
};

export const DEFAULT_VIDEO_EMBED_LABELS: VideoEmbedLabels = {
  title: { ar: '(مشغّلات الفيديو)', en: '(Video Players)' },
  player1: { ar: 'المشغّل 1', en: 'Player 1' },
  player2: { ar: 'المشغّل 2', en: 'Player 2' },
};

const LABEL_MAX = 48;

const EMPTY_SLOT = (): VideoEmbedSlot => ({ withAds: null, withoutAds: null });

function emptyLabels(): VideoEmbedLabels {
  return {
    title: { ar: '', en: '' },
    player1: { ar: '', en: '' },
    player2: { ar: '', en: '' },
  };
}

export function emptyVideoEmbeds(): VideoEmbeds {
  return {
    slots: [EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT()],
    defaultSlot: 0,
    defaultVariant: 'withAds',
    labels: emptyLabels(),
  };
}

function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t || null;
}

function cleanLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, LABEL_MAX);
}

function parseLabelPair(raw: unknown): VideoEmbedLabelPair {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ar: '', en: '' };
  }
  const o = raw as Record<string, unknown>;
  return { ar: cleanLabel(o.ar), en: cleanLabel(o.en) };
}

/** Storefront copy for the variant toggle; blank custom → built-in default. */
export function resolveEmbedLabel(
  embeds: VideoEmbeds,
  which: keyof VideoEmbedLabels,
  lang: 'ar' | 'en',
): string {
  const custom = embeds.labels[which][lang];
  if (custom) return custom;
  return DEFAULT_VIDEO_EMBED_LABELS[which][lang];
}

export function slotHasUrl(slot: VideoEmbedSlot): boolean {
  return Boolean(slot.withAds || slot.withoutAds);
}

export function resolveSlotUrl(
  slot: VideoEmbedSlot,
  variant: VideoEmbedVariant,
): string | null {
  const preferred = variant === 'withAds' ? slot.withAds : slot.withoutAds;
  if (preferred) return preferred;
  return variant === 'withAds' ? slot.withoutAds : slot.withAds;
}

export function filledSlotIndices(embeds: VideoEmbeds): VideoEmbedSlotIndex[] {
  return ([0, 1, 2] as const).filter((i) => slotHasUrl(embeds.slots[i]));
}

export function collectEmbedUrls(embeds: VideoEmbeds): string[] {
  const out: string[] = [];
  for (const s of embeds.slots) {
    if (s.withAds) out.push(s.withAds);
    if (s.withoutAds) out.push(s.withoutAds);
  }
  return out;
}

/** Preferred default URL for denormalized `products.video_url`. */
export function resolveDefaultVideoUrl(embeds: VideoEmbeds): string | null {
  const primary = resolveSlotUrl(embeds.slots[embeds.defaultSlot], embeds.defaultVariant);
  if (primary) return primary;
  const other: VideoEmbedVariant =
    embeds.defaultVariant === 'withAds' ? 'withoutAds' : 'withAds';
  const secondary = resolveSlotUrl(embeds.slots[embeds.defaultSlot], other);
  if (secondary) return secondary;
  for (const slot of embeds.slots) {
    const u = resolveSlotUrl(slot, embeds.defaultVariant) || resolveSlotUrl(slot, other);
    if (u) return u;
  }
  return null;
}

/**
 * Normalize DB/json + legacy single `video_url`.
 * Empty embeds + fallback URL → slot 0 withAds.
 */
export function normalizeVideoEmbeds(
  raw: unknown,
  fallbackVideoUrl?: string | null,
): VideoEmbeds {
  const base = emptyVideoEmbeds();
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const slots = Array.isArray(o.slots) ? o.slots : [];
    for (let i = 0; i < 3; i++) {
      const s = slots[i];
      if (s && typeof s === 'object' && !Array.isArray(s)) {
        const slot = s as Record<string, unknown>;
        base.slots[i] = {
          withAds: cleanUrl(slot.withAds ?? slot.url_with_ads),
          withoutAds: cleanUrl(slot.withoutAds ?? slot.url_without_ads),
        };
      }
    }
    const ds = Number(o.defaultSlot);
    if (ds === 0 || ds === 1 || ds === 2) base.defaultSlot = ds;
    if (o.defaultVariant === 'withAds' || o.defaultVariant === 'withoutAds') {
      base.defaultVariant = o.defaultVariant;
    }
    if (o.labels && typeof o.labels === 'object' && !Array.isArray(o.labels)) {
      const L = o.labels as Record<string, unknown>;
      base.labels = {
        title: parseLabelPair(L.title),
        player1: parseLabelPair(L.player1),
        player2: parseLabelPair(L.player2),
      };
    }
  }

  if (!filledSlotIndices(base).length) {
    const legacy = cleanUrl(fallbackVideoUrl);
    if (legacy) base.slots[0].withAds = legacy;
  }

  // Default must point at a filled slot/variant when one exists (empty "Default"
  // radios stay unchecked — not a stuck control).
  const filled = filledSlotIndices(base);
  if (filled.length && !slotHasUrl(base.slots[base.defaultSlot])) {
    base.defaultSlot = filled[0];
  }
  const def = base.slots[base.defaultSlot];
  const preferred =
    base.defaultVariant === 'withAds' ? def.withAds : def.withoutAds;
  if (!preferred) {
    const other: VideoEmbedVariant =
      base.defaultVariant === 'withAds' ? 'withoutAds' : 'withAds';
    if (other === 'withAds' ? def.withAds : def.withoutAds) {
      base.defaultVariant = other;
    }
  }

  return base;
}

export function setEmbedSlotUrl(
  embeds: VideoEmbeds,
  slot: VideoEmbedSlotIndex,
  variant: VideoEmbedVariant,
  url: string | null,
): VideoEmbeds {
  const next = normalizeVideoEmbeds(embeds);
  next.slots[slot] = {
    ...next.slots[slot],
    [variant]: cleanUrl(url),
  };
  return normalizeVideoEmbeds(next);
}

// ponytail: ceiling = jsonb shape only; upgrade = per-slot playback prefs
if (import.meta.env.DEV) {
  const legacy = normalizeVideoEmbeds(null, 'https://example.com/e/a');
  console.assert(legacy.slots[0].withAds === 'https://example.com/e/a', 'videoEmbeds: legacy');
  console.assert(
    resolveDefaultVideoUrl(legacy) === 'https://example.com/e/a',
    'videoEmbeds: resolve default',
  );
  const dual = normalizeVideoEmbeds({
    slots: [
      { withAds: 'https://a.test/ads', withoutAds: 'https://a.test/clean' },
      { withAds: null, withoutAds: null },
      { withAds: null, withoutAds: null },
    ],
    defaultSlot: 0,
    defaultVariant: 'withoutAds',
  });
  console.assert(
    resolveSlotUrl(dual.slots[0], 'withoutAds') === 'https://a.test/clean',
    'videoEmbeds: variant',
  );
  const snap = normalizeVideoEmbeds({
    slots: [
      { withAds: 'https://a.test/ads', withoutAds: null },
      { withAds: null, withoutAds: null },
      { withAds: null, withoutAds: null },
    ],
    defaultSlot: 1,
    defaultVariant: 'withoutAds',
  });
  console.assert(snap.defaultSlot === 0, 'videoEmbeds: snap empty default slot');
  console.assert(snap.defaultVariant === 'withAds', 'videoEmbeds: snap empty default variant');
  const labeled = normalizeVideoEmbeds({
    slots: dual.slots,
    defaultSlot: 0,
    defaultVariant: 'withAds',
    labels: { title: { ar: '', en: 'Streams' }, player1: { ar: '', en: '' }, player2: { ar: '', en: 'Clean' } },
  });
  console.assert(resolveEmbedLabel(labeled, 'title', 'en') === 'Streams', 'videoEmbeds: custom title');
  console.assert(
    resolveEmbedLabel(labeled, 'player1', 'en') === 'Player 1',
    'videoEmbeds: default player1',
  );
  console.assert(resolveEmbedLabel(labeled, 'player2', 'en') === 'Clean', 'videoEmbeds: custom player2');
}
