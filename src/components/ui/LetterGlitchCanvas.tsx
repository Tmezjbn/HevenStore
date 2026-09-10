import { useEffect, useRef } from 'react';
import {
  clampGlitchSpeed,
  DEFAULT_GLITCH_CHARS,
  DEFAULT_GLITCH_SPEED,
} from '../../lib/productCardFx';

type Props = {
  colors: string[];
  /** Interval ms between glitch updates (lower = faster). */
  glitchSpeed?: number;
  smooth?: boolean;
  outerVignette?: boolean;
  centerVignette?: boolean;
  characters?: string;
  /** When false, rAF stops (offscreen). */
  active: boolean;
  className?: string;
};

type Rgb = { r: number; g: number; b: number };
type Cell = {
  char: string;
  color: string;
  startRgb: Rgb;
  targetRgb: Rgb;
  colorProgress: number;
};

/**
 * React Bits Letter Glitch — adapted for product-card FX (ResizeObserver + offscreen pause).
 * Source: https://www.reactbits.dev/backgrounds/letter-glitch
 */
export default function LetterGlitchCanvas({
  colors,
  glitchSpeed: speedProp,
  smooth = true,
  outerVignette = true,
  centerVignette = false,
  characters = DEFAULT_GLITCH_CHARS,
  active,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const glitchSpeed = clampGlitchSpeed(speedProp ?? DEFAULT_GLITCH_SPEED);
    const palette = colors.length > 0 ? colors : ['#22c55e'];
    const glyphs = Array.from(characters.length > 0 ? characters : DEFAULT_GLITCH_CHARS);
    const fontSize = 16;
    const charWidth = 10;
    const charHeight = 20;

    let raf = 0;
    let running = true;
    let letters: Cell[] = [];
    let columns = 0;
    let rows = 0;
    let lastGlitch = performance.now();
    let cssW = 0;
    let cssH = 0;

    const randChar = () => glyphs[Math.floor(Math.random() * glyphs.length)]!;
    const randColor = () => palette[Math.floor(Math.random() * palette.length)]!;

    const hexToRgb = (hex: string): Rgb | null => {
      let h = hex.trim();
      const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(h);
      if (short) h = `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
      if (!m) return null;
      return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
    };

    const rgbCss = (c: Rgb) => `rgb(${c.r},${c.g},${c.b})`;
    const lerpRgb = (a: Rgb, b: Rgb, t: number): Rgb => ({
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    });

    const makeCell = (): Cell => {
      const hex = randColor();
      const rgb = hexToRgb(hex) ?? { r: 34, g: 197, b: 94 };
      return {
        char: randChar(),
        color: hex,
        startRgb: rgb,
        targetRgb: rgb,
        colorProgress: 1,
      };
    };

    const initGrid = (w: number, h: number) => {
      columns = Math.max(1, Math.ceil(w / charWidth));
      rows = Math.max(1, Math.ceil(h / charHeight));
      letters = Array.from({ length: columns * rows }, makeCell);
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = Math.max(1, Math.floor(rect.width));
      cssH = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initGrid(cssW, cssH);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.font = `${fontSize}px monospace`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < letters.length; i++) {
        const cell = letters[i]!;
        const x = (i % columns) * charWidth;
        const y = Math.floor(i / columns) * charHeight;
        ctx.fillStyle = cell.color;
        ctx.fillText(cell.char, x, y);
      }
    };

    const updateLetters = () => {
      const n = Math.max(1, Math.floor(letters.length * 0.05));
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * letters.length);
        const cell = letters[idx];
        if (!cell) continue;
        cell.char = randChar();
        const nextHex = randColor();
        const nextRgb = hexToRgb(nextHex) ?? cell.targetRgb;
        if (!smooth) {
          cell.color = nextHex;
          cell.startRgb = nextRgb;
          cell.targetRgb = nextRgb;
          cell.colorProgress = 1;
        } else {
          cell.startRgb =
            cell.colorProgress < 1
              ? lerpRgb(cell.startRgb, cell.targetRgb, cell.colorProgress)
              : cell.targetRgb;
          cell.targetRgb = nextRgb;
          cell.colorProgress = 0;
        }
      }
    };

    const smoothColors = () => {
      let dirty = false;
      for (const cell of letters) {
        if (cell.colorProgress >= 1) continue;
        cell.colorProgress = Math.min(1, cell.colorProgress + 0.05);
        cell.color = rgbCss(lerpRgb(cell.startRgb, cell.targetRgb, cell.colorProgress));
        dirty = true;
      }
      if (dirty) draw();
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);

    if (!active) {
      return () => {
        running = false;
        ro.disconnect();
        cancelAnimationFrame(raf);
      };
    }

    const tick = (now: number) => {
      if (!running) return;
      if (now - lastGlitch >= glitchSpeed) {
        updateLetters();
        draw();
        lastGlitch = now;
      }
      if (smooth) smoothColors();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [colors, speedProp, smooth, characters, active]);

  return (
    <div
      ref={wrapRef}
      className={className ?? 'product-card__fx-glitch'}
      aria-hidden
    >
      <canvas ref={canvasRef} className="product-card__fx-glitch-canvas" />
      {outerVignette ? <div className="product-card__fx-glitch-vignette product-card__fx-glitch-vignette--outer" /> : null}
      {centerVignette ? (
        <div className="product-card__fx-glitch-vignette product-card__fx-glitch-vignette--center" />
      ) : null}
    </div>
  );
}

// ponytail: ceiling = full-grid canvas rAF; upgrade = lower update % / OffscreenCanvas if many cards
if (import.meta.env.DEV) {
  console.assert(DEFAULT_GLITCH_CHARS.length > 20, 'glitch charset');
  console.assert(clampGlitchSpeed(5) === 10, 'glitch speed floor');
  console.assert(clampGlitchSpeed(50) === 50, 'glitch speed default');
}
