import React, { memo, useMemo } from 'react';
import { motion } from 'motion/react';
import { Car, Key, History, Phone } from 'lucide-react';
import { WhatsAppIcon, OlaWatermark } from '../ui/BrandIcons';
import type { Vehicle } from '../../types';
import { capitalizeName, cleanPhoneNumber, buildWhatsAppUrl } from '../../lib/utils';

export interface EnrichedVehicle extends Vehicle {
  ownerName?: string;
  ownerPhone?: string;
  totalSpend?: number;
  servicesCount?: number;
  lastServiceDate?: string;
}

interface VehicleCardProps {
  vehicle: EnrichedVehicle;
  onSelect: (v: EnrichedVehicle) => void;
  onEdit: (v: EnrichedVehicle) => void;
  onDelete: (v: EnrichedVehicle) => void;
  canDelete?: boolean;
  canEdit?: boolean;
  onWhatsApp: (info: { name: string; phone: string; url: string }) => void;
}

export const VehicleCard = memo(function VehicleCard({
  vehicle,
  onSelect,
  onEdit,
  onDelete,
  canDelete = false,
  canEdit = true,
  onWhatsApp,
}: VehicleCardProps) {
  const capOwnerName = capitalizeName(vehicle.ownerName);
  const isOla = useMemo(() => {
    const make = (vehicle.make || '').toLowerCase();
    const model = (vehicle.model || '').toLowerCase();
    return make.includes('ola') || model.includes('ola');
  }, [vehicle.make, vehicle.model]);

  return (
    <motion.div
      variants={{
        enter: { opacity: 0, y: 16 },
        center: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 }
      }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="bg-workshop-surface/25 hover:bg-workshop-surface/50 p-5 rounded-xl transition-[background-color,border-color,box-shadow,transform] duration-200 group relative flex flex-col justify-between gap-5 overflow-hidden bg-clip-padding font-sans cursor-pointer border border-transparent hover:border-secondary/30 hover:shadow-lg hover:shadow-secondary/10 active:scale-[0.995] cv-vehicle-card"
      onClick={() => onSelect(vehicle)}
    >
      {isOla && (
        <div className="absolute bottom-18 right-0 w-40 md:w-48 pointer-events-none opacity-[0.045] [html[data-theme=light]_&]:opacity-[0.07] flex items-end justify-end pr-4 pb-2 text-workshop-text overflow-hidden select-none">
          <OlaWatermark className="w-full h-auto" />
        </div>
      )}

      {/* Row 1: Vehicle Identity with Plate opposite */}
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary shrink-0 border-0">
            <Car className="w-6 h-6" />
          </div>
          <h3 className="font-black text-workshop-text text-lg sm:text-2xl uppercase tracking-tight group-hover:text-secondary transition-colors leading-tight font-sans truncate">
            {vehicle.make} {vehicle.model}
          </h3>
        </div>
        {vehicle.plateNumber && (
          <span className="text-base sm:text-lg text-secondary font-plate font-black uppercase tracking-wider shrink-0 text-right">
            {vehicle.plateNumber}
          </span>
        )}
      </div>

      {/* Row 2: Owner Relationship and Security */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs font-sans bg-workshop-surface/10 p-4 rounded-xl border border-workshop-border/10 w-full animate-fade-in">
        {/* Item 1: Owner */}
        <div className="flex flex-col items-start">
          <p className="text-[9px] text-workshop-muted font-bold uppercase tracking-widest leading-none mb-1.5 font-sans">Owner</p>
          <p className="font-black text-workshop-text truncate max-w-[140px] font-sans uppercase">{capOwnerName}</p>
        </div>

        {/* Item 2: Services Done */}
        <div className="flex flex-col items-start">
          <p className="text-[9px] text-workshop-muted font-bold uppercase tracking-widest leading-none mb-1.5 font-sans">Services Done</p>
          <div className="flex items-center gap-1 text-secondary font-sans">
            <History className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider font-sans">
              {vehicle.servicesCount} {vehicle.servicesCount === 1 ? 'Service' : 'Services'}
            </span>
          </div>
        </div>

        {/* Item 3: Security */}
        <div className="flex flex-col items-start justify-center">
          <div className="flex items-center gap-1 text-workshop-text font-extrabold uppercase font-sans mt-3.5">
            {vehicle.passwordOrPin === 'Key' ? (
              <>
                <Key className="w-3.5 h-3.5 text-status-success shrink-0" />
                <span className="text-xs font-sans font-black text-workshop-text uppercase tracking-wider">Key</span>
              </>
            ) : vehicle.passwordOrPin ? (
              <>
                <Key className="w-3.5 h-3.5 text-status-success shrink-0" />
                <span className="text-xs font-numeric font-black tracking-widest text-status-success">#{vehicle.passwordOrPin}</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-workshop-muted/30 shrink-0" />
                <span className="text-xs text-workshop-muted/60 font-sans font-black tracking-wider uppercase leading-none">No Security</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Call Option on bottom-left, Actions on bottom-right */}
      <div className="flex items-center justify-between w-full relative z-20 font-sans">
        {/* Left: Call & WhatsApp option buttons */}
        <div className="flex-1 flex flex-wrap items-center gap-2 text-left">
          {vehicle.ownerPhone ? (
            <>
              <a 
                href={`tel:${vehicle.ownerPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 bg-status-success/15 hover:bg-status-success/25 text-status-success px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm shadow-status-success/10 active:scale-95"
                title={`Call ${capOwnerName}`}
              >
                <Phone className="w-3 h-3 shrink-0" />
                <span>Call</span>
              </a>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (vehicle.ownerPhone) {
                    const cleanPhone = cleanPhoneNumber(vehicle.ownerPhone);
                    onWhatsApp({
                      name: capOwnerName || 'Customer',
                      phone: vehicle.ownerPhone,
                      url: buildWhatsAppUrl(cleanPhone)
                    });
                  }
                }}
                className="inline-flex items-center gap-1.5 bg-whatsapp/15 hover:bg-whatsapp/25 text-whatsapp px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm shadow-whatsapp/10 active:scale-95 border-0 outline-none"
                title={`Send WhatsApp Message to ${capOwnerName}`}
              >
                <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp</span>
              </button>
            </>
          ) : (
            <span className="text-[10px] text-workshop-muted/40 uppercase tracking-widest font-black font-sans">No Phone Number</span>
          )}
        </div>

        {/* Right: yellow edit, red delete */}
        <div className="flex items-center gap-1">
          {canEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(vehicle);
              }}
              className="p-2 text-status-pending hover:brightness-110 active:scale-90 transition-all font-sans cursor-pointer"
              title="Edit Vehicle"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {canDelete && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(vehicle);
              }}
              className="p-2 text-status-urgent hover:brightness-110 active:scale-90 transition-all font-sans cursor-pointer"
              title="Delete Vehicle"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
