import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  useRoutes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  Navigate,
} from "react-router-dom";
import { auth } from "../../lib/firebase";
import { ArrowLeft, RefreshCw, Plus, Search, Calendar, X } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useBackHandler } from "../../contexts/UIContext";
import { ThemeToggle } from "../ThemeToggle";
import { useWorkshopUsers } from "../../hooks/useWorkshopUsers";
import { useWorkshopTags } from "../../hooks/useWorkshopTags";
import { useWhatsAppPresets } from "../../hooks/useWhatsAppPresets";

import { CategoriesView } from "./CategoriesView";
import { AccountsView } from "./AccountsView";
import { EditAccountView } from "./EditAccountView";
import { GeneralView } from "./GeneralView";
import { SystemView } from "./SystemView";
import { WhatsAppPresetsView } from "./WhatsAppPresetsView";
import { TagsView } from "./TagsView";
import { AppUpdatesView } from "./AppUpdatesView";
import { PerformanceView } from "./PerformanceView";
import { DateWiseHistoryView } from "./DateWiseHistoryView";
import { DeleteUserModal } from "./DeleteUserModal";
import { LogoutModal } from "../nav/LogoutModal";
import { Analytics } from "../Analytics";
import type { WorkshopUser } from "../../types";

const pageVariants: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.2, 0, 0, 1.0] as const } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.16, ease: [0.2, 0, 0, 1.0] as const } },
};

function getSettingsHeaderInfo(pathname: string): { title: string; colorClass: string } {
  if (pathname === "/settings" || pathname === "/settings/") {
    return { title: "Settings", colorClass: "text-workshop-text" };
  }
  if (pathname === "/settings/accounts") {
    return { title: "Accounts", colorClass: "text-status-success" };
  }
  if (pathname === "/settings/accounts/new") {
    return { title: "Create Advisor", colorClass: "text-status-success" };
  }
  if (pathname.startsWith("/settings/accounts/")) {
    return { title: "Edit Advisor", colorClass: "text-status-success" };
  }
  if (pathname === "/settings/general") {
    return { title: "General Settings", colorClass: "text-workshop-secondary" };
  }
  if (pathname === "/settings/whatsapp") {
    return { title: "WhatsApp Presets", colorClass: "text-emerald-500" };
  }
  if (pathname === "/settings/tags") {
    return { title: "Tags", colorClass: "text-indigo-400" };
  }
  if (pathname === "/settings/system") {
    return { title: "System Diagnostics", colorClass: "text-amber-500" };
  }
  if (pathname === "/settings/performance") {
    return { title: "Technician Performance", colorClass: "text-cyan-400" };
  }
  if (pathname === "/settings/history") {
    return { title: "Date-wise Service History", colorClass: "text-workshop-accent" };
  }
  if (pathname === "/settings/statistics") {
    return { title: "Statistics", colorClass: "text-workshop-accent" };
  }
  if (pathname === "/settings/updates") {
    return { title: "App Updates", colorClass: "text-workshop-accent" };
  }
  return { title: "Settings", colorClass: "text-workshop-text" };
}

interface EditAccountRouteProps {
  users: WorkshopUser[];
  loading: boolean;
  availableTags: string[];
  savingId: string | null;
  deletingId: string | null;
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string, name: string) => void;
  formName: string;
  setFormName: (val: string) => void;
  formEmail: string;
  setFormEmail: (val: string) => void;
  formRole: "" | import("../../types").UserRole;
  setFormRole: (val: "" | import("../../types").UserRole) => void;
  formPin: string;
  setFormPin: (val: string) => void;
  formTags: string[];
  setFormTags: (val: string[]) => void;
  handleSelectUser: (u: WorkshopUser) => void;
  handleStartCreate: () => void;
  pageVariants?: Variants;
}

