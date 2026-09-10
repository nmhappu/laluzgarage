import React, { memo } from "react";
import {
  Phone,
  Key,
  Trash2,
  Edit2,
  ArrowRight,
  Package,
  ScanHeart,
  User,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { format, differenceInDays, isAfter, parseISO, isSameDay, startOfDay } from "date-fns";
import type { ServiceRecord, Vehicle, Customer } from "../../types";
import { formatCurrency, cn } from "../../lib/utils";
import { openCreateContactScreen } from "../../services/contactService";

const capitalizeName = (name?: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export interface ServiceRecordCardProps {
  record: ServiceRecord;
  v?: Vehicle;
  customer?: Customer;
  onClick: (r: ServiceRecord) => void;
  onUpdateDetails: (r: ServiceRecord) => void;
  onDelete: (r: ServiceRecord) => void;
  onWhatsAppClick: (record: ServiceRecord, customer?: Customer, vehicle?: Vehicle) => void;
}

export const ServiceRecordCard = memo(({
  record,
  v,
  customer,
  onClick,
  onUpdateDetails,
  onDelete,
  onWhatsAppClick,
}: ServiceRecordCardProps) => {
  return (
    <motion.div
      onClick={() => onClick(record)}
      className={cn(
        "relative bg-workshop-surface/25 hover:bg-workshop-surface/50 rounded-xl border border-transparent shadow-sm overflow-hidden transition-all group cursor-pointer bg-clip-padding will-change-transform",
        record.status === "completed"
          ? "hover:border-[#3B82F6]/30 hover:shadow-lg hover:shadow-[#3B82F6]/5"
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

      {v?.make?.toUpperCase() === "OLA" && (
        <div className="absolute inset-y-0 left-0 w-1/2 pointer-events-none opacity-[0.03] overflow-hidden grayscale brightness-200">
          <img
            src="https://logos-world.net/wp-content/uploads/2023/11/Ola-Logo.png"
            alt="OLA Background"
            className="h-full w-full object-contain object-left scale-150 -translate-x-1/4"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="relative z-10 pt-5 pb-5 px-4 md:pt-6 md:pb-6 md:px-5 flex flex-col gap-3">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-black text-workshop-muted uppercase tracking-widest">
              {format(new Date(record.date), "MMM")}
            </span>
            <span className="text-xl font-black text-workshop-text tracking-tighter">
              {format(new Date(record.date), "dd")}
            </span>
          </div>
          <div className="flex-1 h-px bg-workshop-border/20" />
          <span
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border",
              record.status === "completed"
                ? "bg-status-success/10 text-status-success border-status-success/20"
                : record.status === "in-progress"
                  ? "bg-status-pending/10 text-status-pending border-status-pending/20"
                  : record.status === "cancelled"
                    ? "bg-workshop-muted/10 text-workshop-muted border-workshop-border/30"
                    : "bg-status-urgent/10 text-status-urgent border-status-urgent/20",
            )}
          >
            {record.status}
          </span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex-1 space-y-3.5">
            <div className="flex flex-col bg-workshop-surface/20 p-3.5 rounded-xl border border-workshop-border/10">
              
              {/* Client Name at the top */}
              <div className="pb-0.5 border-b border-workshop-border/10 text-workshop-text font-black text-base md:text-lg uppercase tracking-tight">
                {capitalizeName(customer?.name) || "Unknown Client"}
              </div>

              {/* Grouped Vehicle Details with even spacing */}
              <div className="pt-0.5 space-y-2">
                {/* ROW 1: Plate and Vehicle Model only */}
                <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-2 text-left font-sans">
                  {/* Plate Number in prominent Blue */}
                  <span 
                    style={{ fontFamily: "'Google Sans', sans-serif", fontSize: "16px" }}
                    className="text-[#3B82F6] font-sans font-black tracking-widest uppercase shrink-0 select-all"
                  >
                    {v?.plateNumber || "NO PLATE"}
                  </span>

                  <span className="text-workshop-muted opacity-45 font-normal select-none">|</span>

                  {/* Make & Model */}
                  <span 
                    style={{ fontFamily: "'Google Sans', sans-serif", fontSize: "16px" }}
                    className="text-workshop-text font-black uppercase tracking-tight"
                  >
                    {v?.make} {v?.model}
                  </span>
                </div>

                {/* ROW 2: Mileage & Password / Key PIN on different lines/section */}
                <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1.5 text-left font-sans text-xs md:text-sm font-bold uppercase tracking-tight text-workshop-muted">
                  {/* Mileage Badge */}
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{ fontFamily: "'Google Sans', sans-serif", fontSize: "16px" }}
                      className={cn(
                        "whitespace-nowrap shrink-0 font-black",
                        record.isDeadVehicle
                          ? "inline-flex items-center justify-center text-white bg-status-urgent px-1.5 py-0.5 rounded text-[10px] tracking-widest leading-none font-sans"
                          : record.isUnknownMileage
                            ? "inline-flex items-center justify-center text-black bg-white px-1.5 py-0.5 rounded text-[10px] tracking-widest leading-none font-sans"
                            : "text-status-pending font-sans",
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
                        <span 
                          style={{ fontFamily: "'Google Sans', sans-serif", fontSize: "16px" }}
                          className="text-status-success font-sans font-black whitespace-nowrap shrink-0"
                        >
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
                            <span 
                              style={{ fontFamily: "'Google Sans', sans-serif", fontSize: "16px" }}
                              className="font-black tracking-[0.1em] font-sans"
                            >
                              KEY
                            </span>
                          </>
                        ) : (
                          <span 
                            style={{ fontFamily: "'Google Sans', sans-serif", fontSize: "16px" }}
                            className="font-sans font-black tracking-wider text-status-success"
                          >
                            # {v.passwordOrPin}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="w-full bg-workshop-surface/30 rounded-xl p-3.5 border border-workshop-border/10">
            <div className="text-workshop-text/90 whitespace-pre-wrap italic leading-relaxed space-y-1.5">
              {record.description.split("\n").map((line, i) => {
                const cleanLine = line.replace(/^\[[x ]\]\s*/, "");
                return cleanLine ? (
                  <div key={i} className="flex items-start gap-2 text-xs md:text-sm font-semibold">
                    <span className="opacity-60 text-workshop-accent shrink-0 mt-0.5">•</span>
                    <span className="flex-1">{cleanLine}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

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

        {record.expectedDeliveryDate &&
          record.status !== "completed" &&
          (() => {
            const dueDate = parseISO(record.expectedDeliveryDate);
            const today = startOfDay(new Date());
            const normalizedDueDate = startOfDay(dueDate);
            const isToday = isSameDay(normalizedDueDate, today);
            const isPast = isAfter(today, normalizedDueDate);
            const diff = Math.abs(
              differenceInDays(normalizedDueDate, today),
            );

            return (
              <div className="flex items-center gap-4 px-1">
                <div className="flex items-center gap-1.5 text-workshop-muted/90">
                  <ScanHeart className="w-3.5 h-3.5 opacity-60 text-workshop-accent" />
                  <span className="text-xs font-black uppercase tracking-widest leading-none">
                    Due: {format(dueDate, "dd MMM")}
                  </span>
                </div>
                <div
                  className={cn(
                    "text-xs font-black uppercase tracking-widest leading-none",
                    isToday
                      ? "text-workshop-warning"
                      : isPast
                        ? "text-status-urgent"
                        : "text-workshop-accent",
                  )}
                >
                  {isToday
                    ? "Due Today"
                    : isPast
                      ? `${diff} Days Overdue`
                      : `${diff} Days Left`}
                </div>
              </div>
            );
          })()}

        {record.technicianName && (
          <div className="flex items-center justify-between gap-4 pt-1 mb-1 px-1">
            <div className="flex items-center gap-1.5 text-workshop-muted/90">
              <User className="w-3.5 h-3.5 opacity-60 text-workshop-accent shrink-0" />
              <span className="text-xs font-black uppercase tracking-widest leading-none">
                Advisor: <span className="text-orange-500 font-black">{record.technicianName}</span>
              </span>
            </div>
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
            {customer?.phone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsAppClick(record, customer, v);
                }}
                className="p-2.5 bg-workshop-surface border border-workshop-border/20 rounded-lg text-[#128C7E] hover:border-[#128C7E]/40 hover:bg-[#128C7E]/5 transition-all active:scale-95 shadow-sm shrink-0 outline-none border-0"
                title={`WhatsApp Options (${customer.phone})`}
              >
                <img src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/whatsapp-light.svg" alt="WhatsApp" className="w-4 h-4 shrink-0" referrerPolicy="no-referrer" />
              </button>
            )}
            {customer?.phone && (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const vehicleInfo = v
                    ? `${v.make ? v.make + " " : ""}${v.model}${v.plateNumber ? ` (${v.plateNumber})` : ""}`
                    : undefined;
                  await openCreateContactScreen({
                    name: customer.name,
                    phone: customer.phone,
                    vehicleInfo,
                  });
                }}
                className="p-2.5 bg-workshop-surface border border-workshop-border/20 rounded-lg text-workshop-muted hover:text-workshop-accent hover:border-workshop-accent/30 transition-all active:scale-95 shadow-sm shrink-0"
                title={`Add ${capitalizeName(customer.name)} to Contacts`}
                id={`add-contact-btn-${record.id}`}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}
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
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ServiceRecordCard.displayName = "ServiceRecordCard";
