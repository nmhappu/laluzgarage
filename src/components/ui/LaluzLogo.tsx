import React from 'react';
import { cn } from '../../lib/utils';

interface LaluzLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  showGlow?: boolean;
  glowColor?: string;
  className?: string;
}

/**
 * Official LaluZ Garage Geometric Brand Emblem:
 * Tight bounding box (viewBox: 223 422 808 418, aspect ratio ~1.93 : 1)
 * Eliminates empty transparent padding around the artwork.
 */
export function LaluzLogo({
  size,
  width,
  height,
  showGlow = false,
  glowColor = 'rgba(16, 185, 129, 0.25)',
  className,
  style,
  ...props
}: LaluzLogoProps) {
  // Sizing calculation based on natural ~1.933 : 1 aspect ratio
  const computeDimension = (val: number | string | undefined) => {
    if (val === undefined) return undefined;
    return typeof val === 'number' ? `${val}px` : val;
  };

  const resolvedWidth = computeDimension(width ?? (height ? undefined : (size ?? 48)));
  const resolvedHeight = computeDimension(height);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{
        width: resolvedWidth,
        height: resolvedHeight,
        aspectRatio: '808 / 418',
        ...style,
      }}
    >
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full blur-2xl pointer-events-none scale-125 transition-opacity"
          style={{ backgroundColor: glowColor }}
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="223 422 808 418"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("w-full h-full relative z-10 block transition-transform", className)}
        aria-label="LaluZ Garage Logo"
        {...props}
      >
        {/* Left Wing / 'L' Shape */}
        <path
          d="M375.641 735.346l43.365-97.683 60.698-135.652 34.841-76.253-125.363-.084-39.464 93.3-122.504 286.466c8.79 3.751 14.553 10.396 16.521 19.408l219.693-.06 6.242-14.069 32.138-75.097-126.166-.276Z"
          fill="currentColor"
        />
        {/* Center Kinetic Accent Spark / Lightning Bolt */}
        <path
          d="M627.609 634.262l-77.582-.455 43.503-78.677 12.708-22.83-18.02 16.779-67.552 64.621-60.47 58.776 87.812.281-46.923 114.255h0l-14.986 37.971c8.805-8.289 14.953-18.188 22.253-28.141h0s119.257-162.58 119.257-162.58Z"
          fill="#78DF22"
        />
        {/* Right Wing / 'Z' Geometry */}
        <g fill="currentColor">
          <path
            d="M785.248 567.462c-15.687.021-29.883 8.313-41.359 18.259-29.852 25.871-44.948 76.418-24.659 111.322 8.58 14.76 23.145 24.62 40.276 24.681l99.279.353-10.893 24.145c-1.95 4.323-6.017 8.74-11.497 8.747l-167.805.199c-6.387.008-12.105-4.179-14.607-7.814-3.666-5.325-4.519-11.869-1.989-17.879l57.783-137.282 18.511-43.542c6.197-14.576 21.436-24.818 37.595-24.845l172.088-.284 25.992-49.088 24.357-47.035-243.897.117c-46.053.022-91.915 31.626-111.18 72.898l-55.912 119.778 75.051.345-111.359 159.929c7.098 32.906 36.766 47.867 69.693 47.833l220.52-.228c.012.067.029.132.041.199l81.01.054h1.338c7.438-18.471 15.323-38.115 15.338-38.154 0 0 0-.002 0-.002l.003-.008 1.488-3.345s.004.006.007.009l1.619-3.666 42.954-97.28 51.751-118.746-241.539.328ZM900.15 660.689l-59.526.086c-6.527.009-5.626 11.073-19.682 21.091-18.631 13.277-45.563 7.596-56.015-13.849l32.252-2.583 10.046-17.597-10.238-17.504-31.715-2.368c8.258-19.429 31.088-27.646 49.931-18.433 11.732 5.736 19.02 16.276 22.712 28.714l72.004.402-9.769 22.042Z"
          />
          <path d="M930.705 787.139c-.082-.104-.16-.21-.242-.314l-.022.05c.089.088.176.176.264.264Z" />
        </g>
      </svg>
    </div>
  );
}
