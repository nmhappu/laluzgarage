import React from "react";
import { Key, Phone } from "lucide-react";
import type { ServiceRecord, Vehicle, Customer } from "../../../types";
import { capitalizeName, cn } from "../../../lib/utils";
import { WhatsAppIcon } from "../../ui/BrandIcons";

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

      {/* Customer Quick Actions */}
      {customer?.phone && (
        <div className="pt-1.5 flex items-center gap-2 select-none">
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex items-center gap-1.5 p-1.5 px-3 rounded-lg bg-workshop-surface border border-workshop-border/60 hover:border-workshop-accent/50 text-workshop-accent hover:text-workshop-text hover:bg-workshop-surface/80 transition-all text-xs font-bold uppercase tracking-wider font-sans shadow-sm"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>Call {capitalizeName(customer.name).split(" ")[0]}</span>
          </a>

          <button
            type="button"
            onClick={() => {
              onWhatsAppClick(editingRecord, customer, vehicle || undefined);
            }}
            className="inline-flex items-center gap-1.5 p-1.5 px-3 rounded-lg bg-whatsapp/15 hover:bg-whatsapp/25 text-whatsapp transition-all text-xs font-bold uppercase tracking-wider font-sans shadow-sm cursor-pointer border-0 outline-none active:scale-95"
            title="WhatsApp Options"
            id="whatsapp-update-option"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
            <span>WhatsApp</span>
          </button>
        </div>
      )}
    </div>
  );
}
