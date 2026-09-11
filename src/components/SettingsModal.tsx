import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { ArrowLeft, RefreshCw, Plus, Search, Calendar, X } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useBackHandler } from "../contexts/UIContext";
import { ThemeToggle } from "./ThemeToggle";
import { useWorkshopUsers } from "../hooks/useWorkshopUsers";
import { useWorkshopTags } from "../hooks/useWorkshopTags";
import { useWhatsAppPresets } from "../hooks/useWhatsAppPresets";

import { CategoriesView } from "./settings/CategoriesView";
import { AccountsView } from "./settings/AccountsView";
import { EditAccountView } from "./settings/EditAccountView";
import { GeneralView } from "./settings/GeneralView";
import { SystemView } from "./settings/SystemView";
import { WhatsAppPresetsView } from "./settings/WhatsAppPresetsView";
import { TagsView } from "./settings/TagsView";
import { PerformanceView } from "./settings/PerformanceView";
import { DateWiseHistoryView } from "./settings/DateWiseHistoryView";
import { DeleteUserModal } from "./settings/DeleteUserModal";
import { LogoutModal } from "./nav/LogoutModal";

export interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type SettingsView =
  | "categories"
  | "accounts"
  | "edit_account"
  | "general"
  | "system"
  | "whatsapp_presets"
  | "tags"
  | "performance"
  | "date_history";

