import React from 'react';
import { OlaWatermark } from '../ui/BrandIcons';
import { isOlaVehicle, cn } from '../../lib/utils';

export interface VehicleWatermarkProps {
  make?: string;
  model?: string;
  className?: string;
}

export const VehicleWatermark = React.memo(function VehicleWatermark({
  make,
  model,
  className,
}: VehicleWatermarkProps) {
  if (!isOlaVehicle(make, model)) return null;

  return (
    <div
      className={cn(
        'absolute bottom-18 right-2 w-44 md:w-56 pointer-events-none opacity-[0.045] [html[data-theme=light]_&]:opacity-[0.07] flex items-end justify-end pr-4 pb-2 text-workshop-text overflow-hidden select-none',
        className
      )}
    >
      <OlaWatermark className="w-full h-auto" />
    </div>
  );
});
