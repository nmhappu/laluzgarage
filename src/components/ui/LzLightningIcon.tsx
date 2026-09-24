import React from 'react';

export interface LzLightningIconProps extends React.SVGProps<SVGSVGElement> {
  glow?: boolean;
}

/**
 * Official LaluZ Garage Lightning Bolt Accent Icon
 * Derived from the center kinetic accent spark of the LaluZ Garage emblem.
 */
export function LzLightningIcon({
  className = "w-4 h-6",
  glow = false,
  fill = "#78df22",
  style,
  ...props
}: LzLightningIconProps) {
  return (
    <svg
      viewBox="460.196 532.3 167.413 292.683"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        filter: glow ? 'drop-shadow(0 0 6px rgba(120, 223, 34, 0.45))' : undefined,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M627.609,634.262l-77.582-.455,43.503-78.677,12.708-22.83-18.02,16.779-67.552,64.621-60.47,58.776,87.812.281-46.923,114.255h0l-14.986,37.971c8.805-8.289,14.953-18.188,22.253-28.141h0s119.257-162.58,119.257-162.58Z"
        fill={fill}
      />
    </svg>
  );
}
