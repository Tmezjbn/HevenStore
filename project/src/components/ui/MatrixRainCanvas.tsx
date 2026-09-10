import { useEffect, useRef } from 'react';
import {
  clampMatrixCols,
  clampMatrixLetters,
  clampMatrixSpeed,
  DEFAULT_MATRIX_COLS,
  DEFAULT_MATRIX_LETTERS,
  DEFAULT_MATRIX_SPEED,
  matrixSpeedFactor,
  mixHexColors,
} from '../../lib/productCardFx';

/** Half-width katakana + digits — no vertical bars (those smear into gray streaks). */
const GLYPHS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ｦｧｨｩｪｫｯｬｭｮｰ:.+-=*<>';

type Props = {
  cols?: number;
  /** Letters per falling stream (trail length / density). */
  letters?: number;
  /** Rain pace 1–10 (5 = default). */
  speed?: number;
  color: string;
  color2: string;
  gradient: boolean;
  /** Animate gradient phase across columns over time. */
  shift: boolean;
  /** Rain travels up instead of down. */
  up: boolean;
  /** When false, rAF stops (offscreen). */
  active: boolean;
  className?: string;
};

type Drop = { y: number; speed: number; seed: number };

/**
 * One canvas matrix rain — far cheaper than dozens of animated DOM glyph columns.
 * Paints only while `active` (in view + merch motion not calmed).
 */
export default function MatrixRainCanvas({
  cols: colsProp,
  letters: lettersProp,
  speed: speedProp,
  color,
  color2,
  gradient,
  shift,
  up,
  active,
  className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<Drop[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const cols = clampMatrixCols(colsProp ?? DEFAULT_MATRIX_COLS);
    const letters = clampMatrixLetters(lettersProp ?? DEFAULT_MATRIX_LETTERS);
    const pace = matrixSpeedFactor(speedProp ?? DEFAULT_MATRIX_SPEED);
    // Parent passes active=false when offscreen or merch_motion_mode calms FX.
    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let cell = 12;
    let fontPx = 10;

    const ensureDrops = (n: number, heightCells: number) => {
      const prev = dropsRef.current;
      if (prev.length === n) return prev;
      const next: Drop[] = Array.from({ length: n }, (_, i) => {
        const old = prev[i];
        return (
          old ?? {
            y: -((i * 2.37) % Math.max(8, heightCells)) - (i % 5) * 0.4,
            speed: 0.28 + (i % 7) * 0.06 + (i % 3) * 0.035,
            seed: i * 17 + 3,
          }
        );
      });
      dropsRef.current = next;
      return next;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      cell = w / cols;
      fontPx = Math.max(7, Math.min(cell * 0.82, 13));
    };

    const glyph = (seed: number, row: number) =>
      GLYPHS[((seed * 31 + row * 17) % GLYPHS.length + GLYPHS.length) % GLYPHS.length]!;

    /** Static L→R blend, or smooth chroma wave through each letter (no hard wrap). */
    const inkAt = (col: number, row: number, now: number) => {
      if (!gradient) return color;
      if (!shift) return mixHexColors(color, color2, col / Math.max(1, cols - 1));
      // sin ping-pong — old `(t + now) % 1` snapped at the seam every cycle.
      const phase = now * 0.002 + col * 0.4 + row * 0.16;
      const t = 0.5 + 0.5 * Math.sin(phase);
      return mixHexColors(color, color2, t);
    };

    const wipe = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (now: number, animate: boolean) => {
      wipe();
      ctx.font = `600 ${fontPx}px "Segoe UI", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const heightCells = Math.max(1, h / cell);
      const drops = ensureDrops(cols, heightCells);
      const trail = letters;
      // Pack denser when letters > card height so the slider still reads on short stages.
      const step = letters > heightCells ? heightCells / letters : 1;
      const dir = up ? -1 : 1;
      const span = trail * step;

      for (let i = 0; i < cols; i++) {
        const d = drops[i]!;
        if (animate) {
          d.y += d.speed * dir * pace;
          if (!up && d.y > heightCells + span) d.y = -span - ((i * 1.7) % 8);
          if (up && d.y < -span) d.y = heightCells + ((i * 1.7) % 8);
        }
        const x = (i + 0.5) * cell;
        for (let r = 0; r < trail; r++) {
          const row = Math.floor(d.y / step) - r * dir;
          const gy = (d.y - r * dir * step) * cell + cell * 0.5;
          if (gy < -cell || gy > h + cell) continue;
          const head = r === 0;
          // Fade scales with trail — old fixed 0.7-r*0.07 made letters>10 invisible.
          const fade = trail <= 1 ? 0 : r / (trail - 1);
          const ink = inkAt(i, row, now);
          ctx.globalAlpha = head ? 0.95 : Math.max(0.16, 0.82 * (1 - fade));
          ctx.fillStyle = head ? mixHexColors(ink, '#ffffff', 0.35) : ink;
          ctx.fillText(glyph(d.seed, row), x, gy);
        }
      }
      ctx.globalAlpha = 1;
    };

    resize();
    paint(performance.now(), false);

    const ro = new ResizeObserver(() => {
      resize();
      paint(performance.now(), false);
    });
    ro.observe(canvas);

    if (!active) {
      return () => {
        running = false;
        ro.disconnect();
        cancelAnimationFrame(raf);
      };
    }

    const tick = (now: number) => {
      if (!running) return;
      paint(now, true);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [colsProp, lettersProp, speedProp, color, color2, gradient, shift, up, active]);

  return (
    <canvas
      ref={ref}
      className={className ?? 'product-card__fx-matrix-canvas'}
      aria-hidden
    />
  );
}

// ponytail: ceiling = 2d canvas rAF; upgrade = OffscreenCanvas worker if many cards on screen
if (import.meta.env.DEV) {
  console.assert(GLYPHS.length > 40, 'matrix glyphs');
  console.assert(!GLYPHS.includes('｜') && !GLYPHS.includes('¦'), 'no vertical-bar glyphs');
  console.assert(clampMatrixCols(3) === 8);
  console.assert(clampMatrixLetters(30) === 30);
  console.assert(clampMatrixSpeed(5) === 5);
}
