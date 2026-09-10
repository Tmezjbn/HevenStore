/** Pure helpers for dashboard guide read progress. */

export type GuideSectionRect = { id: string; top: number; bottom: number };

/**
 * Among sections overlapping the scroll viewport, pick the one whose top
 * is closest to the reading line (typically ~30% down the pane).
 */
export function pickReadingSection(
  sections: GuideSectionRect[],
  lineY: number,
  viewTop: number,
  viewBottom: number,
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const s of sections) {
    if (s.bottom <= viewTop || s.top >= viewBottom) continue;
    const dist = Math.abs(s.top - lineY);
    if (dist < bestDist) {
      bestDist = dist;
      best = s.id;
    }
  }
  return best;
}

export const GUIDE_READ_KEY = 'heven.guides.read';

export function loadGuideReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(GUIDE_READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function saveGuideReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(GUIDE_READ_KEY, JSON.stringify([...ids]));
  } catch {
    /* private mode / quota */
  }
}
