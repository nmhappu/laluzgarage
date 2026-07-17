import React, { useId } from 'react';
import { cn } from '../lib/utils';

interface WavyProgressProps {
  value: number; // progress between 0 and max
  max?: number;  // defaults to 100
  className?: string;
  color?: string; // custom stroke CSS color, defaults to workshop-accent (via classes)
  height?: number; // total container height, defaults to 16
  waveLength?: number; // width of one full wave cycle, defaults to 24
  amplitude?: number;  // amplitude of the wave, defaults to 3
  strokeWidth?: number; // width of the wave line, defaults to 3
}

export function WavyProgress({
  value,
  max = 100,
  className,
  color,
  height = 24,
  waveLength = 32,
  amplitude = 5.5,
  strokeWidth = 5
}: WavyProgressProps) {
  const uniqueId = useId();
  const patternId = `wavy-progress-pattern-${uniqueId.replace(/:/g, '')}`;
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn(!className?.includes('absolute') && "w-full", "select-none relative flex items-center", className)} style={{ height }}>
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern 
            id={patternId} 
            x="0" 
            y="0" 
            width={waveLength} 
            height={height} 
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 0,${height / 2} Q ${waveLength / 4},${height / 2 - amplitude} ${waveLength / 2},${height / 2} T ${waveLength},${height / 2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className={cn("text-workshop-accent", color ? "" : "text-workshop-accent")}
              style={color ? { color } : undefined}
            />
            {/* Native SVG SMIL animation for maximum performance and GPU optimization */}
            <animate 
              attributeName="x" 
              from="0" 
              to={waveLength} 
              dur="1.2s" 
              repeatCount="indefinite" 
            />
          </pattern>
        </defs>

        {/* 1. Inactive Track: full-width straight line mimicking M3 inactive track */}
        <line
          x1="0"
          y1={height / 2}
          x2="100%"
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={strokeWidth * 0.6}
          strokeLinecap="round"
          className="text-workshop-border opacity-60"
        />

        {/* 2. Active Track: clipped dynamically inside parent matching progress % */}
        <svg width={`${percentage}%`} height="100%" className="transition-[width] duration-500 ease-out overflow-hidden">
          <rect
            width="100%"
            height="100%"
            fill={`url(#${patternId})`}
          />
        </svg>
      </svg>
    </div>
  );
}
