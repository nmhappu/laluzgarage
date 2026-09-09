import React from 'react';
import { ArrowLeft, Key, ClipboardCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { MaterialCalendar } from '../ui/MaterialCalendar';
import type { Vehicle } from '../../types';

export interface Step3JobSpecificationProps {
  key?: React.Key;
  selectedVehicle: Vehicle | null;
  vehicleForm: {
    make: string;
    model: string;
    color: string;
    plateNumber: string;
    passwordOrPin: string;
  };
  useKey: boolean;
  jobForm: {
    mileage: string;
    description: string;
    personalItems: string;
    expectedDeliveryDate: string;
    serviceDate: string;
    isDeadVehicle: boolean;
    isUnknownMileage: boolean;
  };
  setJobForm: React.Dispatch<
    React.SetStateAction<{
      mileage: string;
      description: string;
      personalItems: string;
      expectedDeliveryDate: string;
      serviceDate: string;
      isDeadVehicle: boolean;
      isUnknownMileage: boolean;
    }>
  >;
  isMileageInvalid: boolean;
  loading: boolean;
  onBackStep: () => void;
  onSubmit: () => void;
}

export function Step3JobSpecification({
  selectedVehicle,
  vehicleForm,
  useKey,
  jobForm,
  setJobForm,
  isMileageInvalid,
  loading,
  onBackStep,
  onSubmit,
}: Step3JobSpecificationProps) {
  const pinOrKey = selectedVehicle
    ? selectedVehicle.passwordOrPin
    : useKey
    ? 'Key'
    : vehicleForm.passwordOrPin;

  const isKey = pinOrKey?.toLowerCase() === 'key';

  return (
    <motion.div
      key="step3"
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
        <ArrowLeft className="w-4 h-4" /> {selectedVehicle ? "Back to Search" : "Vehicle Info"}
      </button>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">
            Job Specification
          </h3>
          <p className="text-workshop-muted text-sm">
            Define the reason for intake and current vehicle status.
          </p>
        </div>
        {pinOrKey && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-workshop-surface border border-workshop-border rounded-xl shadow-sm self-start shrink-0">
            {isKey ? (
              <>
                <Key className="w-3.5 h-3.5 text-workshop-accent animate-pulse" />
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-workshop-text">
                  Key
                </span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-workshop-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-workshop-accent"></span>
                </span>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-workshop-muted">
                  PIN:
                </span>
                <span className="text-[11px] font-mono font-black tracking-wider text-workshop-text">
                  {pinOrKey}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            style={{ fontFamily: "'Google Sans', sans-serif" }}
            className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
          >
            Odometer
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              disabled={jobForm.isDeadVehicle || jobForm.isUnknownMileage}
              value={jobForm.isDeadVehicle || jobForm.isUnknownMileage ? "" : jobForm.mileage}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d+$/.test(val)) {
                  setJobForm({ ...jobForm, mileage: val });
                }
              }}
              className={cn(
                "w-full bg-workshop-surface border border-workshop-border px-4 py-4 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-mono text-lg font-black text-workshop-text transition-all",
                (jobForm.isDeadVehicle || jobForm.isUnknownMileage) && "opacity-40 grayscale"
              )}
              placeholder={
                jobForm.isDeadVehicle
                  ? "DEAD VEHICLE"
                  : jobForm.isUnknownMileage
                  ? "VEHICLE LOCKED"
                  : "000000"
              }
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <span className="text-[10px] font-black text-workshop-muted uppercase tracking-widest opacity-50">
                KM / Miles
              </span>
            </div>
          </div>

          {/* Input "0" validation feedback */}
          {!jobForm.isDeadVehicle && !jobForm.isUnknownMileage && jobForm.mileage === "0" && (
            <p className="text-status-urgent text-[10px] font-bold mt-1 uppercase tracking-wider">
              Odometer reading cannot be 0 (input a valid positive mileage or select 'Unknown' / 'Dead')
            </p>
          )}

          {/* Status Chips Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() =>
                setJobForm({
                  ...jobForm,
                  isDeadVehicle: !jobForm.isDeadVehicle,
                  isUnknownMileage: false,
                  mileage: "",
                })
              }
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer",
                jobForm.isDeadVehicle
                  ? "bg-status-urgent border-status-urgent/40 text-white shadow-lg shadow-status-urgent/20"
                  : "bg-workshop-bg border-workshop-border text-workshop-muted hover:border-status-urgent/50 hover:text-status-urgent"
              )}
            >
              Vehicle Dead
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  jobForm.isDeadVehicle ? "bg-white animate-pulse" : "bg-workshop-muted opacity-30"
                )}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                setJobForm({
                  ...jobForm,
                  isUnknownMileage: !jobForm.isUnknownMileage,
                  isDeadVehicle: false,
                  mileage: "",
                })
              }
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer",
                jobForm.isUnknownMileage
                  ? "bg-white border-white text-black shadow-lg shadow-white/15"
                  : "bg-workshop-bg border-workshop-border text-workshop-muted hover:border-white/50 hover:text-white"
              )}
            >
              Vehicle Locked
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  jobForm.isUnknownMileage ? "bg-black" : "bg-workshop-muted opacity-30"
                )}
              />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            style={{ fontFamily: "'Google Sans', sans-serif" }}
            className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
          >
            Complaints / Works
          </label>
          <textarea
            value={jobForm.description}
            onChange={(e) =>
              setJobForm({ ...jobForm, description: e.target.value })
            }
            className="w-full bg-workshop-surface border border-workshop-border px-4 py-4 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 h-40 resize-none font-bold text-workshop-text"
            placeholder="e.g. Engine noise during cold start, brake pads check, full service..."
          />
        </div>

        <div className="space-y-1.5">
          <label
            style={{ fontFamily: "'Google Sans', sans-serif" }}
            className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
          >
            Items inside vehicle
          </label>
          <textarea
            value={jobForm.personalItems}
            onChange={(e) =>
              setJobForm({ ...jobForm, personalItems: e.target.value })
            }
            className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-bold text-workshop-text min-h-[80px] resize-none"
            placeholder="e.g. Laptop, Cash, Sunglasses, Spare Tyre..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label
              style={{ fontFamily: "'Google Sans', sans-serif" }}
              className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5"
            >
              Service Date
              <span className="text-status-urgent">*</span>
            </label>
            <MaterialCalendar
              value={jobForm.serviceDate}
              onChange={(val) =>
                setJobForm({ ...jobForm, serviceDate: val })
              }
              max={new Date().toISOString().split("T")[0]}
              className={cn(
                "py-4",
                jobForm.serviceDate === new Date().toISOString().split("T")[0]
                  ? "text-workshop-accent"
                  : "text-workshop-text"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label
              style={{ fontFamily: "'Google Sans', sans-serif" }}
              className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5"
            >
              Estimated Delivery Date
              <span className="text-status-urgent">*</span>
            </label>
            <MaterialCalendar
              value={jobForm.expectedDeliveryDate}
              onChange={(val) =>
                setJobForm({
                  ...jobForm,
                  expectedDeliveryDate: val,
                })
              }
              min={new Date().toISOString().split("T")[0]}
              className="py-4 text-workshop-text"
            />
          </div>
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={
          loading ||
          !jobForm.description ||
          !jobForm.serviceDate ||
          !jobForm.expectedDeliveryDate ||
          isMileageInvalid
        }
        className="w-full py-5 bg-workshop-accent text-workshop-bg rounded-xl font-black text-xs uppercase tracking-[0.3em] hover:brightness-110 transition-all shadow-xl shadow-workshop-accent/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 disabled:grayscale cursor-pointer"
      >
        {loading ? (
          "Processing..."
        ) : (
          <>
            <ClipboardCheck className="w-5 h-5" />
            Issue Job Card
          </>
        )}
      </button>
    </motion.div>
  );
}
