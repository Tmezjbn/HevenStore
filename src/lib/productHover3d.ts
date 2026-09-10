/** Global storefront hover-3d tune (site_settings.product_hover_3d_json). Per-product is still on/off. */

export type ProductHover3dTune = {
  /** Max tilt amplitude 1–10. */
  motion: number;
  /** Track response 1–10 (higher = snappier). */
  speed: number;
  /** Settle softness 1–10 (higher = slower return to flat). */
  smooth: number;
};

export const HOVER_3D_TUNE_MIN = 1;
export const HOVER_3D_TUNE_MAX = 10;
export const DEFAULT_HOVER_3D_TUNE: ProductHover3dTune = {
  motion: 5,
  speed: 5,
  smooth: 5,
};

function clampTune(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.min(HOVER_3D_TUNE_MAX, Math.max(HOVER_3D_TUNE_MIN, Math.round(v)));
}

export function parseProductHover3dTune(raw: string | null | undefined): ProductHover3dTune {
  if (!raw?.trim()) return { ...DEFAULT_HOVER_3D_TUNE };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== 'object') return { ...DEFAULT_HOVER_3D_TUNE };
    return {
      motion: clampTune(o.motion ?? DEFAULT_HOVER_3D_TUNE.motion),
      speed: clampTune(o.speed ?? DEFAULT_HOVER_3D_TUNE.speed),
      smooth: clampTune(o.smooth ?? DEFAULT_HOVER_3D_TUNE.smooth),
    };
  } catch {
    return { ...DEFAULT_HOVER_3D_TUNE };
  }
}

export function serializeProductHover3dTune(tune: ProductHover3dTune): string {
  return JSON.stringify({
    motion: clampTune(tune.motion),
    speed: clampTune(tune.speed),
    smooth: clampTune(tune.smooth),
  });
}

/** Max tilt degrees from motion 1–10 → ~4–16°. */
export function hover3dMaxTilt(motion: number): number {
  const m = clampTune(motion);
  return 4 + ((m - 1) / 9) * 12;
}

/** While tracking: lerp 1–10 → ~0.06–0.28. */
export function hover3dLerpIn(speed: number): number {
  const s = clampTune(speed);
  return 0.06 + ((s - 1) / 9) * 0.22;
}

/** On leave: lerp 1–10 smooth → ~0.22–0.05 (higher smooth = softer settle). */
export function hover3dLerpOut(smooth: number): number {
  const s = clampTune(smooth);
  return 0.22 - ((s - 1) / 9) * 0.17;
}