function EditAccountRoute({
  users,
  loading,
  availableTags,
  savingId,
  deletingId,
  onSave,
  onDelete,
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
  handleSelectUser,
  handleStartCreate,
  pageVariants,
}: EditAccountRouteProps) {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const isCreating = !userId || userId === "new";

  const selectedUser = useMemo(() => {
    if (isCreating) return null;
    return users.find((u) => u.id === userId) || null;
  }, [isCreating, users, userId]);

  const isCurrentUser = selectedUser?.id === auth.currentUser?.uid;

  useEffect(() => {
    if (isCreating) {
      handleStartCreate();
    } else if (selectedUser) {
      handleSelectUser(selectedUser);
    }
  }, [isCreating, selectedUser]);

  useEffect(() => {
    if (!isCreating && !loading && users.length > 0 && !selectedUser) {
      navigate("/settings/accounts", { replace: true });
    }
  }, [isCreating, loading, users.length, selectedUser, navigate]);

  return (
    <EditAccountView
      isCreating={isCreating}
      selectedUser={selectedUser}
      isCurrentUser={isCurrentUser}
      formName={formName}
      setFormName={setFormName}
      formEmail={formEmail}
      setFormEmail={setFormEmail}
      formRole={formRole}
      setFormRole={setFormRole}
      formPin={formPin}
      setFormPin={setFormPin}
      formTags={formTags}
      setFormTags={setFormTags}
      availableTags={availableTags}
      savingId={savingId}
      deletingId={deletingId}
      onSave={onSave}
      onDelete={onDelete}
      onCancel={() => navigate("/settings/accounts")}
      pageVariants={pageVariants}
    />
  );
}

