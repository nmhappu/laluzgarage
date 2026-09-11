import React from 'react';
import { ArrowLeft, ArrowRight, Car, Key, Shield, Hash, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { DEFAULT_PLATE_PLACEHOLDER } from '../../lib/constants';
import type { Customer } from '../../types';

const tapSpringTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 25,
};

const POPULAR_MAKES = ['Ola', 'Ather', 'Honda', 'TVS', 'Yamaha', 'Suzuki'];

export interface Step2VehicleSelectionProps {
  key?: React.Key;
  selectedCustomer: Customer | null;
  vehicleForm: {
    make: string;
    model: string;
    color: string;
    plateNumber: string;
    passwordOrPin: string;
  };
  setVehicleForm: React.Dispatch<
    React.SetStateAction<{
      make: string;
      model: string;
      color: string;
      plateNumber: string;
      passwordOrPin: string;
    }>
  >;
  useKey: boolean;
  setUseKey: React.Dispatch<React.SetStateAction<boolean>>;
  onBackStep: () => void;
  onProceedToJob: () => void;
}

export function Step2VehicleSelection({
  selectedCustomer,
  vehicleForm,
  setVehicleForm,
  useKey,
  setUseKey,
  onBackStep,
  onProceedToJob,
}: Step2VehicleSelectionProps) {
  const isFormValid =
    Boolean(vehicleForm.make.trim()) &&
    Boolean(vehicleForm.model.trim()) &&
    Boolean(vehicleForm.plateNumber.trim()) &&
    Boolean(useKey || vehicleForm.passwordOrPin.trim());

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col items-start text-left space-y-6 w-full"
    >
      {/* Header Icon & Title */}
      <div className="space-y-4 text-left">
        <div className="relative text-workshop-accent">
          <div className="absolute -inset-2 bg-workshop-accent/20 blur-2xl rounded-full pointer-events-none" />
          <Car className="relative w-12 h-12 stroke-[1.75]" />
        </div>

        <div className="space-y-1.5 text-left">
          <h1 className="text-2xl sm:text-3xl font-logo font-bold text-workshop-text tracking-tight">
            Vehicle Specification
          </h1>
          <p className="text-workshop-muted text-xs sm:text-sm leading-relaxed">
            Record vehicle specifications and security details for this intake card.
          </p>
        </div>
      </div>

      {/* Customer Summary Table (PendingApproval style) */}
      {selectedCustomer && (
        <div className="w-full divide-y divide-workshop-border/60 border-y border-workshop-border/60 text-left py-1">
          <div className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
            <span className="text-workshop-muted font-medium">Customer</span>
            <span className="text-workshop-text font-semibold truncate max-w-[220px]">
              {selectedCustomer.name}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
            <span className="text-workshop-muted font-medium">Phone</span>
            <span className="text-workshop-text font-numeric text-xs truncate max-w-[220px]">
              {selectedCustomer.phone}
            </span>
          </div>
        </div>
      )}

      {/* Form Fields Grid */}
      <div className="w-full space-y-4">
        {/* Manufacturer / Make */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-workshop-muted pl-0.5">
              Manufacturer / Brand
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {POPULAR_MAKES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setVehicleForm((prev) => ({ ...prev, make: m }))}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-google-sans font-medium rounded-md transition-colors cursor-pointer',
                    vehicleForm.make.toLowerCase() === m.toLowerCase()
                      ? 'bg-workshop-accent/20 text-workshop-accent border border-workshop-accent/40'
                      : 'bg-workshop-surface text-workshop-muted hover:text-workshop-text border border-workshop-border/60'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="relative group">
            <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
            <input
              type="text"
              placeholder="e.g. Ola, Ather, Honda..."
              value={vehicleForm.make}
              onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
              className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-4 text-workshop-text placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm"
            />
          </div>
        </div>

        {/* Model */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-workshop-muted pl-0.5">
            Model Variant
          </label>
          <div className="relative group">
            <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
            <input
              type="text"
              placeholder="e.g. S1 Pro Gen 2, Activa 6G, 450X..."
              value={vehicleForm.model}
              onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
              className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-4 text-workshop-text placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm"
            />
          </div>
        </div>

        {/* Plate Number & U/R Toggle */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-workshop-muted pl-0.5">
            Registration Plate Number
          </label>
          <div className="relative group flex items-center">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
            <input
              type="text"
              disabled={vehicleForm.plateNumber === 'U/R'}
              value={vehicleForm.plateNumber}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  plateNumber: e.target.value.replace(/\s+/g, '').toUpperCase(),
                })
              }
              placeholder={
                vehicleForm.plateNumber === 'U/R' ? 'UNREGISTERED' : DEFAULT_PLATE_PLACEHOLDER
              }
              className={cn(
                'w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-20 text-workshop-text font-plate font-bold tracking-wider placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors text-sm uppercase',
                vehicleForm.plateNumber === 'U/R' && 'text-status-urgent bg-workshop-surface/30'
              )}
            />
            <button
              type="button"
              onClick={() => {
                setVehicleForm((prev) => ({
                  ...prev,
                  plateNumber: prev.plateNumber === 'U/R' ? '' : 'U/R',
                }));
              }}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer border',
                vehicleForm.plateNumber === 'U/R'
                  ? 'bg-status-urgent/15 border-status-urgent/30 text-status-urgent'
                  : 'bg-workshop-surface border-workshop-border text-workshop-muted hover:text-workshop-text'
              )}
            >
              U/R
            </button>
          </div>
        </div>

        {/* Color */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-workshop-muted pl-0.5">
            Exterior Vehicle Colour
          </label>
          <div className="relative group">
            <Palette className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
            <input
              type="text"
              placeholder="e.g. Midnight Black, Pearl White, Coral Red..."
              value={vehicleForm.color}
              onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
              className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-4 text-workshop-text placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm"
            />
          </div>
        </div>

        {/* Security: Screen PIN or Physical Key */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-workshop-muted pl-0.5">
              Unlock Security / Access
            </label>
            <button
              type="button"
              onClick={() => {
                const newMode = !useKey;
                setUseKey(newMode);
                setVehicleForm((prev) => ({
                  ...prev,
                  passwordOrPin: newMode ? 'Key' : '',
                }));
              }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium font-google-sans uppercase tracking-wider transition-colors cursor-pointer border',
                useKey
                  ? 'bg-workshop-accent/15 border-workshop-accent/40 text-workshop-accent'
                  : 'bg-workshop-surface border-workshop-border text-workshop-muted hover:text-workshop-text'
              )}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{useKey ? 'Physical Key Selected' : 'Use Physical Key'}</span>
            </button>
          </div>

          <div className="relative group">
            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
            <input
              disabled={useKey}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={useKey ? 'Physical Key on Hand' : '4-6 digit passcode (e.g. 1234)'}
              value={useKey ? 'Physical Key' : vehicleForm.passwordOrPin}
              onChange={(e) => {
                const val = e.target.value;
                if (!useKey && (val === '' || (/^\d+$/.test(val) && val.length <= 6))) {
                  setVehicleForm({
                    ...vehicleForm,
                    passwordOrPin: val,
                  });
                }
              }}
              className={cn(
                'w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-4 text-workshop-text font-numeric placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm',
                useKey && 'opacity-60 font-medium'
              )}
            />
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="w-full pt-2">
        <motion.button
          type="button"
          disabled={!isFormValid}
          onClick={onProceedToJob}
          whileTap={{ scale: 0.97 }}
          transition={tapSpringTransition}
          className="w-full flex items-center justify-start gap-3 bg-workshop-accent text-workshop-bg hover:bg-workshop-accent/90 px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left accelerate-gpu will-change-transform"
        >
          <ArrowRight className="w-4 h-4 shrink-0" />
          <span>Continue to Job Specification</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
