import React, { memo, useMemo } from "react";
import {
  Phone,
  Key,
  Trash2,
  Edit2,
  ArrowRight,
  Package,
} from "lucide-react";
import { motion } from "motion/react";
import { format, differenceInDays, isAfter, parseISO, isSameDay, startOfDay } from "date-fns";
import type { ServiceRecord, Vehicle, Customer } from "../../types";
import { formatCurrency, capitalizeName, cn } from "../../lib/utils";
import { OlaWatermark } from "../ui/BrandIcons";
import { ServiceStatusBadge } from "../shared/ServiceStatusBadge";

export interface ServiceRecordCardProps {
  record: ServiceRecord;
  v?: Vehicle;
  customer?: Customer;
  onClick: (r: ServiceRecord) => void;
  onUpdateDetails: (r: ServiceRecord) => void;
  onDelete: (r: ServiceRecord) => void;
  canDelete?: boolean;
  canEdit?: boolean;
  onWhatsAppClick?: (record: ServiceRecord, customer?: Customer, vehicle?: Vehicle) => void;
}

export const ServiceRecordCard = memo(({
  record,
  v,
  customer,
  onClick,
  onUpdateDetails,
  onDelete,
  canDelete = false,
  canEdit = true,
  onWhatsAppClick,
}: ServiceRecordCardProps) => {
  const formattedDate = useMemo(() => {
    try {
      const d = new Date(record.date);
      return {
        month: format(d, "MMM"),
        day: format(d, "dd")
      };
    } catch {
      return { month: "---", day: "--" };
    }
  }, [record.date]);

  const descriptionLines = useMemo(() => {
    return (record.description || "")
      .split("\n")
      .map((line) =>
        line
          .replace(/^\[[x ]\]\s*/, "")
          .replace(/^(\d+[\.\)]|[-*•])\s*/, "")
          .trim()
      )
      .filter(Boolean);
  }, [record.description]);

  const dueDateInfo = useMemo(() => {
    if (!record.expectedDeliveryDate || record.status === "completed") return null;
    try {
      const dueDate = parseISO(record.expectedDeliveryDate);
      const today = startOfDay(new Date());
      const normalizedDueDate = startOfDay(dueDate);
      const isToday = isSameDay(normalizedDueDate, today);
      const isPast = isAfter(today, normalizedDueDate);
      const diff = Math.abs(differenceInDays(normalizedDueDate, today));
      return {
        formattedDate: format(dueDate, "dd MMM"),
        isToday,
        isPast,
        diff,
      };
    } catch {
      return null;
    }
  }, [record.expectedDeliveryDate, record.status]);

  const isOla = useMemo(() => {
    const make = (v?.make || "").toLowerCase();
    const model = (v?.model || "").toLowerCase();
    return make.includes("ola") || model.includes("ola");
  }, [v?.make, v?.model]);

  return (
    <motion.div
      onClick={() => onClick(record)}
      className={cn(
        "relative bg-[#0A0C10] hover:bg-[#0C0E12] [html[data-theme=light]_&]:bg-workshop-card [html[data-theme=light]_&]:hover:bg-workshop-surface/60 rounded-xl border border-workshop-border/30 shadow-sm overflow-hidden transition-[background-color,border-color,box-shadow] duration-200 group cursor-pointer bg-clip-padding cv-record-card",
        record.status === "completed"
          ? "hover:border-secondary/30 hover:shadow-lg hover:shadow-secondary/5"
          : record.status === "in-progress"
            ? "hover:border-status-pending/30 hover:shadow-lg hover:shadow-status-pending/5"
            : "hover:border-status-urgent/30 hover:shadow-lg hover:shadow-status-urgent/5",
      )}
    >
      {/* Status Accent (Top Mid Fading) */}
      <div
        className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[2px] pointer-events-none z-20 transition-all duration-300 opacity-40 group-hover:opacity-100",
          record.status === "completed"
            ? "bg-gradient-to-r from-transparent via-status-success to-transparent"
            : record.status === "in-progress"
              ? "bg-gradient-to-r from-transparent via-status-pending to-transparent"
              : record.status === "cancelled"
                ? "bg-gradient-to-r from-transparent via-workshop-muted to-transparent"
                : "bg-gradient-to-r from-transparent via-status-urgent to-transparent",
        )}
      />

      {isOla && (
        <div className="absolute bottom-18 right-2 w-44 md:w-56 pointer-events-none opacity-[0.045] [html[data-theme=light]_&]:opacity-[0.07] flex items-end justify-end pr-4 pb-2 text-workshop-text overflow-hidden select-none">
          <OlaWatermark className="w-full h-auto" />
        </div>
      )}
      <div className="relative z-10 pt-5 pb-5 px-4 md:pt-6 md:pb-6 md:px-5 flex flex-col gap-3">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-black text-workshop-muted uppercase tracking-widest">
              {formattedDate.month}
            </span>
            <span className="text-xl font-black text-workshop-text tracking-tighter">
              {formattedDate.day}
            </span>
          </div>
          <div className="flex-1 h-px bg-workshop-border/20" />
          <ServiceStatusBadge status={record.status} />
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex-1 space-y-2 px-1">
            {/* Client Name at the top */}
            <div className="text-workshop-text font-black text-base md:text-lg uppercase tracking-tight">
              {capitalizeName(customer?.name) || "Unknown Client"}
            </div>

            {/* Grouped Vehicle Details with even spacing */}
            <div className="space-y-2">
              {/* ROW 1: Plate and Vehicle Model only */}
              <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-2 text-left font-sans">
                {/* Plate Number in prominent Blue */}
                <span className="text-secondary font-plate font-black tracking-widest uppercase shrink-0 select-all text-base">
                  {v?.plateNumber || "NO PLATE"}
                </span>

                <span className="text-workshop-muted opacity-45 font-normal select-none">|</span>

                {/* Make & Model */}
                <span className="text-workshop-text font-google-sans font-black uppercase tracking-tight text-base">
                  {v?.make} {v?.model}
                </span>
              </div>

              {/* ROW 2: Mileage & Password / Key PIN on different lines/section */}
              <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1.5 text-left font-sans text-xs md:text-sm font-bold uppercase tracking-tight text-workshop-muted">
                {/* Mileage Badge */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "whitespace-nowrap shrink-0 font-black text-base font-google-sans",
                      record.isDeadVehicle
                        ? "inline-flex items-center justify-center text-white bg-status-urgent px-1.5 py-0.5 rounded text-[10px] tracking-widest leading-none font-sans"
                        : record.isUnknownMileage
                          ? "inline-flex items-center justify-center text-black bg-white px-1.5 py-0.5 rounded text-[10px] tracking-widest leading-none font-sans"
                          : "text-status-pending",
                    )}
                  >
                    {record.isDeadVehicle
                      ? "DEAD"
                      : record.isUnknownMileage
                        ? "LOCKED"
                        : `${record.mileage.toLocaleString()} KM`}
                  </span>
                  {!!record.completionMileage && (
                    <>
                      <ArrowRight className="w-3.5 h-3.5 text-workshop-muted opacity-30 shrink-0" />
                      <span className="text-status-success font-google-sans font-black whitespace-nowrap shrink-0 text-base">
                        {record.completionMileage.toLocaleString()} KM
                      </span>
                    </>
                  )}
                </div>

                {v?.passwordOrPin && (
                  <>
                    <span className="text-workshop-muted opacity-45 font-normal select-none">|</span>
                    <div className="flex items-center gap-1 text-status-success shrink-0">
                      {v.passwordOrPin.toLowerCase() === "key" ? (
                        <>
                          <Key className="w-4 h-4" />
                          <span className="font-google-sans font-black tracking-[0.1em] text-base">
                            KEY
                          </span>
                        </>
                      ) : (
                        <span className="font-numeric font-black tracking-wider text-status-success text-base">
                          # {v.passwordOrPin}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {descriptionLines.length > 0 && (
            <div className="space-y-1.5 px-1">
              <p className="text-[10px] font-black uppercase text-workshop-muted tracking-widest font-sans">
                Problems:
              </p>
              <div className="text-workshop-text/90 whitespace-pre-wrap italic leading-relaxed space-y-1.5 font-sans">
                {descriptionLines.map((cleanLine, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs md:text-sm font-semibold">
                    <span className="opacity-60 text-workshop-accent shrink-0 mt-0.5 select-none">•</span>
                    <span className="flex-1">{cleanLine}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.personalItems && (
            <div className="w-full bg-status-success/5 rounded-xl p-3 border border-status-success/10 flex items-center gap-2.5">
               <Package className="w-4 h-4 text-status-success shrink-0" />
               <div className="flex items-center gap-2 flex-1 min-w-0">
                 <span className="text-[10px] font-black uppercase text-status-success/70 tracking-widest shrink-0">Personal Items:</span>
                 <p className="text-xs md:text-sm text-workshop-text/80 font-bold leading-normal whitespace-pre-line">{record.personalItems}</p>
               </div>
            </div>
          )}

          {record.finalRemarks && (
            <div className="w-full bg-status-pending/15 rounded-xl p-3 border border-status-pending/15">
              <p className="text-status-pending text-xs md:text-sm font-bold tracking-tight whitespace-pre-wrap italic">
                "{record.finalRemarks}"
              </p>
            </div>
          )}
        </div>

        {dueDateInfo && (
          <div className="flex items-center gap-4 px-1">
            <span className="text-xs font-black uppercase tracking-widest leading-none text-workshop-muted/90">
              Due: {dueDateInfo.formattedDate}
            </span>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-widest leading-none",
                dueDateInfo.isToday
                  ? "text-workshop-warning"
                  : dueDateInfo.isPast
                    ? "text-status-urgent"
                    : "text-workshop-accent",
              )}
            >
              {dueDateInfo.isToday
                ? "Due Today"
                : dueDateInfo.isPast
                  ? `${dueDateInfo.diff} Days Overdue`
                  : `${dueDateInfo.diff} Days Left`}
            </div>
          </div>
        )}

        {record.technicianName && (
          <div className="flex items-center justify-between gap-4 pt-1 mb-1 px-1">
            <span className="text-xs font-black uppercase tracking-widest leading-none text-workshop-muted/90">
              Advisor: <span className="text-workshop-accent font-black">{record.technicianName}</span>
            </span>
          </div>
        )}

        <div className="h-px bg-workshop-border/15 w-full" />

        <div className="flex items-center justify-between gap-4 pt-1 px-1">
          <div className="flex flex-col translate-x-1">
            <p className="text-xs font-bold text-workshop-muted uppercase tracking-widest leading-none mb-1.5">
              Job Total
            </p>
            <p className="text-2xl font-black text-workshop-text tracking-tighter leading-none">
              {formatCurrency(record.totalCost)}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
             {customer?.phone && (
              <a
                href={`tel:${customer.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="p-2.5 bg-workshop-surface border border-workshop-border/20 rounded-lg text-status-success hover:border-status-success/40 hover:bg-status-success/5 transition-all active:scale-95 shadow-sm shrink-0"
                title={`Call Client (${customer.phone})`}
              >
                <Phone className="w-4 h-4 fill-status-success/10" />
              </a>
            )}

            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateDetails(record);
                }}
                className="p-2.5 bg-workshop-surface border border-workshop-border/20 rounded-lg text-workshop-muted hover:text-workshop-accent hover:border-workshop-accent/20 transition-all active:scale-95 shadow-sm"
                title="Edit Details"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(record);
                }}
                className="p-2.5 bg-workshop-surface border border-workshop-border/20 rounded-lg text-status-urgent/60 hover:text-status-urgent hover:border-status-urgent/20 transition-all active:scale-95 shadow-sm"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ServiceRecordCard.displayName = "ServiceRecordCard";
