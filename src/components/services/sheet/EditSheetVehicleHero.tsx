import React, { useState } from "react";
import { Key, Phone, ChevronDown, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ServiceRecord, Vehicle, Customer } from "../../../types";
import { capitalizeName, cn } from "../../../lib/utils";
import { openCreateContactScreen } from "../../../services/contactService";
import { useBackHandler } from "../../../contexts/UIContext";

export interface EditSheetVehicleHeroProps {
  vehicle?: Vehicle;
  customer?: Customer;
  editingRecord: ServiceRecord;
  onWhatsAppClick: (record: ServiceRecord, customer?: Customer, vehicle?: Vehicle) => void;
}

export function EditSheetVehicleHero({
  vehicle,
  customer,
  editingRecord,
  onWhatsAppClick,
}: EditSheetVehicleHeroProps) {
  const [contactMenuOpen, setContactMenuOpen] = useState(false);

  // Close contact menu dropdown before closing parent sheet
  useBackHandler(() => {
    setContactMenuOpen(false);
    return true;
  }, contactMenuOpen, 70);

  const colorFormatted = vehicle?.color
    ? vehicle.color.charAt(0).toUpperCase() + vehicle.color.slice(1)
    : "No color specified";

  return (
    <div className="text-left space-y-1.5 font-sans">
      <div className="flex flex-row items-baseline justify-between w-full gap-4">
        {vehicle?.plateNumber ? (
          <h1 className="text-[31px] sm:text-[55px] md:text-[67px] font-black text-blue-500 tracking-tight uppercase leading-none font-sans truncate">
            {vehicle.plateNumber}
          </h1>
        ) : (
          <h1 className="text-[31px] sm:text-[55px] md:text-[67px] font-black text-blue-500 tracking-tight uppercase leading-none font-sans truncate">
            -
          </h1>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-base sm:text-lg font-bold uppercase tracking-tight text-workshop-text font-sans">
        <span className="text-workshop-text font-black">{capitalizeName(customer?.name)}</span>
        <span className="opacity-40 text-workshop-muted font-normal">|</span>
        <span className="text-workshop-muted font-semibold font-sans">
          {colorFormatted}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-base sm:text-lg font-bold uppercase tracking-tight font-sans">
        <span
          className={cn(
            "font-sans font-extrabold whitespace-nowrap",
            editingRecord.isDeadVehicle
              ? "text-status-urgent italic font-black text-xs uppercase bg-status-urgent/10 border border-status-urgent/20 px-2 py-0.5 rounded"
              : editingRecord.isUnknownMileage
                ? "text-black bg-white border border-white px-2 py-0.5 rounded font-black text-xs uppercase tracking-wider select-none shadow-md shadow-white/5"
                : "text-status-pending"
          )}
        >
          {editingRecord.isDeadVehicle
            ? "Dead"
            : editingRecord.isUnknownMileage
              ? "Locked"
              : `${editingRecord.mileage?.toLocaleString() || 0} KM`}
        </span>

        {vehicle?.passwordOrPin && (
          <>
            <span className="opacity-40 text-workshop-muted font-normal">|</span>
            <span className="inline-flex items-center gap-1 text-status-success font-extrabold font-sans">
              {vehicle.passwordOrPin.toUpperCase() === "KEY" ? (
                <Key className="w-4 h-4 text-status-success shrink-0" />
              ) : (
                <span className="text-status-success font-bold font-sans text-base select-none pr-0.5">#</span>
              )}
              <span className="font-sans text-base sm:text-lg">
                {vehicle.passwordOrPin.toUpperCase() === "KEY"
                  ? "Key"
                  : `PIN: ${vehicle.passwordOrPin}`}
              </span>
            </span>
          </>
        )}
      </div>

      {/* Dial Customer quick action with dropdown */}
      {customer?.phone && (
        <div className="pt-1.5 relative inline-block text-left select-none">
          <div className="flex items-center gap-1">
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1.5 p-1.5 px-3 rounded-lg bg-workshop-surface border border-workshop-border/60 hover:border-workshop-accent/50 text-workshop-accent hover:text-workshop-text hover:bg-workshop-surface/80 transition-all text-xs font-bold uppercase tracking-wider font-sans shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>Call {capitalizeName(customer.name).split(" ")[0]}</span>
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContactMenuOpen(!contactMenuOpen);
              }}
              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-workshop-surface border border-workshop-border/60 hover:border-workshop-accent/50 text-workshop-accent hover:text-workshop-text hover:bg-workshop-surface/80 transition-all shadow-sm cursor-pointer"
              id="contact-actions-dropdown"
            >
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  contactMenuOpen && "rotate-180"
                )}
              />
            </button>
          </div>

          <AnimatePresence>
            {contactMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-[110]"
                  onClick={() => setContactMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-1.5 w-60 rounded-xl bg-workshop-card border border-workshop-border shadow-xl z-[120] overflow-hidden py-1"
                >
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!customer) return;
                      setContactMenuOpen(false);

                      const vehicleInfo = vehicle
                        ? `${vehicle.make ? vehicle.make + " " : ""}${vehicle.model}${vehicle.plateNumber ? ` (${vehicle.plateNumber})` : ""}`
                        : undefined;

                      await openCreateContactScreen({
                        name: customer.name,
                        phone: customer.phone,
                        vehicleInfo,
                      });
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-workshop-text hover:bg-workshop-surface/80 transition-all cursor-pointer text-left font-sans"
                    id="add-to-contacts-option"
                  >
                    <UserPlus className="w-4 h-4 text-workshop-secondary shrink-0" />
                    <span>Add {capitalizeName(customer.name).split(" ")[0]} to Contacts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContactMenuOpen(false);
                      onWhatsAppClick(editingRecord, customer, vehicle || undefined);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-workshop-text hover:bg-workshop-surface/80 transition-all cursor-pointer text-left font-sans outline-none border-0"
                    id="whatsapp-update-option"
                  >
                    <img
                      src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/whatsapp-light.svg"
                      alt="WhatsApp"
                      className="w-4 h-4 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <span>WhatsApp Options</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
