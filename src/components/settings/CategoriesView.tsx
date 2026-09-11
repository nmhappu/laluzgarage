import { useState } from "react";
import { motion, type Variants } from "motion/react";
import {
  User,
  Sliders,
  Tag,
  BarChart2,
  Info,
  LogOut,
  ChevronRight,
  Shield,
  Wrench,
  Sparkles,
  Calendar,
} from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";
import { getHighQualityAvatarUrl } from "../../lib/avatar";
import { WhatsAppIcon } from "../ui/BrandIcons";
import { getUserRole } from "../../types";

export interface CategoriesViewProps {
  isAdmin: boolean;
  user: FirebaseUser | null;
  onSelectTab: (tab: "accounts" | "general" | "whatsapp_presets" | "tags" | "performance" | "system" | "date_history") => void;
  onLogoutClick: () => void;
  pageVariants?: Variants;
}

export function CategoriesView({
  isAdmin,
  user,
  onSelectTab,
  onLogoutClick,
  pageVariants,
}: CategoriesViewProps) {
  const { profile } = useAuth();
  const [imgError, setImgError] = useState(false);

  const rawPhoto = user?.photoURL || profile?.photoURL;
  const avatarUrl = !imgError ? getHighQualityAvatarUrl(rawPhoto, 384) : null;

  const displayName = profile?.name || user?.displayName || user?.email?.split("@")[0] || "Advisor";
  const displayEmail = user?.email || (profile?.tags?.length ? profile.tags.join(" • ") : "LaluZ Garage");
  const initialLetter = (displayName?.[0] || "A").toUpperCase();

  const userRole = getUserRole(profile);
  const isUserAdmin = userRole === "admin" || isAdmin;

  const roleLabel = isUserAdmin
    ? "Workshop Admin"
    : userRole === "technician"
    ? "Technician"
    : userRole === "assistant"
    ? "Assistant"
    : "Service Advisor";

  const RoleIcon = isUserAdmin
    ? Shield
    : userRole === "technician"
    ? Wrench
    : userRole === "assistant"
    ? User
    : Shield;

  return (
    <motion.div
      key="categories"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full space-y-0 pt-0 pb-8"
    >
      {/* Edge-to-Edge Hero Waveform Banner */}
      <div className="w-full relative overflow-hidden bg-workshop-surface/20 border-b border-workshop-border/20 pt-6 pb-6">
        {/* Sinusoidal Wave Graphic with Dotted Matrix Grid (Edge-to-Edge) */}
        <div className="absolute top-0 right-0 left-0 h-32 sm:h-36 pointer-events-none overflow-hidden opacity-90">
          <svg
            className="w-full h-full"
            viewBox="0 0 500 130"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="matrixDots"
                x="0"
                y="0"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="2"
                  cy="2"
                  r="1.1"
                  fill="currentColor"
                  className="text-indigo-400/25 dark:text-indigo-400/25"
                />
              </pattern>
              <clipPath id="waveClip">
                <path d="M0,75 C70,75 85,20 135,20 C185,20 200,60 250,60 C290,60 310,30 350,30 C390,30 410,75 450,75 C475,75 490,55 500,55 L500,130 L0,130 Z" />
              </clipPath>
            </defs>

            {/* Dotted matrix fill area clipped by curve */}
            <rect
              x="0"
              y="0"
              width="500"
              height="130"
              fill="url(#matrixDots)"
              clipPath="url(#waveClip)"
            />

            {/* Smooth waveform curve stroke */}
            <path
              d="M0,75 C70,75 85,20 135,20 C185,20 200,60 250,60 C290,60 310,30 350,30 C390,30 410,75 450,75 C475,75 490,55 500,55"
              fill="none"
              stroke="currentColor"
              className="text-indigo-500/70 dark:text-indigo-400/80"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Sparkle / Status Accent on top right of the wave */}
          <div className="absolute right-5 sm:right-6 top-8 w-8 h-8 rounded-full bg-workshop-surface/80 border border-workshop-border/60 backdrop-blur-md flex items-center justify-center text-workshop-muted shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
        </div>

        {/* Profile Avatar overlapping wave */}
        <div className="relative z-10 pt-4 px-5 sm:px-6">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full ring-4 ring-workshop-bg shadow-2xl overflow-hidden bg-workshop-surface flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-workshop-accent/30 to-workshop-surface flex items-center justify-center text-2xl sm:text-3xl font-bold font-logo text-workshop-text">
                {initialLetter}
              </div>
            )}
          </div>

          {/* User Display Info */}
          <div className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-workshop-text font-sans">
              {displayName}
            </h1>
            <div className="flex items-center justify-between gap-3 mt-1.5">
              <p className="text-xs text-workshop-muted font-medium truncate min-w-0">
                {displayEmail}
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-workshop-surface border border-workshop-border/80 text-xs font-bold text-workshop-muted shadow-sm shrink-0">
                <RoleIcon className="w-3.5 h-3.5 text-workshop-accent" />
                <span>{roleLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edge-to-Edge Settings Category Menu List */}
      <div className="divide-y divide-workshop-border/20 border-b border-workshop-border/20">
        {/* Accounts (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            id="settings-category-accounts"
            onClick={() => onSelectTab("accounts")}
            className="w-full py-4.5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors group px-5 sm:px-6 cursor-pointer"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-workshop-muted group-hover:text-status-success transition-colors shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-workshop-text group-hover:text-status-success transition-colors">
                  Team Management
                </p>
                <p className="text-xs text-workshop-muted mt-0.5 truncate">
                  Advisors, technicians & role permissions
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
          </button>
        )}

        {/* Performance (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            id="settings-category-performance"
            onClick={() => onSelectTab("performance")}
            className="w-full py-4.5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors group px-5 sm:px-6 cursor-pointer"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-workshop-muted group-hover:text-cyan-400 transition-colors shrink-0">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-workshop-text group-hover:text-cyan-400 transition-colors">
                  Performance
                </p>
                <p className="text-xs text-workshop-muted mt-0.5 truncate">
                  Service revenue, logs & advisor metrics
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
          </button>
        )}

        {/* Date-wise Service History (Preview) */}
        <button
          type="button"
          id="settings-category-date-history"
          onClick={() => onSelectTab("date_history")}
          className="w-full py-4.5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors group px-5 sm:px-6 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-workshop-muted group-hover:text-workshop-accent transition-colors shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-workshop-text group-hover:text-workshop-accent transition-colors">
                  Date-wise Service History
                </p>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-workshop-accent/10 text-workshop-accent border border-workshop-accent/20">
                  Preview
                </span>
              </div>
              <p className="text-xs text-workshop-muted mt-0.5 truncate">
                Timeline view of service history records grouped by date
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
        </button>

        {/* WhatsApp */}
        <button
          type="button"
          id="settings-category-whatsapp"
          onClick={() => onSelectTab("whatsapp_presets")}
          className="w-full py-4.5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors group px-5 sm:px-6 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-workshop-muted group-hover:text-whatsapp transition-colors shrink-0">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-workshop-text group-hover:text-whatsapp transition-colors">
                WhatsApp
              </p>
              <p className="text-xs text-workshop-muted mt-0.5 truncate">
                Vehicle intake & delivery notification templates
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
        </button>

        {/* Tags*/}
        <button
          type="button"
          id="settings-category-tags"
          onClick={() => onSelectTab("tags")}
          className="w-full py-4.5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors group px-5 sm:px-6 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-workshop-muted group-hover:text-indigo-400 transition-colors shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-workshop-text group-hover:text-indigo-400 transition-colors">
                Tags
              </p>
              <p className="text-xs text-workshop-muted mt-0.5 truncate">
                Skills, technician departments & service labels
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
        </button>

        {/* General Settings */}
        <button
          type="button"
          id="settings-category-general"
          onClick={() => onSelectTab("general")}
          className="w-full py-4.5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors group px-5 sm:px-6 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-workshop-muted group-hover:text-workshop-secondary transition-colors shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-workshop-text group-hover:text-workshop-secondary transition-colors">
                General Settings
              </p>
              <p className="text-xs text-workshop-muted mt-0.5 truncate">
                Workshop identifier, currency & GST configuration
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
        </button>

        {/* System Diagnostics */}
        <button
          type="button"
          id="settings-category-system"
          onClick={() => onSelectTab("system")}
          className="w-full py-4.5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors group px-5 sm:px-6 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-workshop-muted group-hover:text-amber-400 transition-colors shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-workshop-text group-hover:text-amber-400 transition-colors">
                Backend Information
              </p>
              <p className="text-xs text-workshop-muted mt-0.5 truncate">
                Database sync, connection latency & diagnostics
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
        </button>

        {/* Log Out */}
        <button
          type="button"
          id="settings-category-logout"
          onClick={onLogoutClick}
          className="w-full py-4.5 flex items-center justify-between text-left hover:bg-status-urgent/10 transition-colors group px-5 sm:px-6 cursor-pointer"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-status-urgent/80 group-hover:text-status-urgent transition-colors shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-status-urgent leading-tight">
                Log Out
              </p>
              <p className="text-xs text-workshop-muted mt-0.5 truncate">
                End active session on this device
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-status-urgent/50 group-hover:text-status-urgent transition-colors shrink-0 ml-4" />
        </button>
      </div>
    </motion.div>
  );
}
