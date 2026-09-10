import React from 'react';
import { motion } from 'motion/react';
import { Trash2, Car } from 'lucide-react';
import { Portal } from '../Portal';
import type { Vehicle } from '../../types';

interface DeleteVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleToDelete: Vehicle | null;
  onConfirm: () => void;
}

export function DeleteVehicleModal({
  isOpen,
  onClose,
  vehicleToDelete,
  onConfirm,
}: DeleteVehicleModalProps) {
  if (!isOpen || !vehicleToDelete) return null;

  return (
    <Portal>
      <div className="viewport-fill z-[100] flex items-center justify-center p-4 sheet-header-safe sheet-footer-safe font-sans">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          onClick={onClose}
          className="absolute inset-0 bg-workshop-bg/95"
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          style={{ willChange: "transform, opacity" }}
          className="relative bg-workshop-surface w-full max-w-sm rounded-xl p-8 shadow-2xl border border-workshop-border/40 text-center font-sans"
        >
          <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
            <Trash2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-workshop-text mb-2 tracking-tight uppercase font-sans">Delete Vehicle?</h2>
          <p className="text-workshop-muted text-sm mb-5 leading-relaxed font-sans">
            Are you sure you want to delete this vehicle?
          </p>
          
          {/* Visually appealing vehicle profile card */}
          <div className="bg-workshop-surface/40 p-4 rounded-xl mb-6 flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center text-[#3B82F6]">
              <Car className="w-5 h-5" />
            </div>
            <div className="font-sans">
              <h4 className="font-black text-workshop-text text-base uppercase tracking-tight">
                {vehicleToDelete.make} {vehicleToDelete.model}
              </h4>
              {vehicleToDelete.plateNumber && (
                <span className="block mt-1 text-sm text-[#3B82F6] font-black uppercase tracking-widest font-sans">
                  {vehicleToDelete.plateNumber}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <button 
              onClick={onClose}
              className="flex-grow px-4 py-3 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="flex-grow px-4 py-3 bg-status-urgent text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-status-urgent/25 hover:brightness-110 transition-all active:scale-[0.98]"
            >
              Delete
            </button>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
