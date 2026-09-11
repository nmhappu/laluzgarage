import React from "react";
import { ArrowLeft, ArrowDown, ArrowUp } from "lucide-react";
import { parseISO, startOfDay, isAfter, isSameDay } from "date-fns";
import { cn } from "../../../lib/utils";

export interface EditSheetHeaderProps {
  vehicleTitle: string;
  intakeDate?: string;
  expectedDeliveryDate?: string;
  onClose: () => void;
}

export function EditSheetHeader({
  vehicleTitle,
  intakeDate,
  expectedDeliveryDate,
  onClose,
}: EditSheetHeaderProps) {
  return (
    <div className="relative overflow-hidden flex justify-between items-center pl-2 pr-6 sheet-header-safe pb-4 bg-workshop-bg border-b border-workshop-border/30 shrink-0 select-none">
      {/* Faded Text Silhouette Watermark */}
      <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 pointer-events-none select-none text-[100px] sm:text-[160px] md:text-[196px] font-black text-white/[0.015] tracking-[0.13em] uppercase font-sans whitespace-nowrap z-0">
        RECORD
      </div>

      <button
        type="button"
        onClick={onClose}
        className="relative z-10 flex items-center justify-center p-2 rounded-2xl text-workshop-muted hover:text-workshop-text transition-all duration-200 outline-none active:scale-95 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-workshop-accent" />
      </button>

      <div className="relative z-10 flex-1 pl-1 flex flex-col justify-center">
        <span className="text-base font-black font-google-sans text-workshop-accent uppercase tracking-tight leading-none">
          {vehicleTitle}
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-end gap-1.5 select-none text-right">
        {/* Service Intake Date */}
        <div className="text-xs font-bold text-status-success font-sans flex items-center gap-1">
          <ArrowDown className="w-4 h-4 text-status-success shrink-0" />
          <span className="font-sans font-black tracking-normal uppercase">
            {(() => {
              if (!intakeDate) return "";
              try {
                const d = new Date(intakeDate);
                const day = d.getDate();
                const month = d.toLocaleDateString("en-US", { month: "short" });
                const year = d.getFullYear();
                return `${day} ${month} ${year}`;
              } catch {
                return "";
              }
            })()}
          </span>
        </div>

        {/* Due Date with Up Arrow */}
        {expectedDeliveryDate &&
          (() => {
            try {
              const dueDate = parseISO(expectedDeliveryDate);
              const today = startOfDay(new Date());
              const normalizedDueDate = startOfDay(dueDate);
              const isPast = isAfter(today, normalizedDueDate);
              const isToday = isSameDay(normalizedDueDate, today);
              const isOverdue = isPast && !isToday;
              const textColorClass = isOverdue ? "text-status-urgent" : "text-status-pending";

              const day = dueDate.getDate();
              const month = dueDate.toLocaleDateString("en-US", { month: "short" });
              const year = dueDate.getFullYear();

              return (
                <div className={cn("text-xs font-bold font-sans flex items-center gap-1", textColorClass)}>
                  <ArrowUp className="w-4 h-4 shrink-0 font-bold" />
                  <span className="font-sans font-black tracking-normal uppercase">
                    {`${day} ${month} ${year}`}
                  </span>
                </div>
              );
            } catch {
              return null;
            }
          })()}
      </div>
    </div>
  );
}
