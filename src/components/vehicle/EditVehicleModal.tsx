import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Portal } from '../Portal';
import type { Customer, Vehicle } from '../../types';

const capitalizeName = (name?: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingVehicle: Vehicle | null;
  setEditingVehicle: React.Dispatch<React.SetStateAction<Vehicle | null>>;
  customers: Customer[];
  onSubmit: (e: React.FormEvent) => void;
}

export function EditVehicleModal({
  isOpen,
  onClose,
  editingVehicle,
  setEditingVehicle,
  customers,
  onSubmit,
}: EditVehicleModalProps) {
  if (!isOpen || !editingVehicle) return null;

  return (
    <Portal>
      <motion.div
        initial={{ x: "100%", opacity: 0.95 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="viewport-fill z-[100] bg-workshop-bg flex flex-col w-full overflow-hidden font-sans text-workshop-text"
      >
        {/* Header Bar */}
        <div className="flex justify-between items-center pl-2 pr-6 sheet-header-safe pb-4 bg-workshop-bg border-b border-workshop-border/30 shrink-0 select-none">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center p-2 rounded-2xl text-workshop-muted hover:text-workshop-text transition-all duration-200 outline-none active:scale-95 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-[#3B82F6]" />
          </button>

          <div className="flex-1 pl-2">
            <h2 className="text-lg sm:text-2xl font-black text-[#3B82F6] tracking-tight uppercase leading-none font-sans">
              Edit Vehicle Details
            </h2>
            <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest mt-1">
              {editingVehicle.make} {editingVehicle.model} ({editingVehicle.plateNumber || 'U/R'})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-workshop-muted hover:text-workshop-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl mx-auto w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">Manufacturer</label>
                <input 
                  required
                  type="text" 
                  value={editingVehicle.make}
                  onChange={e => setEditingVehicle({...editingVehicle, make: e.target.value})}
                  className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none text-workshop-text font-bold transition-all shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">Model</label>
                <input 
                  required
                  type="text" 
                  value={editingVehicle.model}
                  onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})}
                  className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none text-workshop-text font-bold transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">Plate Registration</label>
                <div className="relative">
                  <input 
                    disabled={editingVehicle.plateNumber === "U/R"}
                    required
                    type="text" 
                    value={editingVehicle.plateNumber}
                    onChange={e => setEditingVehicle({...editingVehicle, plateNumber: e.target.value.toUpperCase()})}
                    className={cn(
                      "w-full bg-workshop-surface border border-workshop-border pl-4 pr-16 py-3 rounded-xl text-sm font-mono font-black focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none uppercase tracking-widest transition-all shadow-sm",
                      editingVehicle.plateNumber === "U/R" ? "text-status-urgent bg-workshop-surface/40" : "text-[#3B82F6]"
                    )}
                    placeholder={editingVehicle.plateNumber === "U/R" ? "UNREGISTERED" : "MH12AB1234"}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVehicle(prev => prev ? {
                        ...prev,
                        plateNumber: prev.plateNumber === "U/R" ? "" : "U/R"
                      } : null);
                    }}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-bold tracking-widest uppercase transition-all cursor-pointer border",
                      editingVehicle.plateNumber === "U/R"
                        ? "bg-status-urgent text-white border-status-urgent shadow-lg"
                        : "bg-workshop-surface border-workshop-border/30 text-[#94A3B8] hover:text-status-urgent"
                    )}
                    title="Toggle Unregistered (U/R) Status"
                  >
                    U/R
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">Colour</label>
                <input 
                  type="text" 
                  value={editingVehicle.color || ''}
                  onChange={e => setEditingVehicle({...editingVehicle, color: e.target.value})}
                  className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none text-workshop-text font-bold transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1 flex items-center justify-between">
                <span>Access Security Pin / PIN</span>
                <button 
                  type="button" 
                  onClick={() => setEditingVehicle({
                    ...editingVehicle,
                    passwordOrPin: editingVehicle.passwordOrPin === "Key" ? "" : "Key"
                  })}
                  className="text-[9px] font-black uppercase text-[#3B82F6] border-b border-[#3B82F6]/20 hover:opacity-85 transition-all"
                >
                  {editingVehicle.passwordOrPin === "Key" ? "Use Code Pin" : "Set Physical Key"}
                </button>
              </label>
              <input 
                type="text" 
                value={editingVehicle.passwordOrPin || ''}
                maxLength={6}
                onChange={e => {
                  const val = e.target.value;
                  if (editingVehicle.passwordOrPin === 'Key') return;
                  setEditingVehicle({...editingVehicle, passwordOrPin: val});
                }}
                disabled={editingVehicle.passwordOrPin === 'Key'}
                className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm font-mono focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none text-workshop-text font-bold transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1 font-bold">Assigned Owner File</label>
              <select
                value={editingVehicle.customerId}
                onChange={e => setEditingVehicle({ ...editingVehicle, customerId: e.target.value })}
                className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm outline-none text-workshop-text font-bold focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-all shadow-sm"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {capitalizeName(c.name)} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom Sticky Action Bar */}
          <div className="pt-4 px-6 sheet-footer-safe bg-workshop-bg border-t border-workshop-border/30 flex justify-end gap-3 shrink-0">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3.5 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-8 py-3.5 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-workshop-accent/25 hover:brightness-110 transition-all active:scale-[0.98]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </Portal>
  );
}
