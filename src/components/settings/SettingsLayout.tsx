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
import { motion, AnimatePresence, type Variants } from "motion/react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useBackHandler } from "../../contexts/UIContext";
import { useWorkshopUsers } from "../../hooks/useWorkshopUsers";
import { useWorkshopTags } from "../../hooks/useWorkshopTags";
import { useWhatsAppPresets } from "../../hooks/useWhatsAppPresets";

import { SettingsTopBar } from "./SettingsTopBar";
import { CategoriesView } from "./CategoriesView";
import { AccountsView } from "./AccountsView";
import { EditAccountView } from "./EditAccountView";
import { GeneralView } from "./GeneralView";
import { SystemView } from "./SystemView";
import { WhatsAppPresetsView } from "./WhatsAppPresetsView";
import { TagsView } from "./TagsView";
import { AppUpdatesView } from "./AppUpdatesView";
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
    if (isAccountsPath && !isAdmin) {
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
      <SettingsTopBar
        pathname={normalizedPath}
        isRootSettings={isRootSettings}
        isAccountsList={isAccountsList}
        isDateHistory={isDateHistory}
        loading={loading}
        onBack={handleBack}
        onRefreshUsers={fetchUsers}
        onNewAdvisor={() => navigate("/settings/accounts/new")}
        showStickySearch={showStickySearch}
        setShowStickySearch={setShowStickySearch}
        stickySearchInputRef={stickySearchInputRef}
        dateSearchQuery={dateSearchQuery}
        setDateSearchQuery={setDateSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        dateInputRef={dateInputRef}
        onOpenDateFilter={handleOpenDateFilter}
      />

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
