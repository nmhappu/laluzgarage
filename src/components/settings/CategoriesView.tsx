import { motion, type Variants } from "motion/react";
import {
  User,
  Sliders,
  Tag,
  BarChart2,
  Info,
  LogOut,
  ChevronRight,
} from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import { WhatsAppIcon } from "../ui/BrandIcons";

export interface CategoriesViewProps {
  accountsRevealed: boolean;
  performanceRevealed: boolean;
  user: FirebaseUser | null;
  onSelectTab: (tab: "accounts" | "general" | "whatsapp_presets" | "tags" | "performance" | "system") => void;
  onLogoutClick: () => void;
  pageVariants?: Variants;
}

export function CategoriesView({
  accountsRevealed,
  performanceRevealed,
  user,
  onSelectTab,
  onLogoutClick,
  pageVariants,
}: CategoriesViewProps) {
  return (
    <motion.div
      key="categories"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      <div className="divide-y divide-workshop-border/30 border-b border-workshop-border/30">
        {/* Accounts Category */}
        {accountsRevealed && (
          <button
            type="button"
            id="settings-category-accounts"
            onClick={() => onSelectTab("accounts")}
            className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group animate-fade-in px-0 cursor-pointer"
          >
            <div className="flex items-center gap-4 min-w-0">
              <User className="w-5 h-5 text-status-success shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-status-success transition-colors">
                  Accounts
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
          </button>
        )}

        {/* General Category */}
        <button
          type="button"
          id="settings-category-general"
          onClick={() => onSelectTab("general")}
          className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group px-0 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <Sliders className="w-5 h-5 text-workshop-secondary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-workshop-secondary transition-colors">
                General
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
        </button>

        {/* WhatsApp Presets Category */}
        <button
          type="button"
          id="settings-category-whatsapp"
          onClick={() => onSelectTab("whatsapp_presets")}
          className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group px-0 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <WhatsAppIcon className="w-5 h-5 text-whatsapp shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-whatsapp transition-colors">
                WhatsApp Presets
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
        </button>

        {/* Tags Category */}
        <button
          type="button"
          id="settings-category-tags"
          onClick={() => onSelectTab("tags")}
          className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group px-0 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <Tag className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-indigo-400 transition-colors">
                Tags
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
        </button>

        {/* Technician Performance Category */}
        {performanceRevealed && (
          <button
            type="button"
            id="settings-category-performance"
            onClick={() => onSelectTab("performance")}
            className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group animate-fade-in px-0 cursor-pointer"
          >
            <div className="flex items-center gap-4 min-w-0">
              <BarChart2 className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-cyan-400 transition-colors">
                  Technician Performance
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
          </button>
        )}

        {/* System Category */}
        <button
          type="button"
          id="settings-category-system"
          onClick={() => onSelectTab("system")}
          className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group px-0 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-amber-400 transition-colors">
                System
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
        </button>

        {/* Log Out */}
        <button
          type="button"
          id="settings-category-logout"
          onClick={onLogoutClick}
          className="w-full py-5 flex items-center justify-between text-left hover:bg-status-urgent/10 transition-colors rounded-none group px-0 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-status-urgent/10 flex items-center justify-center text-status-urgent shrink-0 border border-status-urgent/20">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-status-urgent leading-tight">Log Out</p>
              <p className="text-xs text-workshop-muted mt-0.5 truncate">
                {user?.email ? `Signed in as ${user.email}` : "End active session"}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-status-urgent/50 group-hover:text-status-urgent transition-colors shrink-0 ml-4" />
        </button>
      </div>
    </motion.div>
  );
}
