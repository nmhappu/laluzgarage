import { useId } from 'react';

/**
 * LaluZ wordmark from the artboard vector (LaluzLogo.kt): the ink follows the theme, the bolt stays
 * green. With [draw], it writes itself stroke by stroke: L, bolt, G, then the G crossbar, 1400ms
 * after a 200ms delay. Reduced motion shows it solid (the global reduced-motion rule ends the
 * animations at once).
 */

const VIEW_BOX = '227 426 800 403';

const INK_L =
  'M375.641 735.346l43.365 -97.683 60.698 -135.652 34.841 -76.253 -125.363 -.084 -39.464 93.3 -122.504 286.466c8.79 3.751 14.553 10.396 16.521 19.408l219.693 -.06 6.242 -14.069 32.138 -75.097 -126.166 -.276Z';
const BOLT =
  'M627.609 634.262l-77.582 -.455 43.503 -78.677 12.708 -22.83 -18.02 16.779 -67.552 64.621 -60.47 58.776 87.812 .281 -46.923 114.255h0l-14.986 37.971c8.805 -8.289 14.953 -18.188 22.253 -28.141h0s119.257 -162.58 119.257 -162.58Z';
const INK_UZ =
  'M785.248 567.462c-15.687 .021 -29.883 8.313 -41.359 18.259 -29.852 25.871 -44.948 76.418 -24.659 111.322 8.58 14.76 23.145 24.62 40.276 24.681l99.279 .353 -10.893 24.145c-1.95 4.323 -6.017 8.74 -11.497 8.747l-167.805 .199c-6.387 .008 -12.105 -4.179 -14.607 -7.814 -3.666 -5.325 -4.519 -11.869 -1.989 -17.879l57.783 -137.282 18.511 -43.542c6.197 -14.576 21.436 -24.818 37.595 -24.845l172.088 -.284 25.992 -49.088 24.357 -47.035 -243.897 .117c-46.053 .022 -91.915 31.626 -111.18 72.898l-55.912 119.778 75.051 .345 -111.359 159.929c7.098 32.906 36.766 47.867 69.693 47.833l220.52 -.228c.012 .067 .029 .132 .041 .199l81.01 .054h1.338c7.438 -18.471 15.323 -38.115 15.338 -38.154 0 0 0 -.002 0 -.002l.003 -.008 1.488 -3.345s.004 .006 .007 .009l1.619 -3.666 42.954 -97.28 51.751 -118.746 -241.539 .328ZM900.15 660.689l-59.526 .086c-6.527 .009 -5.626 11.073 -19.682 21.091 -18.631 13.277 -45.563 7.596 -56.015 -13.849l32.252 -2.583 10.046 -17.597 -10.238 -17.504 -31.715 -2.368c8.258 -19.429 31.088 -27.646 49.931 -18.433 11.732 5.736 19.02 16.276 22.712 28.714l72.004 .402 -9.769 22.042Z';
const INK_DOT = 'M930.705 787.139c-.082 -.104 -.16 -.21 -.242 -.314l-.022 .05c.089 .088 .176 .176 .264 .264Z';

const DRAW_MS = 1400;
const DELAY_MS = 200;
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';

/** Pen strokes along each glyph's centreline, clipped to the glyph (fractions of DRAW_MS). */
const PEN_STROKES = [
  { d: 'M455 400 L290 788 L520 782', clip: 0, width: 150, start: 0, end: 0.3, easeOut: false },
  { d: 'M618 515 L484 660 L606 648 L476 846', clip: 1, width: 84, start: 0.2643, end: 0.4214, easeOut: true },
  { d: 'M1010 476 L735 476 C700 476 684 495 672 520 L640 620 L612 730 L592 790 L880 790 C915 790 925 770 932 740 L960 640', clip: 2, width: 132, start: 0.4, end: 0.8571, easeOut: false },
  { d: 'M1040 645 L700 645', clip: 2, width: 160, start: 0.8214, end: 1, easeOut: true },
];

const GLYPHS = [INK_L, BOLT, INK_UZ];

interface LogoProps {
  width?: number;
  height?: number;
  draw?: boolean;
  className?: string;
}

export function LaluzLogo({ width = 128, height = 64, draw = false, className }: LogoProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={width} height={height} viewBox={VIEW_BOX} role="img" aria-label="LaluZ Garage logo" className={className} style={{ display: 'block' }}>
      {!draw ? (
        <>
          <path d={INK_L} fill="var(--color-logo-ink)" />
          <path d={BOLT} fill="var(--color-logo-bolt)" />
          <path d={INK_UZ} fill="var(--color-logo-ink)" />
          <path d={INK_DOT} fill="var(--color-logo-ink)" />
        </>
      ) : (
        <>
          <defs>
            {GLYPHS.map((g, i) => (
              <clipPath key={i} id={`${id}-g${i}`}>
                <path d={g} />
              </clipPath>
            ))}
          </defs>
          {PEN_STROKES.map((s, i) => (
            <g key={i} clipPath={`url(#${id}-g${s.clip})`}>
              <path
                d={s.d}
                pathLength={1}
                fill="none"
                stroke={s.clip === 1 ? 'var(--color-logo-bolt)' : 'var(--color-logo-ink)'}
                strokeWidth={s.width}
                strokeLinejoin="round"
                strokeDasharray="1 1"
                style={{
                  strokeDashoffset: 1,
                  animation: `lz-logo-draw ${(s.end - s.start) * DRAW_MS}ms ${s.easeOut ? EASE_OUT : EASE_IN_OUT} ${DELAY_MS + s.start * DRAW_MS}ms forwards`,
                }}
              />
            </g>
          ))}
          <style>{'@keyframes lz-logo-draw { to { stroke-dashoffset: 0; } }'}</style>
        </>
      )}
    </svg>
  );
}

/** Total time of the draw-on, delay included. */
export const LOGO_DRAW_TOTAL_MS = DELAY_MS + DRAW_MS;
