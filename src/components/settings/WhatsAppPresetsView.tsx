import { motion, type Variants } from "motion/react";
import { MessageSquare, Check, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatIntakeMessage, formatDeliveryMessage } from "../../services/whatsappPresetService";

export interface WhatsAppPresetsViewProps {
  presetTab: "intake" | "delivery";
  setPresetTab: (tab: "intake" | "delivery") => void;
  intakeTemplate: string;
  setIntakeTemplate: (val: string) => void;
  deliveryTemplate: string;
  setDeliveryTemplate: (val: string) => void;
  handleResetPresets: () => void;
  handleInsertVariable: (tag: string) => void;
  handleSavePresets: () => void;
  savingPresets: boolean;
  onCancel: () => void;
  pageVariants?: Variants;
}

export function WhatsAppPresetsView({
  presetTab,
  setPresetTab,
  intakeTemplate,
  setIntakeTemplate,
  deliveryTemplate,
  setDeliveryTemplate,
  handleResetPresets,
  handleInsertVariable,
  handleSavePresets,
  savingPresets,
  onCancel,
  pageVariants,
}: WhatsAppPresetsViewProps) {
  return (
    <motion.div
      key="whatsapp_presets"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* Tab Switcher */}
      <div className="flex bg-workshop-surface border border-workshop-border/40 p-1 rounded-xl">
        <button
          type="button"
          id="preset-tab-intake"
          onClick={() => setPresetTab("intake")}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
            presetTab === "intake"
              ? "bg-emerald-500 text-workshop-bg shadow"
              : "text-workshop-muted hover:text-workshop-text"
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Intake Message</span>
        </button>
        <button
          type="button"
          id="preset-tab-delivery"
          onClick={() => setPresetTab("delivery")}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
            presetTab === "delivery"
              ? "bg-emerald-500 text-workshop-bg shadow"
              : "text-workshop-muted hover:text-workshop-text"
          )}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Delivery Message</span>
        </button>
      </div>

      {/* Section Guidance & Reset */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-workshop-text uppercase tracking-wider">
              {presetTab === "intake"
                ? "Vehicle Intake Registration Preset"
                : "Service Delivery & Completion Preset"}
            </h3>
            <p className="text-xs text-workshop-muted mt-0.5">
              {presetTab === "intake"
                ? "Sent or opened when registering a vehicle for service intake."
                : "Sent or opened when completing a service job and issuing final bill."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetPresets}
            className="text-xs font-bold text-workshop-muted hover:text-status-urgent transition-colors flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-workshop-surface border border-workshop-border/40 rounded-lg"
            title="Reset current template to system default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
        </div>

        {/* Available Placeholders (Click to insert) */}
        <div className="space-y-2 bg-workshop-surface/60 border border-workshop-border/30 p-3.5 rounded-xl">
          <span className="text-[10px] font-bold text-workshop-muted uppercase tracking-wider block">
            Available Variables (Click to insert into template):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(presetTab === "intake"
              ? [
                  { tag: "{customer_name}", label: "Customer Name" },
                  { tag: "{vehicle_make}", label: "Vehicle Make" },
                  { tag: "{vehicle_model}", label: "Vehicle Model" },
                  { tag: "{vehicle_plate}", label: "Plate Number" },
                  { tag: "{job_description}", label: "Job Details" },
                ]
              : [
                  { tag: "{customer_name}", label: "Customer Name" },
                  { tag: "{vehicle_title}", label: "Vehicle Title" },
                  { tag: "{vehicle_make}", label: "Vehicle Make" },
                  { tag: "{vehicle_model}", label: "Vehicle Model" },
                  { tag: "{vehicle_plate}", label: "Plate Number" },
                  { tag: "{job_description}", label: "Job Details" },
                  { tag: "{parts_list}", label: "Parts Used List" },
                  { tag: "{labor_cost}", label: "Labor Cost" },
                  { tag: "{total_cost}", label: "Total Amount" },
                ]
            ).map(({ tag, label }) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleInsertVariable(tag)}
                className="px-2.5 py-1 bg-workshop-surface hover:bg-emerald-500/10 border border-workshop-border/60 hover:border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 rounded-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                title={`Click to append ${tag}`}
              >
                <span>{tag}</span>
                <span className="text-[9px] text-workshop-muted font-sans font-normal">
                  ({label})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Message Editor Textarea */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider block">
          Message Template Text
        </label>
        <textarea
          rows={8}
          value={presetTab === "intake" ? intakeTemplate : deliveryTemplate}
          onChange={(e) => {
            if (presetTab === "intake") setIntakeTemplate(e.target.value);
            else setDeliveryTemplate(e.target.value);
          }}
          placeholder="Enter WhatsApp template message..."
          className="w-full bg-workshop-surface border border-workshop-border/60 p-4 rounded-xl text-xs font-mono leading-relaxed text-workshop-text focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all resize-none"
        />
      </div>

      {/* Live Message Preview */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-workshop-muted uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live WhatsApp Message Preview</span>
        </span>
        <div className="bg-[#0b141a] border border-[#222d34] p-4 rounded-xl font-sans text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed relative overflow-hidden shadow-inner">
          <div className="text-[10px] font-mono text-[#8696a0] mb-2 uppercase tracking-wider font-bold">
            Sample Live Preview
          </div>
          <div className="bg-[#005c4b] text-[#e9edef] p-3.5 rounded-lg max-w-full font-sans leading-relaxed border border-[#005c4b]/50 shadow">
            {presetTab === "intake"
              ? formatIntakeMessage(intakeTemplate, {
                  customerName: "Rahul Sharma",
                  vehicleMake: "BMW",
                  vehicleModel: "M3 Competition",
                  vehiclePlate: "KA-01-AB-1234",
                  jobDescription:
                    "Full synthetic oil change, brake pad inspection & alignment check",
                })
              : formatDeliveryMessage(deliveryTemplate, {
                  customerName: "Rahul Sharma",
                  vehicleTitle: "BMW M3 Competition",
                  vehicleMake: "BMW",
                  vehicleModel: "M3 Competition",
                  vehiclePlate: "KA-01-AB-1234",
                  partsList:
                    "1. Brembo Front Brake Pads (x2) - ₹8,500.00\n2. Engine Oil 5W40 (x4L) - ₹3,200.00",
                  laborCost: "₹2,500.00",
                  totalCost: "₹14,200.00",
                  jobDescription:
                    "Full synthetic oil change, brake pad inspection & alignment check",
                })}
          </div>
        </div>
      </div>

      {/* Save Actions Bar */}
      <div className="pt-4 flex items-center justify-between border-t border-workshop-border/20">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-workshop-muted hover:text-workshop-text transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={savingPresets}
          onClick={handleSavePresets}
          className="px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-500 text-workshop-bg hover:brightness-110 shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          {savingPresets ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>Save Presets</span>
        </button>
      </div>
    </motion.div>
  );
}
