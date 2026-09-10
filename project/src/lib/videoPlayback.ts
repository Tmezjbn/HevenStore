/** Showcase defaults — browsers require muted start for autoplay. */
export const DEFAULT_VIDEO_AUTOPLAY = true;
export const DEFAULT_VIDEO_VOLUME = 25;

export function clampVideoVolume(raw: number | null | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_VIDEO_VOLUME;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Autoplay always starts muted (browser policy).
 * `volume` is applied muted; unmute is best-effort after play.
 */
export function resolveShowcasePlayback(opts: {
  autoplay?: boolean | null;
  volume?: number | null;
  reducedMotion: boolean;
}) {
  const volumePct = clampVideoVolume(opts.volume);
  const autoplay = (opts.autoplay ?? DEFAULT_VIDEO_AUTOPLAY) && !opts.reducedMotion;
  return {
    autoplay,
    volumePct,
    volume: volumePct / 100,
    wantSound: volumePct > 0,
  };
}

// ponytail: ceiling = autoplay mute policy; upgrade = gesture-tied unmute
if (import.meta.env.DEV) {
  const a = resolveShowcasePlayback({ autoplay: true, volume: 25, reducedMotion: false });
  console.assert(a.autoplay && a.volume === 0.25 && a.wantSound, 'videoPlayback 25%');
  const b = resolveShowcasePlayback({ autoplay: true, volume: 25, reducedMotion: true });
  console.assert(!b.autoplay, 'videoPlayback reduced-motion');
  console.assert(clampVideoVolume(150) === 100 && clampVideoVolume(-1) === 0, 'videoPlayback clamp');
}
