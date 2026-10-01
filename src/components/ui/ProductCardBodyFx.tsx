import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { atmosphereLogoById, atmosphereLogoToneClass } from '../../lib/atmosphereLogos';
import {
  cardFxActive,
  clampGlitchChars,
  clampGlitchSpeed,
  clampMatrixCols,
  clampMatrixLetters,
  clampMatrixSpeed,
  DEFAULT_CARD_FX_COLOR,
  DEFAULT_CARD_FX_COLOR2,
  DEFAULT_GLITCH_CENTER_VIGNETTE,
  DEFAULT_GLITCH_CHARS,
  DEFAULT_GLITCH_OUTER_VIGNETTE,
  DEFAULT_GLITCH_SMOOTH,
  DEFAULT_GLITCH_SPEED,
  DEFAULT_MATRIX_COLS,
  DEFAULT_MATRIX_LETTERS,
  DEFAULT_MATRIX_SPEED,
  DEFAULT_MATRIX_TYPE,
  matrixGlitchColors,
  matrixSpeedFactor,
  mixHexColors,
  normalizeCardFx,
  type ProductCardFx,
} from '../../lib/productCardFx';
import { useMerchMotionCalm } from '../../hooks/useMerchMotionCalm';
import LetterGlitchCanvas from './LetterGlitchCanvas';
import MatrixRainCanvas from './MatrixRainCanvas';

/** Half-width katakana + digits — no vertical bars (those smear into gray streaks). */
const MATRIX_GLYPHS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ｦｧｨｩｪｫｯｬｭｮｰ:.+-=*<>';

function matrixStream(col: number, len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += MATRIX_GLYPHS[(col * 17 + i * 31 + col * i) % MATRIX_GLYPHS.length]!;
  }
  return out;
}

const EMBER_COUNT = 9;

type MatrixCol = { head: string; tail: string; dur: string; tint?: string };

function buildMatrixCols(
  cols: number,
  letters: number,
  speed: number,
  gradient: boolean,
  c1: string,
  c2: string,
): MatrixCol[] {
  const n = clampMatrixCols(cols);
  const len = clampMatrixLetters(letters);
  const pace = Math.max(0.15, matrixSpeedFactor(speed));
  const last = Math.max(1, n - 1);
  return Array.from({ length: n }, (_, i) => {
    const stream = matrixStream(i, len);
    const base = 4.8 + (i % 8) * 0.3;
    return {
      head: stream.slice(0, 1),
      tail: stream.slice(1),
      dur: `${(base / pace).toFixed(2)}s`,
      tint: gradient ? mixHexColors(c1, c2, i / last) : undefined,
    };
  });
}

