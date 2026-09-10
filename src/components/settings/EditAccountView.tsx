import React from "react";
import { motion, type Variants } from "motion/react";
import { User, Mail, Key, Tag, Check, Trash2, Loader2 } from "lucide-react";
import type { WorkshopUser } from "../../types";
import { cn } from "../../lib/utils";

export interface EditAccountViewProps {
  isCreating: boolean;
  selectedUser: WorkshopUser | null;
  isCurrentUser: boolean;
  formName: string;
  setFormName: (val: string) => void;
  formEmail: string;
  setFormEmail: (val: string) => void;
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
          <h3 className="text-sm font-bold uppercase tracking-wider text-workshop-muted">
            {isCreating ? "Create Advisor Profile" : "Edit Advisor Profile"}
          </h3>
        </div>

        <div className="space-y-4 pt-2">
          {/* Name field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">
              Advisor Name
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
                placeholder="advisor@workshop.com"
                className="w-full bg-workshop-surface border border-workshop-border/60 pl-10 pr-4 py-2.5 rounded-lg text-sm font-semibold text-workshop-text focus:border-status-success focus:ring-1 focus:ring-status-success/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Pin Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">
              Advisor Security PIN (4 Digits)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-workshop-muted">
                <Key className="w-4 h-4" />
              </span>
              <input
                type="text"
                pattern="\d*"
                maxLength={4}
                value={formPin}
                onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").substring(0, 4))}
                placeholder="4-Digit Security PIN"
                className="w-full bg-workshop-surface border border-workshop-border/60 pl-10 pr-4 py-2.5 rounded-lg text-sm font-mono tracking-widest font-bold text-workshop-text focus:border-status-success focus:ring-1 focus:ring-status-success/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Tags Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">
              Advisor Tags
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {availableTags.map((tag) => {
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
                    <span className="uppercase tracking-wider font-mono text-[11px]">{tag}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-5 flex items-center justify-between border-t border-workshop-border/20">
          {selectedUser ? (
            isCurrentUser ? (
              <span
                className="text-xs font-bold uppercase tracking-wider text-workshop-muted flex items-center gap-1.5 py-2 cursor-not-allowed select-none opacity-50"
                title="You cannot delete your own logged-in advisor profile."
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete Advisor (Self)</span>
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
                <span>Delete Advisor</span>
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
              <span>{isCreating ? "Create Advisor" : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