const pageVariants: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.2, 0, 0, 1.0] as const } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.16, ease: [0.2, 0, 0, 1.0] as const } },
};

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get("tab") as SettingsView | null;

  const [viewState, setViewState] = useState<SettingsView>(() => {
    if (
      tabParam &&
      [
        "accounts",
        "edit_account",
        "general",
        "system",
        "whatsapp_presets",
        "tags",
        "performance",
        "date_history",
      ].includes(tabParam)
    ) {
      return tabParam;
    }
    return "categories";
  });

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

  // Reset scroll to top on tab/view switch
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [viewState]);

  // Tab routing sync
  useEffect(() => {
    if (tabParam) {
      if ((tabParam === "accounts" || tabParam === "edit_account" || tabParam === "performance") && !isAdmin) {
        setViewState("categories");
        setSearchParams({}, { replace: true });
        return;
      }
      if (
        [
          "accounts",
          "edit_account",
          "general",
          "system",
          "whatsapp_presets",
          "tags",
          "performance",
          "date_history",
        ].includes(tabParam)
      ) {
        setViewState((prev) => (prev !== tabParam ? tabParam : prev));
      }
    } else {
      setViewState((prev) =>
        prev !== "edit_account" && prev !== "categories" ? "categories" : prev
      );
    }
  }, [tabParam, isAdmin, setSearchParams]);

  const handleSelectTab = (tab: SettingsView) => {
    if ((tab === "accounts" || tab === "edit_account" || tab === "performance") && !isAdmin) {
      setError("Admin access required for this section.");
      return;
    }
    setError(null);
    setViewState(tab);
    if (tab === "categories") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab }, { replace: true });
    }
  };

  // Domain Hooks
  const {
    users,
    loading,
    savingId,
    deletingId,
    userToDelete,
    setUserToDelete,
    selectedUser,
    isCreating,
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

  const isCurrentUser = selectedUser?.id === auth.currentUser?.uid;

  const onSaveUser = async (e: React.FormEvent) => {
    const success = await handleSaveUserProfile(e);
    if (success) {
      setViewState("accounts");
    }
  };

  const onDeleteConfirmUser = async () => {
    const success = await confirmDeleteUser();
    if (success) {
      setViewState("accounts");
    }
  };

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
  }, viewState === "date_history" && showStickySearch, 70);

  // Back handling: Logout confirmation modal
  useBackHandler(() => {
    setShowLogoutConfirm(false);
    return true;
  }, showLogoutConfirm, 80);

  // Back handling: sub-views in Settings
  useBackHandler(() => {
    setError(null);
    handleSelectTab("accounts");
    return true;
  }, viewState === "edit_account", 50);

  useBackHandler(() => {
    setError(null);
    handleSelectTab("categories");
    return true;
  }, viewState !== "categories" && viewState !== "edit_account", 40);

  useBackHandler(() => {
    setError(null);
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
    return true;
  }, viewState === "categories", 30);

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
              onClick={() => {
                setError(null);
                if (viewState === "categories") {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate("/", { replace: true });
                  }
                } else if (viewState === "edit_account") {
                  handleSelectTab("accounts");
                } else {
                  handleSelectTab("categories");
                }
              }}
              className="p-2 -ml-2 hover:bg-workshop-surface/80 rounded-lg transition-colors text-workshop-muted hover:text-workshop-text flex items-center justify-center shrink-0 cursor-pointer"
              title={viewState === "categories" ? "Close Settings" : "Back"}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              {viewState === "categories" && (
                <h2 className="text-base font-black tracking-tight leading-none text-workshop-text">
                  Settings
                </h2>
              )}
              {viewState === "accounts" && (
                <h2 className="text-base font-black tracking-tight leading-none text-status-success">
                  Accounts
                </h2>
              )}
              {viewState === "edit_account" && (
                <h2 className="text-base font-black tracking-tight leading-none text-status-success">
                  {isCreating ? "Create Advisor" : "Edit Advisor"}
                </h2>
              )}
              {viewState === "general" && (
                <h2 className="text-base font-black tracking-tight leading-none text-workshop-secondary">
                  General Settings
                </h2>
              )}
              {viewState === "whatsapp_presets" && (
                <h2 className="text-base font-black tracking-tight leading-none text-emerald-500">
                  WhatsApp Presets
                </h2>
              )}
              {viewState === "tags" && (
                <h2 className="text-base font-black tracking-tight leading-none text-indigo-400">
                  Tags
                </h2>
              )}
              {viewState === "system" && (
                <h2 className="text-base font-black tracking-tight leading-none text-amber-500">
                  System Diagnostics
                </h2>
              )}
              {viewState === "performance" && (
                <h2 className="text-base font-black tracking-tight leading-none text-cyan-400">
                  Technician Performance
                </h2>
              )}
              {viewState === "date_history" && (
                <h2 className="text-base font-black tracking-tight leading-none text-workshop-accent">
                  Date-wise Service History
                </h2>
              )}
            </div>
          </div>

          {/* Action Group on the Right */}
          <div className="flex items-center gap-3 shrink-0">
            {viewState === "categories" && (
              <ThemeToggle className="w-8 h-8 rounded-lg" />
            )}
            {viewState === "accounts" && (
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
                  onClick={() => {
                    handleStartCreate();
                    setViewState("edit_account");
                  }}
                  className="flex items-center gap-1.5 text-xs font-black text-status-success hover:brightness-110 uppercase tracking-widest bg-status-success/5 border border-status-success/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Advisor</span>
                </button>
              </>
            )}
            {viewState === "date_history" && (
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

        {/* Expanded Sticky Search Bar for Date-wise History (Matches Home Screens Spec) */}
        <AnimatePresence>
          {viewState === "date_history" && showStickySearch && (
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
        <div className={cn("w-full max-w-4xl mx-auto pt-0 pb-12 sheet-footer-safe", viewState === "categories" ? "px-0" : "px-5 sm:px-6")}>
          <AnimatePresence mode="wait">
            {viewState === "categories" && (
              <CategoriesView
                isAdmin={isAdmin}
                user={user}
                onSelectTab={handleSelectTab}
                onLogoutClick={() => setShowLogoutConfirm(true)}
                pageVariants={pageVariants}
              />
            )}

            {viewState === "accounts" && (
              <AccountsView
                loading={loading}
                users={users}
                onSelectUser={(u) => {
                  handleSelectUser(u);
                  setViewState("edit_account");
                }}
                pageVariants={pageVariants}
              />
            )}

            {viewState === "edit_account" && (
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
                onSave={onSaveUser}
                onDelete={handleDeleteUser}
                onCancel={() => setViewState("accounts")}
                pageVariants={pageVariants}
              />
            )}

            {viewState === "general" && <GeneralView pageVariants={pageVariants} />}

            {viewState === "system" && <SystemView pageVariants={pageVariants} />}

            {viewState === "whatsapp_presets" && (
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
                onCancel={() => setViewState("categories")}
                pageVariants={pageVariants}
              />
            )}

            {viewState === "tags" && (
              <TagsView
                newTagInput={newTagInput}
                setNewTagInput={setNewTagInput}
                handleCreateTag={handleCreateTag}
                availableTags={availableTags}
                users={users}
                handleDeleteTag={handleDeleteTag}
                pageVariants={pageVariants}
              />
            )}

            {viewState === "performance" && (
              <PerformanceView users={users} pageVariants={pageVariants} />
            )}

            {viewState === "date_history" && (
              <DateWiseHistoryView
                pageVariants={pageVariants}
                searchQuery={dateSearchQuery}
                onClearSearch={() => setDateSearchQuery("")}
                dateFilter={dateFilter}
                onClearDateFilter={() => setDateFilter(null)}
              />
            )}
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
            navigate('/', { replace: true });
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

export function SettingsModal() {
  return <SettingsPage />;
}