/** Behind card-body copy — matrix / logo / scan / sheen / embers / rift. */
export default function ProductCardBodyFx({ fx }: { fx: ProductCardFx | null | undefined }) {
  const cfg = normalizeCardFx(fx);
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const merchCalm = useMerchMotionCalm();
  const fxActive = inView && !merchCalm;

  const color = cfg.color ?? DEFAULT_CARD_FX_COLOR;
  const color2 = cfg.color2 ?? DEFAULT_CARD_FX_COLOR2;
  const gradient = Boolean(cfg.gradient);
  const gradientShift = gradient && Boolean(cfg.gradientShift);
  const matrixUp = cfg.style === 'matrix' && cfg.matrixDir === 'up';
  const matrixType =
    cfg.style === 'matrix' ? (cfg.matrixType ?? DEFAULT_MATRIX_TYPE) : DEFAULT_MATRIX_TYPE;
  const matrixDom = cfg.style === 'matrix' && matrixType === 2;
  const matrixGlitch = cfg.style === 'matrix' && matrixType === 3;
  const matrixColCount =
    cfg.style === 'matrix' ? clampMatrixCols(cfg.matrixCols ?? DEFAULT_MATRIX_COLS) : DEFAULT_MATRIX_COLS;
  const matrixLetterCount =
    cfg.style === 'matrix'
      ? clampMatrixLetters(cfg.matrixLetters ?? DEFAULT_MATRIX_LETTERS)
      : DEFAULT_MATRIX_LETTERS;
  const matrixSpeed =
    cfg.style === 'matrix'
      ? clampMatrixSpeed(cfg.matrixSpeed ?? DEFAULT_MATRIX_SPEED)
      : DEFAULT_MATRIX_SPEED;
  const glitchSpeed = matrixGlitch
    ? clampGlitchSpeed(cfg.matrixGlitchSpeed ?? DEFAULT_GLITCH_SPEED)
    : DEFAULT_GLITCH_SPEED;
  const glitchSmooth =
    matrixGlitch && cfg.matrixGlitchSmooth === false ? false : DEFAULT_GLITCH_SMOOTH;
  const glitchOuter =
    matrixGlitch && cfg.matrixOuterVignette === false ? false : DEFAULT_GLITCH_OUTER_VIGNETTE;
  const glitchCenter = matrixGlitch
    ? Boolean(cfg.matrixCenterVignette) || DEFAULT_GLITCH_CENTER_VIGNETTE
    : DEFAULT_GLITCH_CENTER_VIGNETTE;
  const glitchChars = matrixGlitch
    ? clampGlitchChars(cfg.matrixGlitchChars ?? DEFAULT_GLITCH_CHARS)
    : DEFAULT_GLITCH_CHARS;
  const glitchColor3 = cfg.color3;
  const glitchColors = useMemo(
    () =>
      matrixGlitch
        ? matrixGlitchColors({ style: 'matrix', color, color2, color3: glitchColor3 })
        : [],
    [matrixGlitch, color, color2, glitchColor3],
  );

  // Type 2 DOM: static per-col tints when gradient is still; shift uses CSS chroma wave.
  const matrixCols = useMemo(
    () =>
      matrixDom
        ? buildMatrixCols(
            matrixColCount,
            matrixLetterCount,
            matrixSpeed,
            gradient && !gradientShift,
            color,
            color2,
          )
        : null,
    [
      matrixDom,
      matrixColCount,
      matrixLetterCount,
      matrixSpeed,
      gradient,
      gradientShift,
      color,
      color2,
    ],
  );

  useEffect(() => {
    if (!cardFxActive(cfg)) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '120px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cfg]);

  if (!cardFxActive(cfg)) return null;

  const logo = cfg.style === 'logo' ? atmosphereLogoById(cfg.logoId ?? '') : undefined;

  const rootStyle = {
    ['--card-fx-color' as string]: color,
    ['--card-fx-color-2' as string]: gradient ? color2 : color,
    ...(matrixDom ? ({ ['--matrix-cols' as string]: matrixColCount } as CSSProperties) : null),
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`product-card__fx product-card__fx--${cfg.style}${gradient ? ' is-gradient' : ''}${gradientShift ? ' is-shift' : ''}${matrixUp ? ' is-matrix-up' : ''}${matrixDom ? ' is-matrix-dom' : ''}${matrixGlitch ? ' is-matrix-glitch' : ''}${fxActive ? '' : ' is-offscreen'}`}
      style={rootStyle}
      aria-hidden
    >
      {cfg.style === 'matrix' && !matrixDom && !matrixGlitch ? (
        <MatrixRainCanvas
          cols={matrixColCount}
          letters={matrixLetterCount}
          speed={matrixSpeed}
          color={color}
          color2={color2}
          gradient={gradient}
          shift={gradientShift}
          up={matrixUp}
          active={fxActive}
        />
      ) : null}
      {matrixGlitch ? (
        <LetterGlitchCanvas
          colors={glitchColors}
          glitchSpeed={glitchSpeed}
          smooth={glitchSmooth}
          outerVignette={glitchOuter}
          centerVignette={glitchCenter}
          characters={glitchChars}
          active={fxActive}
        />
      ) : null}
      {/* Keep DOM mounted — unmount/remount was re-spawning rain mid-scroll. */}
      {matrixDom && matrixCols ? (
        <div className="product-card__fx-matrix">
          {matrixCols.map((col, i) => (
            <span
              key={i}
              className="product-card__fx-matrix-col"
              style={
                {
                  ['--i' as string]: i,
                  ['--matrix-dur' as string]: col.dur,
                  ...(col.tint
                    ? ({ ['--card-fx-color' as string]: col.tint } as CSSProperties)
                    : null),
                } as CSSProperties
              }
            >
              <span className="product-card__fx-matrix-stack">
                <span className="product-card__fx-matrix-tail">{col.tail}</span>
                <span className="product-card__fx-matrix-head">{col.head}</span>
              </span>
              <span className="product-card__fx-matrix-stack" aria-hidden>
                <span className="product-card__fx-matrix-tail">{col.tail}</span>
                <span className="product-card__fx-matrix-head">{col.head}</span>
              </span>
            </span>
          ))}
        </div>
      ) : null}
      {cfg.style === 'logo' && logo ? (
        <img
          src={logo.src}
          alt=""
          className={`product-card__fx-logo ${atmosphereLogoToneClass(logo)}`}
        />
      ) : null}
      {cfg.style === 'scan' ? <div className="product-card__fx-scan" /> : null}
      {cfg.style === 'sheen' ? <div className="product-card__fx-sheen" /> : null}
      {cfg.style === 'embers' ? (
        <div className="product-card__fx-embers">
          {Array.from({ length: EMBER_COUNT }, (_, i) => (
            <span
              key={i}
              className="product-card__fx-ember"
              style={
                {
                  ['--i' as string]: i,
                  ...(gradient
                    ? {
                        ['--card-fx-color' as string]: mixHexColors(
                          color,
                          color2,
                          i / (EMBER_COUNT - 1),
                        ),
                      }
                    : null),
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
      {cfg.style === 'rift' ? <div className="product-card__fx-rift" /> : null}
    </div>
  );
}
