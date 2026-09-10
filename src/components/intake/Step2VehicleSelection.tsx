import React from 'react';
import { ArrowLeft, Key } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { DEFAULT_PLATE_PLACEHOLDER } from '../../lib/constants';
import type { Customer } from '../../types';

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
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, scale: 0.98, x: 15 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.98, x: -15 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1.0] }}
      className="space-y-6"
    >
      <button
        onClick={onBackStep}
        className="flex items-center gap-2 text-workshop-muted hover:text-workshop-text text-[10px] font-black uppercase tracking-widest cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> {selectedCustomer ? "Back to Search" : "Client Info"}
      </button>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">
          Vehicle Identification
        </h3>
        <p className="text-workshop-muted text-sm">
          Record technical specifications for the service entry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-google-sans font-black uppercase tracking-[0.2em] text-workshop-muted">
            Manufacturer
          </label>
          <input
            value={vehicleForm.make}
            onChange={(e) =>
              setVehicleForm({ ...vehicleForm, make: e.target.value })
            }
            className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
            placeholder="e.g. Ola"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-google-sans font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5">
            Model
            <span className="text-status-urgent">*</span>
          </label>
          <input
            value={vehicleForm.model}
            onChange={(e) =>
              setVehicleForm({ ...vehicleForm, model: e.target.value })
            }
            className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
            placeholder="e.g. S1 +"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-google-sans font-black uppercase tracking-[0.2em] text-workshop-muted">
            Registration Plate
          </label>
          <div className="relative">
            <input
              disabled={vehicleForm.plateNumber === "U/R"}
              value={vehicleForm.plateNumber}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  plateNumber: e.target.value.replace(/\s+/g, "").toUpperCase(),
                })
              }
              className={cn(
                "w-full bg-workshop-surface border border-workshop-border pl-4 pr-16 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-plate font-bold uppercase transition-all",
                vehicleForm.plateNumber === "U/R"
                  ? "text-status-urgent bg-workshop-surface/40"
                  : "text-workshop-accent"
              )}
              placeholder={vehicleForm.plateNumber === "U/R" ? "UNREGISTERED" : DEFAULT_PLATE_PLACEHOLDER}
            />
            <button
              type="button"
              onClick={() => {
                setVehicleForm((prev) => ({
                  ...prev,
                  plateNumber: prev.plateNumber === "U/R" ? "" : "U/R",
                }));
              }}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-black tracking-widest uppercase transition-all cursor-pointer border border-status-urgent",
                vehicleForm.plateNumber === "U/R"
                  ? "bg-status-urgent text-white shadow-lg shadow-status-urgent/30"
                  : "bg-workshop-surface text-status-urgent hover:bg-status-urgent/10"
              )}
              title="Toggle Unregistered (U/R) Status"
            >
              U/R
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-google-sans font-black uppercase tracking-[0.2em] text-workshop-muted">
            Vehicle Colour
          </label>
          <input
            value={vehicleForm.color}
            onChange={(e) =>
              setVehicleForm({ ...vehicleForm, color: e.target.value })
            }
            className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
            placeholder="e.g. Red"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[10px] font-google-sans font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5">
            Security
            <span className="text-status-urgent">*</span>
          </label>
          <div className="relative">
            <input
              disabled={useKey}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={useKey ? "Key" : vehicleForm.passwordOrPin}
              onChange={(e) => {
                const val = e.target.value;
                if (useKey) return;
                if (val === "" || (/^\d+$/.test(val) && val.length <= 6)) {
                  setVehicleForm({
                    ...vehicleForm,
                    passwordOrPin: val,
                  });
                }
              }}
              className={cn(
                "w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-sans text-workshop-text uppercase transition-all",
                useKey && "opacity-50 font-bold"
              )}
              placeholder={useKey ? "" : "••••••"}
            />
            <button
              type="button"
              onClick={() => {
                const newMode = !useKey;
                setUseKey(newMode);
                if (newMode) {
                  setVehicleForm({
                    ...vehicleForm,
                    passwordOrPin: "Key",
                  });
                } else {
                  setVehicleForm({
                    ...vehicleForm,
                    passwordOrPin: "",
                  });
                }
              }}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer",
                useKey
                  ? "bg-workshop-accent text-workshop-bg shadow-lg"
                  : "bg-workshop-surface text-workshop-muted hover:text-workshop-text"
              )}
              title="Toggle between Pin and physical Key"
            >
              <Key className={cn("w-4 h-4", useKey && "animate-pulse")} />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onProceedToJob}
        disabled={
          !vehicleForm.make ||
          !vehicleForm.model ||
          !vehicleForm.plateNumber ||
          !vehicleForm.passwordOrPin
        }
        className="w-full py-4 bg-workshop-accent text-workshop-bg rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale cursor-pointer"
      >
        SET JOB REQUIREMENTS
      </button>
    </motion.div>
  );
}