export function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, logout } = useAuth();
  const isAdmin = Boolean(profile?.tags?.includes("admin"));

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Date-wise History Search and Filter state (for top nav bar)
  const [dateSearchQuery, setDateSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [showStickySearch, setShowStickySearch] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const stickySearchInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDateFilter = () => {
    if (dateInputRef.current) {
      if ("showPicker" in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch {
          dateInputRef.current.focus();
        }
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  // Reset scroll to top on sub-route change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // Backward compatibility: Redirect legacy ?tab=... to respective subpaths
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const tabMap: Record<string, string> = {
        accounts: "/settings/accounts",
        edit_account: "/settings/accounts",
        general: "/settings/general",
        whatsapp_presets: "/settings/whatsapp",
        tags: "/settings/tags",
        performance: "/settings/performance",
        date_history: "/settings/history",
        system: "/settings/system",
        statistics: "/settings/statistics",
        updates: "/settings/updates",
      };
      const target = tabMap[tabParam];
      if (target) {
        navigate(target, { replace: true });
      }
    }
  }, [searchParams, navigate]);

  // Route protection for Admin-only paths
  useEffect(() => {
    const isAccountsPath = location.pathname.startsWith("/settings/accounts");
    const isPerformancePath = location.pathname === "/settings/performance";
    if ((isAccountsPath || isPerformancePath) && !isAdmin) {
      setError("Admin access required for this section.");
      navigate("/settings", { replace: true });
    }
  }, [location.pathname, isAdmin, navigate]);

  // Domain Hooks
  const {
    users,
    loading,
    savingId,
    deletingId,
    userToDelete,
    setUserToDelete,
    formName,
    setFormName,
    formEmail,
    setFormEmail,
    formPin,
    setFormPin,
    formRole,
    setFormRole,
    formTags,
    setFormTags,
    fetchUsers,
    handleSelectUser,
    handleStartCreate,
    handleSaveUserProfile,
    handleDeleteUser,
    confirmDeleteUser,
  } = useWorkshopUsers(setError, setSuccessMessage);

  const {
    availableTags,
    newTagInput,
    setNewTagInput,
    handleCreateTag,
    handleDeleteTag,
  } = useWorkshopTags(users, setError, setSuccessMessage, fetchUsers);

  const {
    intakeTemplate,
    setIntakeTemplate,
    deliveryTemplate,
    setDeliveryTemplate,
    presetTab,
    setPresetTab,
    savingPresets,
    handleSavePresets,
    handleResetPresets,
    handleInsertVariable,
  } = useWhatsAppPresets(setError, setSuccessMessage);

  const onSaveUser = async (e: React.FormEvent) => {
    const success = await handleSaveUserProfile(e);
    if (success) {
      navigate("/settings/accounts");
    }
  };

  const onDeleteConfirmUser = async () => {
    const success = await confirmDeleteUser();
    if (success) {
      navigate("/settings/accounts");
    }
  };

  // Back handling
  const handleBack = useCallback(() => {
    setError(null);
    const path = location.pathname.replace(/\/$/, "");
    if (path.startsWith("/settings/accounts/")) {
      navigate("/settings/accounts");
    } else if (path !== "/settings") {
      navigate("/settings");
    } else {
      navigate("/");
    }
  }, [location.pathname, navigate]);

  // Back handling: DeleteUserModal
  useBackHandler(() => {
    setUserToDelete(null);
    return true;
  }, Boolean(userToDelete), 80);

  // Back handling: Sticky search bar for Date-wise History
  useBackHandler(() => {
    setShowStickySearch(false);
    setDateSearchQuery("");
    return true;
  }, location.pathname === "/settings/history" && showStickySearch, 70);

  // Back handling: Logout confirmation modal
  useBackHandler(() => {
    setShowLogoutConfirm(false);
    return true;
  }, showLogoutConfirm, 80);

  // Back handling: Child sub-routes
  useBackHandler(() => {
    handleBack();
    return true;
  }, location.pathname.replace(/\/$/, "") !== "/settings", 40);

  // Back handling: Root settings (always navigates back to home/dashboard)
  useBackHandler(() => {
    setError(null);
    navigate("/");
    return true;
  }, location.pathname.replace(/\/$/, "") === "/settings", 30);

  const normalizedPath = location.pathname.replace(/\/$/, "") || "/settings";
  const headerInfo = getSettingsHeaderInfo(normalizedPath);
  const isRootSettings = normalizedPath === "/settings";
  const isAccountsList = normalizedPath === "/settings/accounts";
  const isDateHistory = normalizedPath === "/settings/history";

  const routesElement = useRoutes([
    {
      path: "",
      element: (
        <CategoriesView
          isAdmin={isAdmin}
          user={user}
          onSelectTab={(tab) => {
            const tabMap: Record<string, string> = {
              accounts: "/settings/accounts",
              general: "/settings/general",
              whatsapp_presets: "/settings/whatsapp",
              tags: "/settings/tags",
              performance: "/settings/performance",
              date_history: "/settings/history",
              system: "/settings/system",
              statistics: "/settings/statistics",
              updates: "/settings/updates",
            };
            navigate(tabMap[tab] || `/settings/${tab}`);
          }}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        />
      ),
    },
    {
      path: "accounts",
      element: (
        <AccountsView
          loading={loading}
          users={users}
          onSelectUser={(u) => navigate(`/settings/accounts/${u.id}`)}
        />
      ),
    },
    {
      path: "accounts/new",
      element: (
        <EditAccountRoute
          users={users}
          loading={loading}
          availableTags={availableTags}
          savingId={savingId}
          deletingId={deletingId}
          onSave={onSaveUser}
          onDelete={handleDeleteUser}
          formName={formName}
          setFormName={setFormName}
          formEmail={formEmail}
          setFormEmail={setFormEmail}
          formRole={formRole}
          setFormRole={setFormRole}
          formPin={formPin}
          setFormPin={setFormPin}
          formTags={formTags}
          setFormTags={setFormTags}
          handleSelectUser={handleSelectUser}
          handleStartCreate={handleStartCreate}
        />
      ),
    },
    {
      path: "accounts/:userId",
      element: (
        <EditAccountRoute
          users={users}
          loading={loading}
          availableTags={availableTags}
          savingId={savingId}
          deletingId={deletingId}
          onSave={onSaveUser}
          onDelete={handleDeleteUser}
          formName={formName}
          setFormName={setFormName}
          formEmail={formEmail}
          setFormEmail={setFormEmail}
          formRole={formRole}
          setFormRole={setFormRole}
          formPin={formPin}
          setFormPin={setFormPin}
          formTags={formTags}
          setFormTags={setFormTags}
          handleSelectUser={handleSelectUser}
          handleStartCreate={handleStartCreate}
        />
      ),
    },
    { path: "general", element: <GeneralView /> },
    {
      path: "whatsapp",
      element: (
        <WhatsAppPresetsView
          presetTab={presetTab}
          setPresetTab={setPresetTab}
          intakeTemplate={intakeTemplate}
          setIntakeTemplate={setIntakeTemplate}
          deliveryTemplate={deliveryTemplate}
          setDeliveryTemplate={setDeliveryTemplate}
          handleResetPresets={handleResetPresets}
          handleInsertVariable={handleInsertVariable}
          handleSavePresets={handleSavePresets}
          savingPresets={savingPresets}
          onCancel={() => navigate("/settings")}
        />
      ),
    },
    {
      path: "tags",
      element: (
        <TagsView
          newTagInput={newTagInput}
          setNewTagInput={setNewTagInput}
          handleCreateTag={handleCreateTag}
          availableTags={availableTags}
          users={users}
          handleDeleteTag={handleDeleteTag}
        />
      ),
    },
    {
      path: "performance",
      element: <PerformanceView users={users} />,
    },
    {
      path: "history",
      element: (
        <DateWiseHistoryView
          searchQuery={dateSearchQuery}
          onClearSearch={() => setDateSearchQuery("")}
          dateFilter={dateFilter}
          onClearDateFilter={() => setDateFilter(null)}
        />
      ),
    },
    { path: "system", element: <SystemView /> },
    {
      path: "statistics",
      element: <Analytics />,
    },
    { path: "updates", element: <AppUpdatesView /> },
    { path: "*", element: <Navigate to="/settings" replace /> },
  ]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full min-h-0 text-workshop-text font-sans bg-workshop-bg">
      {/* Header Bar */}
      <div className="bg-workshop-bg shrink-0 border-b border-workshop-border/20 z-20 relative">
        <div className="safe-top" />
        <div className="h-16 flex items-center justify-between px-5">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              id="settings-back-button"
              onClick={handleBack}
              className="p-2 -ml-2 hover:bg-workshop-surface/80 rounded-lg transition-colors text-workshop-muted hover:text-workshop-text flex items-center justify-center shrink-0 cursor-pointer"
              title={isRootSettings ? "Back to Dashboard" : "Back"}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h2 className={cn("text-base font-black tracking-tight leading-none", headerInfo.colorClass)}>
                {headerInfo.title}
              </h2>
            </div>
          </div>

          {/* Action Group on the Right */}
          <div className="flex items-center gap-3 shrink-0">
            {isRootSettings && (
              <ThemeToggle className="w-8 h-8 rounded-lg" />
            )}

            {isAccountsList && (
              <>
                <button
                  type="button"
                  id="accounts-refresh-btn"
                  onClick={fetchUsers}
                  className="p-2 hover:bg-workshop-surface rounded-lg transition-colors text-workshop-muted hover:text-workshop-text cursor-pointer"
                  title="Refresh Accounts"
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
                <button
                  type="button"
                  id="accounts-create-btn"
                  onClick={() => navigate("/settings/accounts/new")}
                  className="flex items-center gap-1.5 text-xs font-black text-status-success hover:brightness-110 uppercase tracking-widest bg-status-success/5 border border-status-success/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Advisor</span>
                </button>
              </>
            )}

            {isDateHistory && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="date-history-search-btn"
                  onClick={() => {
                    setShowStickySearch(true);
                    setTimeout(() => stickySearchInputRef.current?.focus(), 50);
                  }}
                  className={cn(
                    "p-2 text-workshop-muted hover:text-workshop-text transition-colors rounded-lg cursor-pointer relative",
                    (dateSearchQuery || dateFilter) && "text-workshop-accent"
                  )}
                  title="Search"
                >
                  <Search className="w-5 h-5" />
                  {(dateSearchQuery || dateFilter) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-workshop-accent" />
                  )}
                </button>
                <button
                  type="button"
                  id="date-history-calendar-btn"
                  onClick={handleOpenDateFilter}
                  className={cn(
                    "p-2 transition-colors rounded-lg cursor-pointer relative",
                    dateFilter
                      ? "text-workshop-accent bg-workshop-accent/10"
                      : "text-workshop-muted hover:text-workshop-text"
                  )}
                  title="Filter by date"
                >
                  <Calendar className="w-5 h-5" />
                  {dateFilter && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-workshop-accent" />
                  )}
                </button>

                {/* Hidden native Date Picker Input */}
                <input
                  ref={dateInputRef}
                  type="date"
                  value={dateFilter || ""}
                  onChange={(e) => setDateFilter(e.target.value || null)}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </div>

        {/* Expanded Sticky Search Bar for Date-wise History */}
        <AnimatePresence>
          {isDateHistory && showStickySearch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-x-0 top-0 bg-workshop-surface flex flex-col z-50 border-b border-workshop-border shadow-md"
            >
              <div className="safe-top" />
              <div className="h-16 flex items-center justify-between px-5 sm:px-6">
                <div className="flex items-center gap-3 flex-1 mr-4">
                  <Search className="w-5 h-5 text-workshop-muted shrink-0" />
                  <input
                    ref={stickySearchInputRef}
                    type="text"
                    value={dateSearchQuery}
                    onChange={(e) => setDateSearchQuery(e.target.value)}
                    placeholder="Search plate, vehicle, customer, or date..."
                    className="w-full bg-transparent border-none outline-none text-sm text-workshop-text placeholder:text-workshop-muted/50 font-medium py-2"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDateSearchQuery("");
                    setShowStickySearch(false);
                  }}
                  className="p-2 text-workshop-muted hover:text-workshop-text transition-colors shrink-0 cursor-pointer"
                  title="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global Alert Banners */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 bg-status-urgent/10 text-status-urgent border-b border-status-urgent/20"
          >
            <div className="max-w-4xl mx-auto w-full px-6 py-3.5 text-xs font-bold leading-normal">
              {error}
            </div>
          </motion.div>
        )}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 bg-status-success/10 text-status-success border-b border-status-success/20"
          >
            <div className="max-w-4xl mx-auto w-full px-6 py-3.5 text-xs font-bold leading-normal">
              {successMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content Panel Container */}
      <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto bg-workshop-bg scroll-smooth">
        <div className="w-full max-w-4xl mx-auto pt-0 pb-12 sheet-footer-safe">
          <AnimatePresence mode="wait">
            <motion.div
              key={normalizedPath}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={cn(isRootSettings ? "px-0" : "px-5 sm:px-6")}
            >
              {routesElement}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Delete User Modal */}
      <DeleteUserModal
        userToDelete={userToDelete}
        onCancel={() => {
          setError(null);
          setUserToDelete(null);
        }}
        onConfirm={onDeleteConfirmUser}
        isDeleting={deletingId !== null}
        error={error}
      />

      {/* Settings Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutConfirm}
        isLoggingOut={isLoggingOut}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          try {
            setIsLoggingOut(true);
            await logout();
            navigate("/", { replace: true });
          } catch (err) {
            console.error("Logout error:", err);
          } finally {
            setIsLoggingOut(false);
            setShowLogoutConfirm(false);
          }
        }}
      />
    </div>
  );
}
