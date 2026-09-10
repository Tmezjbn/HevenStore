import type { CSSProperties } from 'react';
import type { HeroMediaItem } from '../../lib/siteSettings';
import { heroMediaPanStyle } from '../../lib/siteSettings';
import { isVideoUrl } from '../../lib/mediaUrl';
import { InViewVideo } from '../ui/ProductMedia';

/** Diagonal lean (%) for `/` slash separators between panels. */
const SLASH_LEAN = 3.5;

function slashClip(index: number, total: number): string | undefined {
  if (total <= 1) return undefined;
  const left = (index / total) * 100;
  const right = ((index + 1) / total) * 100;
  const lean = SLASH_LEAN;
  const tl = index === 0 ? 0 : left + lean;
  const bl = index === 0 ? 0 : left - lean;
  const tr = index === total - 1 ? 100 : right + lean;
  const br = index === total - 1 ? 100 : right - lean;
  return `polygon(${tl}% 0%, ${tr}% 0%, ${br}% 100%, ${bl}% 100%)`;
}

/** Build a short edge feather from softness 0–100. Max fade ~6% of each side. */
function softEdgeMask(softness: number): CSSProperties | undefined {
  const s = Math.min(100, Math.max(0, softness));
  if (s <= 0) return undefined;
  const fade = (s / 100) * 6; // 0–6%
  const start = fade.toFixed(2);
  const end = (100 - fade).toFixed(2);
  const x = `linear-gradient(to right, transparent 0%, #000 ${start}%, #000 ${end}%, transparent 100%)`;
  const y = `linear-gradient(to bottom, transparent 0%, #000 ${start}%, #000 ${end}%, transparent 100%)`;
  return {
    WebkitMaskImage: `${x}, ${y}`,
    maskImage: `${x}, ${y}`,
    WebkitMaskComposite: 'source-in' as unknown as string,
    maskComposite: 'intersect',
  };
}

type Props = {
  items: HeroMediaItem[];
  /** 0–100 */
  blur: number;
  /** 0–100 edge feather */
  softness?: number;
  /** Highlight one panel (builder preview). */
  highlightId?: string | null;
  /** Builder: skip blur so position sliders read clearly live. */
  previewSharp?: boolean;
};

/**
 * Full-bleed hero backdrop: 1–5 media panels with `/` slash separators,
 * optional blur, and adjustable soft edges.
 */
export default function HeroMediaBackdrop({
  items,
  blur,
  softness = 18,
  highlightId,
  previewSharp = false,
}: Props) {
  const media = items.filter((i) => i.url.trim()).slice(0, 5);
  if (media.length === 0) return null;

  const effectiveBlur = previewSharp ? 0 : blur;
  const blurPx = Math.round((Math.min(100, Math.max(0, effectiveBlur)) / 100) * 40);
  const scale = blurPx > 0 ? 1.08 : 1;
  const softMask = softEdgeMask(softness);

  return (
    <div
      className="hero-media-backdrop absolute inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden
      style={softMask}
    >
      <div
        className="absolute inset-0 origin-center will-change-transform"
        style={{
          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
          transform: `scale(${scale})`,
        }}
      >
        {media.map((item, i) => {
          const clip = slashClip(i, media.length);
          const kind = item.kind || (isVideoUrl(item.url) ? 'video' : 'image');
          const pan = heroMediaPanStyle(item);
          const dim = Boolean(highlightId && highlightId !== item.id);
          const mediaStyle: CSSProperties = {
            objectFit: pan.objectFit,
            transform: pan.transform,
            transformOrigin: pan.transformOrigin,
          };
          return (
            <div
              key={item.id}
              className="absolute inset-0 overflow-hidden transition-opacity duration-150"
              style={{
                ...(clip ? { clipPath: clip, WebkitClipPath: clip } : undefined),
                opacity: dim ? 0.35 : 1,
              }}
            >
              {kind === 'video' ? (
                <InViewVideo src={item.url} className="h-full w-full" style={mediaStyle} />
              ) : (
                <img
                  src={item.url}
                  alt=""
                  className="h-full w-full"
                  style={mediaStyle}
                  loading="eager"
                  decoding="async"
                  ref={(el) => {
                    if (el) el.setAttribute('fetchpriority', i === 0 ? 'high' : 'low');
                  }}
                />
              )}
              {highlightId === item.id && (
                <div className="absolute inset-0 ring-2 ring-inset ring-primary pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
