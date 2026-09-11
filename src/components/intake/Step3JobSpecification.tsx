import React from 'react';
import { ArrowLeft, ClipboardCheck, Gauge, Key, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { MaterialCalendar } from '../ui/MaterialCalendar';
import type { Vehicle } from '../../types';

const tapSpringTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 25,
};

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

  const vehicleTitle = selectedVehicle
    ? `${selectedVehicle.make} ${selectedVehicle.model}`
    : `${vehicleForm.make} ${vehicleForm.model}`;

  const vehiclePlate = selectedVehicle
    ? selectedVehicle.plateNumber
    : vehicleForm.plateNumber;

  const isFormValid =
    !loading &&
    Boolean(jobForm.description.trim()) &&
    Boolean(jobForm.serviceDate) &&
    Boolean(jobForm.expectedDeliveryDate) &&
    !isMileageInvalid;

  return (
    <motion.div
      key="step3"
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
          <ClipboardCheck className="relative w-12 h-12 stroke-[1.75]" />
        </div>

        <div className="space-y-1.5 text-left">
          <h1 className="text-2xl sm:text-3xl font-logo font-bold text-workshop-text tracking-tight">
            Job Specification
          </h1>
          <p className="text-workshop-muted text-xs sm:text-sm leading-relaxed">
            Specify customer complaints, odometer reading, and scheduled delivery date.
          </p>
        </div>
      </div>

      {/* Vehicle Summary Table (PendingApproval style) */}
      <div className="w-full divide-y divide-workshop-border/60 border-y border-workshop-border/60 text-left py-1">
        <div className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
          <span className="text-workshop-muted font-medium">Assigned Vehicle</span>
          <span className="text-workshop-text font-semibold truncate max-w-[220px]">
            {vehicleTitle}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
          <span className="text-workshop-muted font-medium">Plate Number</span>
          <span className="font-plate text-xs font-bold text-workshop-accent uppercase truncate max-w-[220px]">
            {vehiclePlate}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
          <span className="text-workshop-muted font-medium">Security Access</span>
          <span className="text-workshop-text font-mono text-xs inline-flex items-center gap-1.5">
            {pinOrKey?.toLowerCase() === 'key' ? (
              <>
                <Key className="w-3 h-3 text-workshop-accent" />
                <span>Physical Key</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-workshop-accent" />
                <span>PIN: {pinOrKey}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="w-full space-y-4">
        {/* Odometer Mileage */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-workshop-muted pl-0.5">
              Current Odometer Reading
            </label>
            {/* Quick Status Chips */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setJobForm({
                    ...jobForm,
                    isDeadVehicle: !jobForm.isDeadVehicle,
                    isUnknownMileage: false,
                    mileage: '',
                  })
                }
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium font-google-sans uppercase tracking-wider transition-colors cursor-pointer border',
                  jobForm.isDeadVehicle
                    ? 'bg-status-urgent/15 border-status-urgent/30 text-status-urgent'
                    : 'bg-workshop-surface border-workshop-border text-workshop-muted hover:text-workshop-text'
                )}
              >
                Dead Vehicle
              </button>

              <button
                type="button"
                onClick={() =>
                  setJobForm({
                    ...jobForm,
                    isUnknownMileage: !jobForm.isUnknownMileage,
                    isDeadVehicle: false,
                    mileage: '',
                  })
                }
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium font-google-sans uppercase tracking-wider transition-colors cursor-pointer border',
                  jobForm.isUnknownMileage
                    ? 'bg-status-pending/15 border-status-pending/30 text-status-pending'
                    : 'bg-workshop-surface border-workshop-border text-workshop-muted hover:text-workshop-text'
                )}
              >
                Vehicle Locked
              </button>
            </div>
          </div>

          <div className="relative group">
            <Gauge className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
            <input
              type="text"
              inputMode="numeric"
              disabled={jobForm.isDeadVehicle || jobForm.isUnknownMileage}
              value={
                jobForm.isDeadVehicle
                  ? 'Vehicle Dead'
                  : jobForm.isUnknownMileage
                  ? 'Odometer Locked'
                  : jobForm.mileage
              }
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setJobForm({ ...jobForm, mileage: val });
              }}
              placeholder="e.g. 14250"
              className={cn(
                'w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-14 text-workshop-text font-numeric placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm',
                (jobForm.isDeadVehicle || jobForm.isUnknownMileage) && 'opacity-60'
              )}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-workshop-muted pointer-events-none">
              KM
            </span>
          </div>

          {/* Validation Warning */}
          {!jobForm.isDeadVehicle && !jobForm.isUnknownMileage && jobForm.mileage === '0' && (
            <p className="text-status-urgent text-xs font-medium pl-0.5">
              Odometer reading cannot be 0. Enter positive mileage or select 'Dead Vehicle' / 'Locked'.
            </p>
          )}
        </div>

        {/* Complaints & Work Required */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-workshop-muted pl-0.5">
            Complaints & Service Tasks
          </label>
          <textarea
            required
            rows={4}
            value={jobForm.description}
            onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
            placeholder="e.g. Front brake pad replacement, periodic servicing, wheel alignment..."
            className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl p-3.5 text-workshop-text placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm leading-relaxed resize-none"
          />
        </div>

        {/* Belongings Left in Vehicle */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-workshop-muted pl-0.5">
            Belongings & Accessories Left in Vehicle
          </label>
          <input
            type="text"
            value={jobForm.personalItems}
            onChange={(e) => setJobForm({ ...jobForm, personalItems: e.target.value })}
            placeholder="e.g. Helmet, Original Documents, Charging cable, Tool kit..."
            className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 px-4 text-workshop-text placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm"
          />
        </div>

        {/* Dates Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-workshop-muted pl-0.5">
              Intake Date
            </label>
            <MaterialCalendar
              value={jobForm.serviceDate}
              onChange={(val) => setJobForm({ ...jobForm, serviceDate: val })}
              max={new Date().toISOString().split('T')[0]}
              className="py-3"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-workshop-muted pl-0.5">
              Estimated Delivery Date
            </label>
            <MaterialCalendar
              value={jobForm.expectedDeliveryDate}
              onChange={(val) => setJobForm({ ...jobForm, expectedDeliveryDate: val })}
              min={new Date().toISOString().split('T')[0]}
              className="py-3"
            />
          </div>
        </div>
      </div>

      {/* Form Error Banner if mileage invalid */}
      {isMileageInvalid && (
        <div className="w-full flex items-center gap-2.5 p-3.5 bg-status-urgent/10 border border-status-urgent/25 text-status-urgent rounded-xl text-xs font-semibold text-left">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Please provide a valid odometer reading or select Dead/Locked vehicle.</span>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="w-full pt-2">
        <motion.button
          type="button"
          disabled={!isFormValid}
          onClick={onSubmit}
          whileTap={{ scale: 0.97 }}
          transition={tapSpringTransition}
          className="w-full flex items-center justify-start gap-3 bg-workshop-accent text-workshop-bg hover:bg-workshop-accent/90 px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left accelerate-gpu will-change-transform"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-workshop-bg border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <ClipboardCheck className="w-4 h-4 shrink-0" />
          )}
          <span>{loading ? 'Creating Service Record...' : 'Issue Job Card'}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
