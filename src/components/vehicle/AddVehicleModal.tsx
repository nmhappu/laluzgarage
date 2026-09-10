/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, X, Key, PlusCircle, Check } from 'lucide-react';
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

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  newVehicle: Partial<Vehicle> & {
    ownerName?: string;
    ownerPhone?: string;
    createNewOwner?: boolean;
    useKey?: boolean;
  };
  setNewVehicle: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddVehicleModal({
  isOpen,
  onClose,
  customers,
  newVehicle,
  setNewVehicle,
  onSubmit,
}: AddVehicleModalProps) {
  const [useKey, setUseKey] = useState(false);

  if (!isOpen) return null;

  const handleAddFieldToggle = (mode: boolean) => {
    setUseKey(mode);
    setNewVehicle((prev: any) => ({
      ...prev,
      passwordOrPin: mode ? 'Key' : ''
    }));
  };

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
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-workshop-accent" />
          </button>

          <div className="flex-1 pl-2">
            <h2 className="text-lg sm:text-2xl font-black text-workshop-accent tracking-tight uppercase leading-none font-sans">
              Register Vehicle File
            </h2>
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
          <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-2xl mx-auto w-full">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Manufacturer</label>
                <input 
                  required
                  type="text" 
                  value={newVehicle.make || ''}
                  onChange={e => setNewVehicle({...newVehicle, make: e.target.value})}
                  className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text font-bold"
                  placeholder="e.g. Ford, Toyota"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1">Model <span className="text-status-urgent">*</span></label>
                <input 
                  required
                  type="text" 
                  value={newVehicle.model || ''}
                  onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
                  className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text font-bold"
                  placeholder="e.g. Mustang, Prius"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Plate Registration</label>
                <div className="relative">
                  <input 
                    disabled={newVehicle.plateNumber === "U/R"}
                    required
                    type="text" 
                    value={newVehicle.plateNumber || ''}
                    onChange={e => setNewVehicle({...newVehicle, plateNumber: e.target.value.toUpperCase()})}
                    className={cn(
                      "w-full bg-workshop-surface border border-workshop-border pl-4 pr-16 py-2.5 rounded-xl text-sm font-mono font-black focus:ring-1 focus:ring-workshop-accent outline-none tracking-widest uppercase transition-all",
                      newVehicle.plateNumber === "U/R" ? "text-status-urgent bg-workshop-surface/40" : "text-workshop-accent"
                    )}
                    placeholder={newVehicle.plateNumber === "U/R" ? "UNREGISTERED" : "MH12AB1234"}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewVehicle((prev: any) => ({
                        ...prev,
                        plateNumber: prev.plateNumber === "U/R" ? "" : "U/R"
                      }));
                    }}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-bold tracking-widest uppercase transition-all cursor-pointer border",
                      newVehicle.plateNumber === "U/R"
                        ? "bg-status-urgent text-white border-status-urgent shadow-lg"
                        : "bg-workshop-surface border-workshop-border/30 text-workshop-muted hover:text-workshop-text"
                    )}
                    title="Toggle Unregistered (U/R) Status"
                  >
                    U/R
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Colour</label>
                <input 
                  type="text" 
                  value={newVehicle.color || ''}
                  onChange={e => setNewVehicle({...newVehicle, color: e.target.value})}
                  className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text font-bold"
                  placeholder="e.g. Midnight Black"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1.5">
                Security Password or Access PIN
                <span className="text-status-urgent">*</span>
              </label>
              <div className="relative">
                <input 
                  disabled={useKey}
                  type="text" 
                  inputMode="numeric"
                  maxLength={6}
                  value={useKey ? "Key" : newVehicle.passwordOrPin || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (useKey) return;
                    if (val === "" || (/^\d+$/.test(val) && val.length <= 6)) {
                      setNewVehicle({ ...newVehicle, passwordOrPin: val });
                    }
                  }}
                  className={cn(
                    "w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm font-mono focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text transition-all",
                    useKey && "opacity-50 font-bold"
                  )}
                  placeholder="Enter 4-6 digit numeric PIN..."
                />
                <button
                  type="button"
                  onClick={() => {
                    const toKey = !useKey;
                    handleAddFieldToggle(toKey);
                  }}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
                    useKey 
                      ? "bg-workshop-accent text-workshop-bg shadow-lg" 
                      : "bg-workshop-surface text-workshop-muted"
                  )}
                  title="Require physical key"
                >
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Registered Owner Selection */}
            <div className="border-t border-workshop-border/30 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-workshop-text">
                  Vehicle Owner Association
                </h3>
                <button 
                  type="button"
                  onClick={() => setNewVehicle((prev: any) => ({ ...prev, createNewOwner: !prev.createNewOwner }))}
                  className={cn(
                    "flex items-center gap-1 text-[10px] uppercase font-black tracking-widest transition-colors",
                    newVehicle.createNewOwner ? "text-workshop-accent" : "text-workshop-muted hover:text-workshop-text"
                  )}
                >
                  {newVehicle.createNewOwner ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Selected Existing
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" /> Plus Register New Client
                    </>
                  )}
                </button>
              </div>

              {!newVehicle.createNewOwner ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Select Client From Directory</label>
                  <select
                    required={!newVehicle.createNewOwner}
                    value={newVehicle.customerId || ''}
                    onChange={e => setNewVehicle({ ...newVehicle, customerId: e.target.value })}
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm outline-none text-workshop-text font-bold focus:ring-1 focus:ring-workshop-accent"
                  >
                    <option value="">-- Choose Client File --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {capitalizeName(c.name)} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 bg-workshop-surface/20 border border-workshop-border/40 p-4 rounded-xl space-y-0">
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Full Name</label>
                    <input 
                      required={newVehicle.createNewOwner}
                      type="text" 
                      value={newVehicle.ownerName || ''}
                      onChange={e => setNewVehicle({...newVehicle, ownerName: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text font-bold"
                      placeholder="e.g. David Miller"
                    />
                  </div>
                  <div className="relative pt-2 py-0.5 col-span-2 md:col-span-1">
                    <div className="flex items-center w-full bg-workshop-surface border-2 border-[#3B82F6] rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#3B82F6]/30 transition-all">
                      {/* Floating notched label */}
                      <span className="absolute left-4 top-0 bg-workshop-card px-2 text-[10px] font-black uppercase tracking-wider text-[#3B82F6] select-none">
                        Phone number
                      </span>
                      
                      {/* Prefix */}
                      <span className="text-workshop-text font-mono font-bold text-sm select-none pr-3 shrink-0">
                        +91
                      </span>
                      
                      {/* Separator / Divider Line */}
                      <div className="h-5 w-px bg-workshop-border/40 mr-3 shrink-0" />
                      
                      {/* Actual Input */}
                      <input 
                        required={newVehicle.createNewOwner}
                        type="tel" 
                        inputMode="tel"
                        value={newVehicle.ownerPhone || ''}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.startsWith("+91")) {
                            val = val.substring(3);
                          } else if (val.startsWith("91") && val.length > 10) {
                            val = val.substring(2);
                          }
                          setNewVehicle({...newVehicle, ownerPhone: val});
                        }}
                        className="w-full bg-transparent border-none p-0 outline-none focus:ring-0 text-workshop-text font-mono font-bold text-sm tracking-wide placeholder-workshop-muted/40"
                        placeholder="85471 87345"
                      />
                    </div>
                  </div>
                </div>
              )}
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
              Save Vehicle
            </button>
          </div>
        </form>
      </motion.div>
    </Portal>
  );
}
