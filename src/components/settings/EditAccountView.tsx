import React, { useState } from "react";
import { motion, type Variants } from "motion/react";
import { User, Mail, Key, Tag, Check, Trash2, Loader2, Eye, EyeOff, Shield, Wrench } from "lucide-react";
import type { WorkshopUser, UserRole } from "../../types";
import { cn } from "../../lib/utils";

export interface EditAccountViewProps {
  isCreating: boolean;
  selectedUser: WorkshopUser | null;
  isCurrentUser: boolean;
  formName: string;
  setFormName: (val: string) => void;
  formEmail: string;
  setFormEmail: (val: string) => void;
  formRole: UserRole | "";
  setFormRole: (val: UserRole | "") => void;
  formPin: string;
  setFormPin: (val: string) => void;
  formTags: string[];
  setFormTags: (val: string[]) => void;
  availableTags: string[];
  savingId: string | null;
  deletingId: string | null;
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string, name: string) => void;
  onCancel: () => void;
  pageVariants?: Variants;
}

export function EditAccountView({
  isCreating,
  selectedUser,
  isCurrentUser,
  formName,
  setFormName,
  formEmail,
  setFormEmail,
  formRole,
  setFormRole,
  formPin,
  setFormPin,
  formTags,
  setFormTags,
  availableTags,
  savingId,
  deletingId,
  onSave,
  onDelete,
  onCancel,
  pageVariants,
}: EditAccountViewProps) {
  const [showPin, setShowPin] = useState(false);

  return (
    <motion.div
      key="edit_account"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-xl mx-auto"
    >
      <form onSubmit={onSave} className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-sm font-bold tracking-wider text-workshop-muted">
            {isCreating ? "Create Team Account" : "Edit Team Account"}
          </h3>
        </div>

        <div className="space-y-4 pt-2">
          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider flex items-center justify-between">
              <span>Operational Role</span>
              {!formRole && (
                <span className="text-[11px] text-status-pending font-normal lowercase">
                  * Unassigned (Pending)
                </span>
              )}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Admin */}
              <button
                type="button"
                onClick={() => setFormRole("admin")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between",
                  formRole === "admin"
                    ? "bg-status-urgent/10 border-status-urgent/60 shadow-sm"
                    : "bg-workshop-surface border-workshop-border/60 hover:border-workshop-border"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                      formRole === "admin" ? "text-status-urgent" : "text-workshop-text"
                    )}>
                      <Shield className="w-3.5 h-3.5" />
                      Admin
                    </span>
                    {formRole === "admin" && (
                      <Check className="w-4 h-4 text-status-urgent" />
                    )}
                  </div>
                  <p className="text-[11px] text-workshop-muted leading-tight">
                    Full CRUD access, deletion rights & user role management.
                  </p>
                </div>
              </button>

              {/* Technician */}
              <button
                type="button"
                onClick={() => setFormRole("technician")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between",
                  formRole === "technician"
                    ? "bg-status-success/10 border-status-success/60 shadow-sm"
                    : "bg-workshop-surface border-workshop-border/60 hover:border-workshop-border"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                      formRole === "technician" ? "text-status-success" : "text-workshop-text"
                    )}>
                      <Wrench className="w-3.5 h-3.5" />
                      Technician
                    </span>
                    {formRole === "technician" && (
                      <Check className="w-4 h-4 text-status-success" />
                    )}
                  </div>
                  <p className="text-[11px] text-workshop-muted leading-tight">
                    Full operations & parts intake. Cannot delete records or parts.
                  </p>
                </div>
              </button>

              {/* Assistant */}
              <button
                type="button"
                onClick={() => setFormRole("assistant")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between",
                  formRole === "assistant"
                    ? "bg-sky-500/10 border-sky-500/60 shadow-sm"
                    : "bg-workshop-surface border-workshop-border/60 hover:border-workshop-border"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                      formRole === "assistant" ? "text-sky-400" : "text-workshop-text"
                    )}>
                      <Eye className="w-3.5 h-3.5" />
                      Assistant
                    </span>
                    {formRole === "assistant" && (
                      <Check className="w-4 h-4 text-sky-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-workshop-muted leading-tight">
                    Service Intake Wizard access. Read-only dashboard & records.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Name field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-workshop-muted">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-workshop-surface border border-workshop-border/60 pl-10 pr-4 py-2.5 rounded-lg text-sm font-semibold text-workshop-text focus:border-status-success focus:ring-1 focus:ring-status-success/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-workshop-muted">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="member@laluzgarage.com"
                className="w-full bg-workshop-surface border border-workshop-border/60 pl-10 pr-4 py-2.5 rounded-lg text-sm font-semibold text-workshop-text focus:border-status-success focus:ring-1 focus:ring-status-success/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Pin Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">
              Intake Security PIN (4 Digits)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-workshop-muted">
                <Key className="w-4 h-4" />
              </span>
              <input
                type={showPin ? "text" : "password"}
                pattern="\d*"
                maxLength={4}
                value={formPin}
                onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").substring(0, 4))}
                placeholder="4-Digit Security PIN"
                className="w-full bg-workshop-surface border border-workshop-border/60 pl-10 pr-11 py-2.5 rounded-lg text-sm font-numeric tracking-widest font-bold text-workshop-text focus:border-status-success focus:ring-1 focus:ring-status-success/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 text-workshop-muted hover:text-workshop-text p-1 cursor-pointer transition-colors"
                title={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Optional Skills / Department Tags */}
          {availableTags.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">
                Skill & Department Tags
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {availableTags
                  .filter((tag) => !["admin", "tech", "technician", "assistant"].includes(tag))
                  .map((tag) => {
                    const isSelected = formTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormTags(formTags.filter((t) => t !== tag));
                          } else {
                            setFormTags([...formTags, tag]);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer",
                          isSelected
                            ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400 font-bold"
                            : "bg-workshop-surface border-workshop-border/40 text-workshop-muted hover:text-workshop-text"
                        )}
                      >
                        <Tag className="w-3.5 h-3.5 shrink-0" />
                        <span className="uppercase tracking-wider font-google-sans font-bold text-[11px]">{tag}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-400" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="pt-5 flex items-center justify-between border-t border-workshop-border/20">
          {selectedUser ? (
            isCurrentUser ? (
              <span
                className="text-xs font-bold uppercase tracking-wider text-workshop-muted flex items-center gap-1.5 py-2 cursor-not-allowed select-none opacity-50"
                title="You cannot delete your own logged-in profile."
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete Account (Self)</span>
              </span>
            ) : (
              <button
                type="button"
                disabled={deletingId === selectedUser.id}
                onClick={() => onDelete(selectedUser.id, selectedUser.name || selectedUser.email)}
                className="text-xs font-bold uppercase tracking-wider text-status-urgent hover:brightness-110 flex items-center gap-1.5 py-2 transition-all cursor-pointer"
              >
                {deletingId === selectedUser.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Account</span>
              </button>
            )
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-workshop-muted hover:text-workshop-text transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingId !== null}
              className="px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-status-success text-workshop-bg hover:brightness-110 shadow-lg shadow-status-success/15 flex items-center gap-2 transition-all active:scale-95"
            >
              {savingId !== null ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isCreating ? "Create Account" : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
export default EditAccountView;
