import React from "react";
import { Clock, Activity, CheckCircle2, Gauge } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ServiceRecord } from "../../../types";
import { cn } from "../../../lib/utils";

export interface EditSheetStatusSelectorProps {
  status: ServiceRecord["status"];
  completionMileage?: number;
  onChangeStatus: (status: ServiceRecord["status"]) => void;
  onChangeCompletionMileage: (mileage: number) => void;
}

const STATUS_ITEMS = [
  {
    key: "pending" as const,
    label: "Pending",
    icon: Clock,
    activeClasses: "bg-status-urgent/15 border-status-urgent text-status-urgent shadow-xs",
    badgeClasses: "bg-status-urgent/15 border-status-urgent/30 text-status-urgent",
    description: "Awaiting technician",
  },
  {
    key: "in-progress" as const,
    label: "In Progress",
    icon: Activity,
    activeClasses: "bg-status-pending/15 border-status-pending text-status-pending shadow-xs",
    badgeClasses: "bg-status-pending/15 border-status-pending/30 text-status-pending",
    description: "Work in progress",
  },
  {
    key: "completed" as const,
    label: "Completed",
    icon: CheckCircle2,
    activeClasses: "bg-status-success/15 border-status-success text-status-success shadow-xs",
    badgeClasses: "bg-status-success/15 border-status-success/30 text-status-success",
    description: "Service completed",
  },
];

export function EditSheetStatusSelector({
  status,
  completionMileage,
  onChangeStatus,
  onChangeCompletionMileage,
}: EditSheetStatusSelectorProps) {
  const currentConfig =
    STATUS_ITEMS.find((item) => item.key === status) || STATUS_ITEMS[0];

  const showOdometer = status === "completed" || (completionMileage || 0) > 0;

  return (
    <div className="bg-workshop-card/80 border border-workshop-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 font-sans">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-workshop-surface border border-workshop-border/60 flex items-center justify-center text-workshop-accent shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-workshop-text leading-tight">
            Service Status
          </h3>
        </div>

        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 transition-colors",
            currentConfig.badgeClasses
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
          {currentConfig.label}
        </span>
      </div>

      {/* Segmented Status Selector */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-workshop-surface/40 border border-workshop-border/60 rounded-xl">
        {STATUS_ITEMS.map((item) => {
          const isSelected = status === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChangeStatus(item.key)}
              className={cn(
                "relative py-2.5 px-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 border outline-none cursor-pointer select-none",
                isSelected
                  ? `${item.activeClasses} font-black scale-[1.01]`
                  : "border-transparent text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface/60 active:scale-98"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="tracking-wide uppercase text-[11px] leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Completion Odometer Reveal */}
      <AnimatePresence>
        {showOdometer && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="p-3.5 bg-workshop-surface/70 border border-status-success/30 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-status-success flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  Final Odometer
                </label>
                {status === "completed" && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-status-success/15 border border-status-success/30 text-status-success px-2 py-0.5 rounded-md">
                    Required
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  required={status === "completed"}
                  type="number"
                  min="0"
                  value={completionMileage ? completionMileage : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeCompletionMileage(val === "" ? 0 : Number(val));
                  }}
                  className="w-full bg-workshop-bg border border-workshop-border/80 focus:border-status-success pl-4 pr-14 py-2.5 rounded-xl outline-none text-sm font-black text-workshop-text focus:ring-1 focus:ring-status-success transition-all placeholder:text-workshop-muted/50 no-spinner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="e.g. 45200"
                />
                <span className="absolute right-3 text-[11px] font-black uppercase tracking-wider text-workshop-muted pointer-events-none select-none">
                  KM
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
