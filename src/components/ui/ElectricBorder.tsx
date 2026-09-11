import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useMerchMotionCalm } from '../../hooks/useMerchMotionCalm';
import {
  DEFAULT_ELECTRIC_AURA_COLOR,
  DEFAULT_ELECTRIC_AURA_TUNE,
  isElectricAura,
  normalizeAuraColor,
  parseElectricAuraTune,
  type ElectricAuraTune,
} from '../../lib/productEffects';

type ElectricBorderProps = {
  children?: ReactNode;
  color?: string;
  speed?: number;
  chaos?: number;
  thickness?: number;
  borderRadius?: number;
  className?: string;
  style?: CSSProperties;
};

function hexToRgba(hex: string, alpha = 1): string {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const int = parseInt(h, 16);
  if (Number.isNaN(int)) return `rgba(0,0,0,${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function random(x: number): number {
  return (Math.sin(x * 12.9898) * 43758.5453) % 1;
}

function noise2D(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const a = random(i + j * 57);
  const b = random(i + 1 + j * 57);
  const c = random(i + (j + 1) * 57);
  const d = random(i + 1 + (j + 1) * 57);
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}

function octavedNoise(
  x: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  baseAmplitude: number,
  baseFrequency: number,
  time: number,
  seed: number,
  baseFlatness: number,
): number {
  let y = 0;
  let amplitude = baseAmplitude;
  let frequency = baseFrequency;
  for (let i = 0; i < octaves; i++) {
    let octaveAmplitude = amplitude;
    if (i === 0) octaveAmplitude *= baseFlatness;
    y += octaveAmplitude * noise2D(frequency * x + seed * 100, time * frequency * 0.3);
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return y;
}

function getCornerPoint(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  arcLength: number,
  progress: number,
): { x: number; y: number } {
  const angle = startAngle + progress * arcLength;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

function getRoundedRectPoint(
  t: number,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
): { x: number; y: number } {
  const straightWidth = width - 2 * radius;
  const straightHeight = height - 2 * radius;
  const cornerArc = (Math.PI * radius) / 2;
  const totalPerimeter = 2 * straightWidth + 2 * straightHeight + 4 * cornerArc;
  const distance = t * totalPerimeter;
  let accumulated = 0;

  if (distance <= accumulated + straightWidth) {
    const progress = (distance - accumulated) / straightWidth;
    return { x: left + radius + progress * straightWidth, y: top };
  }
  accumulated += straightWidth;

  if (distance <= accumulated + cornerArc) {
    const progress = (distance - accumulated) / cornerArc;
    return getCornerPoint(left + width - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2, progress);
  }
  accumulated += cornerArc;

  if (distance <= accumulated + straightHeight) {
    const progress = (distance - accumulated) / straightHeight;
    return { x: left + width, y: top + radius + progress * straightHeight };
  }
  accumulated += straightHeight;

  if (distance <= accumulated + cornerArc) {
    const progress = (distance - accumulated) / cornerArc;
    return getCornerPoint(left + width - radius, top + height - radius, radius, 0, Math.PI / 2, progress);
  }
  accumulated += cornerArc;

  if (distance <= accumulated + straightWidth) {
    const progress = (distance - accumulated) / straightWidth;
    return { x: left + width - radius - progress * straightWidth, y: top + height };
  }
  accumulated += straightWidth;

  if (distance <= accumulated + cornerArc) {
    const progress = (distance - accumulated) / cornerArc;
    return getCornerPoint(left + radius, top + height - radius, radius, Math.PI / 2, Math.PI / 2, progress);
  }
  accumulated += cornerArc;

  if (distance <= accumulated + straightHeight) {
    const progress = (distance - accumulated) / straightHeight;
    return { x: left, y: top + height - radius - progress * straightHeight };
  }
  accumulated += straightHeight;

  const progress = (distance - accumulated) / cornerArc;
  return getCornerPoint(left + radius, top + radius, radius, Math.PI, Math.PI / 2, progress);
}

/**
 * React Bits Electric Border — canvas noise arcs (current upstream).
 * Source: https://www.reactbits.dev/animations/electric-border
 *
 * Calm when: `data-electric-calm`, or site `merch_motion_mode` + prefers-reduced-motion
 * (auto honors OS; always keeps motion for Cursor/Windows false positives; off always calms).
 * rAF pauses offscreen / hidden tab; one static stroke stays painted.
 */
const ElectricBorder = forwardRef<HTMLDivElement, ElectricBorderProps>(function ElectricBorder(
  {
    children,
    color = DEFAULT_ELECTRIC_AURA_COLOR,
    speed = 1,
    chaos = 0.12,
    thickness = 1.5,
    borderRadius: borderRadiusProp,
    className,
    style,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const calmRef = useRef(false);
  const merchCalm = useMerchMotionCalm();

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useEffect(() => {
    const host = rootRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncCalm = () => {
      calmRef.current =
        merchCalm ||
        host.hasAttribute('data-electric-calm') ||
        host.closest('[data-electric-calm]') != null;
    };
    syncCalm();

    const octaves = 10;
    const lacunarity = 1.6;
    const gain = 0.7;
    const amplitude = chaos;
    const frequency = 10;
    const baseFlatness = 0;

    let inView = true;
    let pageVisible = typeof document === 'undefined' ? true : !document.hidden;

    const updateSize = () => {
      const rect = host.getBoundingClientRect();
      const minSide = Math.min(rect.width, rect.height);
      // Tiny preview thumbs (~80×60): tighter pad so arcs stay readable, not clipped to a box.
      const borderOffset = minSide > 0 && minSide < 120 ? 28 : 48;
      const displacement = minSide > 0 && minSide < 120 ? 40 : 56;
      const width = rect.width + borderOffset * 2;
      const height = rect.height + borderOffset * 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      return { width, height, borderOffset, displacement, dpr };
    };

    let size = updateSize();
    let lastDpr = size.dpr;

    const resolveRadius = (borderWidth: number, borderHeight: number) => {
      if (typeof borderRadiusProp === 'number' && Number.isFinite(borderRadiusProp)) {
        return Math.min(borderRadiusProp, Math.min(borderWidth, borderHeight) / 2);
      }
      const raw =
        getComputedStyle(host).borderRadius ||
        getComputedStyle(host.querySelector('.electric-border__content') ?? host).borderRadius ||
        '8px';
      const parsed = parseFloat(raw);
      const px = Number.isFinite(parsed) ? parsed : 8;
      return Math.min(px, Math.min(borderWidth, borderHeight) / 2);
    };

    const strokeOnce = (currentTime: number, animate: boolean) => {
      if (size.dpr !== lastDpr) {
        lastDpr = size.dpr;
        size = updateSize();
      }

      const { width, height, borderOffset, displacement, dpr } = size;
      if (animate) {
        const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
        timeRef.current += deltaTime * speed;
      }
      lastFrameTimeRef.current = currentTime;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const left = borderOffset;
      const top = borderOffset;
      const borderWidth = width - 2 * borderOffset;
      const borderHeight = height - 2 * borderOffset;
      if (borderWidth <= 1 || borderHeight <= 1) return;

      const radius = resolveRadius(borderWidth, borderHeight);
      const approximatePerimeter = 2 * (borderWidth + borderHeight) + 2 * Math.PI * radius;
      const sampleCount = Math.max(24, Math.floor(approximatePerimeter / 2));
      const t = animate ? timeRef.current : 0;

      ctx.beginPath();
      for (let i = 0; i <= sampleCount; i++) {
        const progress = i / sampleCount;
        const point = getRoundedRectPoint(progress, left, top, borderWidth, borderHeight, radius);
        const xNoise = octavedNoise(
          progress * 8,
          octaves,
          lacunarity,
          gain,
          amplitude,
          frequency,
          t,
          0,
          baseFlatness,
        );
        const yNoise = octavedNoise(
          progress * 8,
          octaves,
          lacunarity,
          gain,
          amplitude,
          frequency,
          t,
          1,
          baseFlatness,
        );
        const displacedX = point.x + xNoise * displacement;
        const displacedY = point.y + yNoise * displacement;
        if (i === 0) ctx.moveTo(displacedX, displacedY);
        else ctx.lineTo(displacedX, displacedY);
      }
      ctx.closePath();
      ctx.stroke();
    };

    const canAnimate = () => !calmRef.current && inView && pageVisible;

    const stopLoop = (paintStatic: boolean) => {
      if (animationRef.current != null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (paintStatic) strokeOnce(performance.now(), false);
    };

    const tick = (currentTime: number) => {
      syncCalm();
      if (!canAnimate()) {
        strokeOnce(currentTime, false);
        animationRef.current = null;
        return;
      }
      strokeOnce(currentTime, true);
      animationRef.current = requestAnimationFrame(tick);
    };

    const kick = () => {
      syncCalm();
      if (!canAnimate()) {
        stopLoop(true);
        return;
      }
      if (animationRef.current == null) {
        lastFrameTimeRef.current = performance.now();
        animationRef.current = requestAnimationFrame(tick);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
        if (!inView) stopLoop(true);
        else kick();
      },
      { rootMargin: '120px', threshold: 0 },
    );
    io.observe(host);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (!pageVisible) stopLoop(true);
      else kick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const ro = new ResizeObserver(() => {
      size = updateSize();
      if (!canAnimate()) strokeOnce(performance.now(), false);
    });
    ro.observe(host);

    lastFrameTimeRef.current = performance.now();
    kick();

    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [color, speed, chaos, thickness, borderRadiusProp, merchCalm]);

  const inheritRadius: CSSProperties = { borderRadius: 'inherit' };
  const glow1Style: CSSProperties = {
    ...inheritRadius,
    borderWidth: thickness,
    borderStyle: 'solid',
    borderColor: hexToRgba(color, 0.6),
    filter: `blur(${0.5 + thickness * 0.25}px)`,
    opacity: 0.5,
  };
  const glow2Style: CSSProperties = {
    ...inheritRadius,
    borderWidth: thickness,
    borderStyle: 'solid',
    borderColor: color,
    filter: `blur(${2 + thickness * 0.5}px)`,
    opacity: 0.5,
  };
  const bgGlowStyle: CSSProperties = {
    ...inheritRadius,
    transform: 'scale(1.08)',
    filter: 'blur(32px)',
    opacity: 0.3,
    zIndex: -1,
    background: `linear-gradient(-30deg, ${hexToRgba(color, 0.8)}, transparent, ${color})`,
  };

  return (
    <div
      ref={setRefs}
      className={className}
      style={{
        ...style,
        ['--electric-border-color' as string]: color,
      }}
      {...(merchCalm ? { 'data-electric-calm': '' } : null)}
    >
      <div className="electric-border__canvas-wrap" aria-hidden>
        <canvas ref={canvasRef} className="electric-border__canvas" />
      </div>
      <div className="electric-border__layers" aria-hidden style={inheritRadius}>
        <div className="electric-border__glow1" style={glow1Style} />
        <div className="electric-border__glow2" style={glow2Style} />
        <div className="electric-border__bg" style={bgGlowStyle} />
      </div>
      <div className="electric-border__content" style={inheritRadius}>
        {children}
      </div>
    </div>
  );
});

type AuraFrameProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Product `aura_color` / hex — used when class is electric. */
  color?: string | null;
  /** Per-product electric knobs (`aura_electric_json`). Omit → defaults. */
  electric?: ElectricAuraTune | null;
};

/** Aura host: electric → canvas ElectricBorder; else plain div (daisyUI aura). */
export const AuraFrame = forwardRef<HTMLDivElement, AuraFrameProps>(function AuraFrame(
  { children, className = '', style, color, electric },
  ref,
) {
  if (isElectricAura(className)) {
    const resolved =
      normalizeAuraColor(color) ??
      (typeof style?.color === 'string' ? style.color : null) ??
      DEFAULT_ELECTRIC_AURA_COLOR;
    const tune = parseElectricAuraTune(electric ?? DEFAULT_ELECTRIC_AURA_TUNE);
    // Tiny thumbs: slight chaos bump only when still on stock defaults.
    const sm = /\baura-sm\b/.test(className);
    const stock =
      tune.speed === DEFAULT_ELECTRIC_AURA_TUNE.speed &&
      tune.chaos === DEFAULT_ELECTRIC_AURA_TUNE.chaos &&
      tune.thickness === DEFAULT_ELECTRIC_AURA_TUNE.thickness;
    const chaos = sm && stock ? 0.16 : tune.chaos;
    const thickness = sm && stock ? 1.5 : tune.thickness;
    return (
      <ElectricBorder
        ref={ref}
        className={className}
        style={style}
        color={resolved}
        chaos={chaos}
        speed={tune.speed}
        thickness={thickness}
        borderRadius={sm ? 8 : 16}
      >
        {children}
      </ElectricBorder>
    );
  }
  return (
    <div ref={ref} className={className || undefined} style={style}>
      {children}
    </div>
  );
});
