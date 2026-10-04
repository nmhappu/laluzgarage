import React from "react";
import { X, ArrowDown, ArrowUp } from "lucide-react";
import { parseISO, startOfDay, isAfter, isSameDay } from "date-fns";
import NumberFlow from "@number-flow/react";
import { cn } from "../../../lib/utils";
import { RollingText } from "../../ui/RollingText";

export interface EditSheetHeaderProps {
  vehicleTitle: string;
  intakeDate?: string;
  expectedDeliveryDate?: string;
  onClose: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export function EditSheetHeader({
  vehicleTitle,
  intakeDate,
  expectedDeliveryDate,
  onClose,
  onPointerDown,
}: EditSheetHeaderProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={cn(
        "relative overflow-hidden flex items-center justify-between px-5 sm:px-6 py-3.5 bg-workshop-surface border-b border-workshop-border/40 shrink-0 select-none",
        onPointerDown && "cursor-grab active:cursor-grabbing touch-none"
      )}
    >
      {/* Title & Dates */}
      <div className="flex-1 min-w-0 pr-3">
        <h2 className="text-base sm:text-lg font-black font-google-sans text-workshop-accent uppercase tracking-tight leading-tight truncate">
          <RollingText text={vehicleTitle || "Job Card"} />
        </h2>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {/* Service Intake Date */}
          {intakeDate &&
            (() => {
              try {
                const d = new Date(intakeDate);
                const day = d.getDate();
                const month = d.toLocaleDateString("en-US", { month: "short" });
                const year = d.getFullYear();
                return (
                  <div className="text-[11px] font-bold text-status-success font-sans flex items-center gap-1">
                    <ArrowDown className="w-3 h-3 text-status-success shrink-0" />
                    <span className="font-sans font-black tracking-normal uppercase inline-flex items-center gap-1">
                      <NumberFlow value={day} locales="en-IN" />
                      <RollingText text={month} />
                      <NumberFlow value={year} locales="en-IN" format={{ useGrouping: false }} />
                    </span>
                  </div>
                );
              } catch {
                return null;
              }
            })()}

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
                  <div className={cn("text-[11px] font-bold font-sans flex items-center gap-1", textColorClass)}>
                    <ArrowUp className="w-3 h-3 shrink-0 font-bold" />
                    <span className="font-sans font-black tracking-normal uppercase inline-flex items-center gap-1">
                      <NumberFlow value={day} locales="en-IN" />
                      <RollingText text={month} />
                      <NumberFlow value={year} locales="en-IN" format={{ useGrouping: false }} />
                    </span>
                  </div>
                );
              } catch {
                return null;
              }
            })()}
        </div>
      </div>

      {/* M3 Close 'X' Button with circle hover background */}
      <button
        type="button"
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center justify-center w-8 h-8 rounded-full text-workshop-muted hover:text-workshop-text hover:bg-workshop-card transition-all duration-150 outline-none active:scale-95 group cursor-pointer shrink-0"
        title="Close preview (Esc)"
        aria-label="Close"
      >
        <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
      </button>
    </div>
  );
}
