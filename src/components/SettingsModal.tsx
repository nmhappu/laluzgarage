import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { ArrowLeft, RefreshCw, Plus } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useUI, useBackHandler } from "../contexts/UIContext";
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
  | "performance";

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
    formStatus,
    setFormStatus,
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
    <div className="w-full max-w-4xl mx-auto flex flex-col text-workshop-text font-sans sheet-footer-safe pb-8">
      {/* Header Bar */}
      <div className="bg-workshop-bg sticky top-0 z-20 border-b border-workshop-border/20">
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
                <h2 className="text-base font-black tracking-tight uppercase leading-none text-workshop-text">
                  Settings
                </h2>
              )}
              {viewState === "accounts" && (
                <h2 className="text-base font-black tracking-tight uppercase leading-none text-status-success">
                  Accounts
                </h2>
              )}
              {viewState === "edit_account" && (
                <h2 className="text-base font-black tracking-tight uppercase leading-none text-status-success">
                  {isCreating ? "Create Advisor" : "Edit Advisor"}
                </h2>
              )}
              {viewState === "general" && (
                <h2 className="text-base font-black tracking-tight uppercase leading-none text-workshop-secondary">
                  General Settings
                </h2>
              )}
              {viewState === "whatsapp_presets" && (
                <h2 className="text-base font-black tracking-tight uppercase leading-none text-emerald-500">
                  WhatsApp Presets
                </h2>
              )}
              {viewState === "tags" && (
                <h2 className="text-base font-black tracking-tight uppercase leading-none text-indigo-400">
                  Tags
                </h2>
              )}
              {viewState === "system" && (
                <h2 className="text-base font-black tracking-tight uppercase leading-none text-amber-500 font-black">
                  System Diagnostics
                </h2>
              )}
              {viewState === "performance" && (
                <h2 className="text-base font-black tracking-tight uppercase leading-none text-cyan-400">
                  Technician Performance
                </h2>
              )}
            </div>
          </div>

          {/* Action Group on the Right */}
          <div className="flex items-center gap-3 shrink-0">
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
          </div>
        </div>
      </div>

      {/* Global Alert Banners */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-status-urgent/10 text-status-urgent border-b border-status-urgent/20"
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
            className="bg-status-success/10 text-status-success border-b border-status-success/20"
          >
            <div className="max-w-4xl mx-auto w-full px-6 py-3.5 text-xs font-bold leading-normal">
              {successMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content Panel Container */}
      <div className="flex-1 overflow-y-auto bg-workshop-bg">
        <div className="max-w-4xl mx-auto w-full px-6 pt-1 pb-8 md:pb-12">
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
            setShowLogoutConfirm(false);
            await logout();
          } catch (err) {
            console.error("Logout error:", err);
            setIsLoggingOut(false);
          }
        }}
      />
    </div>
  );
}

export function SettingsModal() {
  return <SettingsPage />;
}
