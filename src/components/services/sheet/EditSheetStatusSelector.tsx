import React from "react";
import { Clock, Activity, CheckCircle } from "lucide-react";
import type { ServiceRecord } from "../../../types";
import { cn } from "../../../lib/utils";

export interface EditSheetStatusSelectorProps {
  status: ServiceRecord["status"];
  completionMileage?: number;
  onChangeStatus: (status: ServiceRecord["status"]) => void;
  onChangeCompletionMileage: (mileage: number) => void;
}

export function EditSheetStatusSelector({
  status,
  completionMileage,
  onChangeStatus,
  onChangeCompletionMileage,
}: EditSheetStatusSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Segmented Status */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted px-1 block">
          service status
        </label>
        <div className="grid grid-cols-3 p-1 bg-workshop-card border border-workshop-border rounded-xl shadow-inner gap-1">
          {["pending", "in-progress", "completed"].map((statusOption) => {
            const isSelected = status === statusOption;
            const config = {
              pending: {
                label: "Pending",
                bg: "bg-status-urgent text-workshop-bg shadow-sm",
                icon: Clock,
              },
              "in-progress": {
                label: "Working",
                bg: "bg-status-pending text-workshop-bg shadow-sm",
                icon: Activity,
              },
              completed: {
                label: "Done",
                bg: "bg-status-success text-workshop-bg shadow-sm",
                icon: CheckCircle,
              },
            }[statusOption as "pending" | "in-progress" | "completed"];

            return (
              <button
                key={statusOption}
                type="button"
                onClick={() => onChangeStatus(statusOption as ServiceRecord["status"])}
                className={cn(
                  "py-2 px-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all outline-none",
                  isSelected
                    ? `${config.bg} scale-[1.03] z-10 font-black`
                    : "text-workshop-muted hover:text-workshop-text bg-transparent"
                )}
              >
                <config.icon className="w-3.5 h-3.5" />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Completion Odometer */}
      {(status === "completed" || (completionMileage || 0) > 0) && (
        <div className="p-4 bg-workshop-surface border border-workshop-accent/30 rounded-2xl shadow-inner animate-in duration-300 slide-in-from-top-1 fade-in">
          <label className="text-[10px] font-bold uppercase tracking-wider text-workshop-accent block mb-1.5 font-black">
            Completion Odometer Reading (KM)
          </label>
          <div className="relative">
            <input
              required={status === "completed"}
              type="number"
              value={completionMileage || ""}
              onChange={(e) => onChangeCompletionMileage(Number(e.target.value))}
              className="w-full bg-workshop-bg border border-workshop-accent/20 px-4 py-2.5 rounded-xl outline-none text-sm font-black focus:ring-1 focus:ring-workshop-accent text-workshop-text"
              placeholder="Final odometer reading..."
            />
            <div className="absolute right-3 top-3 text-[10px] uppercase font-bold text-workshop-accent/60">
              Odo Finish
            </div>
          </div>
          <p className="text-[10px] text-workshop-muted mt-1 px-1">
            Required to complete job so service metrics compute mileage.
          </p>
        </div>
      )}
    </div>
  );
}
