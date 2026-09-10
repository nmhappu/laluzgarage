import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import type { WorkshopUser } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { Portal } from "./Portal";
import {
  fetchWhatsAppPresets,
  saveWhatsAppPresets,
  DEFAULT_INTAKE_TEMPLATE,
  DEFAULT_DELIVERY_TEMPLATE,
} from "../services/whatsappPresetService";

import { CategoriesView } from "./settings/CategoriesView";
import { AccountsView } from "./settings/AccountsView";
import { EditAccountView } from "./settings/EditAccountView";
import { GeneralView } from "./settings/GeneralView";
import { SystemView } from "./settings/SystemView";
import { WhatsAppPresetsView } from "./settings/WhatsAppPresetsView";
import { TagsView } from "./settings/TagsView";
import { PerformanceView } from "./settings/PerformanceView";
import { DeleteUserModal } from "./settings/DeleteUserModal";

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

  useEffect(() => {
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
      setViewState((prev) => (prev !== tabParam ? tabParam : prev));
      if (tabParam === "performance") {
        setPerformanceRevealed(true);
      }
    } else if (!tabParam) {
      setViewState((prev) =>
        prev !== "edit_account" && prev !== "categories" ? "categories" : prev
      );
    }
  }, [tabParam]);

  const handleSelectTab = (tab: SettingsView) => {
    setError(null);
    setViewState(tab);
    if (tab === "categories") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab }, { replace: true });
    }
  };

  const [users, setUsers] = useState<WorkshopUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // WhatsApp Presets states
  const [intakeTemplate, setIntakeTemplate] = useState(DEFAULT_INTAKE_TEMPLATE);
  const [deliveryTemplate, setDeliveryTemplate] = useState(DEFAULT_DELIVERY_TEMPLATE);
  const [presetTab, setPresetTab] = useState<"intake" | "delivery">("intake");
  const [savingPresets, setSavingPresets] = useState(false);

  // Profile Editor states
  const [selectedUser, setSelectedUser] = useState<WorkshopUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Editor form values
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formStatus, setFormStatus] = useState<"online" | "offline">("offline");
  const [formPin, setFormPin] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);

  // Tags states & custom persistence
  const [customTags, setCustomTags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("workshop_custom_tags");
      return saved ? JSON.parse(saved) : ["tech"];
    } catch {
      return ["tech"];
    }
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // Dynamically calculate all tags in database + customTags
  useEffect(() => {
    const tagsSet = new Set<string>(customTags);
    users.forEach((u) => {
      if (u.tags && Array.isArray(u.tags)) {
        u.tags.forEach((t) => {
          if (t && typeof t === "string") {
            tagsSet.add(t.trim().toLowerCase());
          }
        });
      }
    });
    setAvailableTags(Array.from(tagsSet));
  }, [users, customTags]);

  const handleCreateTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (trimmed.length > 20) {
      setError("Tag name must be 20 characters or less.");
      return;
    }
    if (availableTags.includes(trimmed)) {
      setError(`Tag "${trimmed}" already exists.`);
      return;
    }
    const updated = Array.from(new Set([...customTags, trimmed]));
    setCustomTags(updated);
    try {
      localStorage.setItem("workshop_custom_tags", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setNewTagInput("");
    setSuccessMessage(`Tag "${trimmed}" created.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    const updatedCustom = customTags.filter((t) => t !== tagToDelete);
    setCustomTags(updatedCustom);
    try {
      localStorage.setItem("workshop_custom_tags", JSON.stringify(updatedCustom));
    } catch (e) {
      console.error(e);
    }

    const usersWithTag = users.filter((u) => u.tags?.includes(tagToDelete));
    for (const u of usersWithTag) {
      try {
        const userRef = doc(db, "users", u.id);
        const newTags = (u.tags || []).filter((t) => t !== tagToDelete);
        await updateDoc(userRef, {
          tags: newTags,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Error removing tag from user:", e);
      }
    }
    await fetchUsers();
    setSuccessMessage(`Tag "${tagToDelete}" deleted.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Easter Egg States
  const [accountsRevealed, setAccountsRevealed] = useState(() => {
    return localStorage.getItem("workshop_accounts_revealed") === "true";
  });
  const [performanceRevealed, setPerformanceRevealed] = useState(() => {
    return localStorage.getItem("workshop_performance_revealed") === "true";
  });
  const [clickCount, setClickCount] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [holdProgress, setHoldProgress] = useState(false);

  const handleSettingsHeadingClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 3 && !accountsRevealed) {
      setAccountsRevealed(true);
      localStorage.setItem("workshop_accounts_revealed", "true");
      setSuccessMessage("Admin Mode Activated: Accounts view unlocked.");
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  const startTitleHold = () => {
    setHoldProgress(true);
    holdTimerRef.current = setTimeout(() => {
      if (!performanceRevealed) {
        setPerformanceRevealed(true);
        localStorage.setItem("workshop_performance_revealed", "true");
        setSuccessMessage("Analytics Dashboard Unlocked: Performance view revealed.");
        setTimeout(() => setSuccessMessage(null), 3500);
      }
      setHoldProgress(false);
    }, 2000);
  };

  const cancelTitleHold = () => {
    setHoldProgress(false);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Load WhatsApp presets
  useEffect(() => {
    fetchWhatsAppPresets().then((presets) => {
      setIntakeTemplate(presets.intakeTemplate);
      setDeliveryTemplate(presets.deliveryTemplate);
    });
  }, []);

  const handleSavePresets = async () => {
    setSavingPresets(true);
    setError(null);
    try {
      await saveWhatsAppPresets({
        intakeTemplate,
        deliveryTemplate,
      });
      setSuccessMessage("WhatsApp Message Presets saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error("Error saving whatsapp presets:", e);
      setError("Failed to save WhatsApp message presets.");
    } finally {
      setSavingPresets(false);
    }
  };

  const handleResetPresets = () => {
    if (presetTab === "intake") {
      setIntakeTemplate(DEFAULT_INTAKE_TEMPLATE);
    } else {
      setDeliveryTemplate(DEFAULT_DELIVERY_TEMPLATE);
    }
    setSuccessMessage(`Reset ${presetTab} message template to default.`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleInsertVariable = (tag: string) => {
    if (presetTab === "intake") {
      setIntakeTemplate((prev) => prev + " " + tag);
    } else {
      setDeliveryTemplate((prev) => prev + " " + tag);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, "users"));
      const userList = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkshopUser);
      userList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(userList);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch workshop team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectUser = (u: WorkshopUser) => {
    setSelectedUser(u);
    setIsCreating(false);
    setFormName(u.name || "");
    setFormEmail(u.email || "");
    setFormStatus(u.status || "offline");
    setFormPin(u.pin || "");
    setFormTags(u.tags || []);
    setError(null);
    setSuccessMessage(null);
  };

  const handleStartCreate = () => {
    setSelectedUser(null);
    setIsCreating(true);
    setFormName("");
    setFormEmail("");
    setFormStatus("offline");
    setFormPin("");
    setFormTags([]);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) {
      setError("Email address is required.");
      return;
    }
    if (formPin && !/^\d{4}$/.test(formPin)) {
      setError("Security PIN must be exactly 4 digits.");
      return;
    }

    setSavingId(selectedUser?.id || "new");
    setError(null);
    setSuccessMessage(null);

    try {
      const newName = formName.trim() || formEmail.split("@")[0];

      if (isCreating) {
        await addDoc(collection(db, "users"), {
          name: newName,
          email: formEmail.trim().toLowerCase(),
          status: formStatus,
          pin: formPin || null,
          tags: formTags,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSuccessMessage(`New advisor "${newName}" created successfully!`);
        await fetchUsers();
        setViewState("accounts");
      } else if (selectedUser) {
        const userRef = doc(db, "users", selectedUser.id);
        await updateDoc(userRef, {
          name: newName,
          email: formEmail.trim().toLowerCase(),
          status: formStatus,
          pin: formPin || null,
          tags: formTags,
          updatedAt: serverTimestamp(),
        });

        if (auth.currentUser && selectedUser.id === auth.currentUser.uid) {
          try {
            await updateProfile(auth.currentUser, { displayName: newName });
          } catch (authError) {
            console.error("Error syncing auth displayName:", authError);
          }
        }

        setSuccessMessage(`User "${formName}" updated successfully!`);
        await fetchUsers();
        setViewState("accounts");
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setError("Failed to save user profile.");
    } finally {
      setSavingId(null);
    }
  };

  const isCurrentUser = selectedUser?.id === auth.currentUser?.uid;

  const handleDeleteUser = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const { id, name } = userToDelete;

    setDeletingId(id);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteDoc(doc(db, "users", id));
      setSuccessMessage(`Advisor "${name}" deleted successfully.`);
      setSelectedUser(null);
      setUserToDelete(null);
      await fetchUsers();
      setViewState("accounts");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setError("Failed to delete advisor.");
    } finally {
      setDeletingId(null);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.2, 0, 0, 1.0] } },
    exit: { opacity: 0, x: -10, transition: { duration: 0.16, ease: [0.2, 0, 0, 1.0] } },
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col text-workshop-text font-sans pb-12">
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
                <h2
                  onClick={handleSettingsHeadingClick}
                  onMouseDown={startTitleHold}
                  onMouseUp={cancelTitleHold}
                  onMouseLeave={cancelTitleHold}
                  onTouchStart={startTitleHold}
                  onTouchEnd={cancelTitleHold}
                  onTouchCancel={cancelTitleHold}
                  className={cn(
                    "text-base font-black tracking-tight uppercase leading-none cursor-pointer select-none active:scale-95 transition-transform",
                    holdProgress && "text-cyan-400"
                  )}
                >
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
                accountsRevealed={accountsRevealed}
                performanceRevealed={performanceRevealed}
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
                formPin={formPin}
                setFormPin={setFormPin}
                formTags={formTags}
                setFormTags={setFormTags}
                availableTags={availableTags}
                savingId={savingId}
                deletingId={deletingId}
                onSave={handleSaveUserProfile}
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
        onConfirm={confirmDeleteUser}
        isDeleting={deletingId !== null}
        error={error}
      />

      {/* Settings Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <Portal>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
                className="absolute inset-0 bg-workshop-bg/85 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="relative bg-workshop-card w-full max-w-sm rounded-xl p-8 shadow-2xl border border-workshop-border text-center z-10"
              >
                <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <h2 className="text-xl font-black text-workshop-text uppercase tracking-tight mb-2">
                  End Session?
                </h2>
                <p className="text-workshop-muted text-sm mb-8 leading-relaxed">
                  Are you sure you want to log out? You will need to sign in again to access the
                  workshop dashboard.
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isLoggingOut}
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-workshop-surface text-workshop-muted rounded-xl text-sm font-black uppercase tracking-widest border border-workshop-border hover:text-workshop-text hover:bg-workshop-border transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="settings-confirm-logout-btn"
                    disabled={isLoggingOut}
                    onClick={async () => {
                      try {
                        setIsLoggingOut(true);
                        setShowLogoutConfirm(false);
                        await logout();
                      } catch (err) {
                        console.error("Logout error:", err);
                        setIsLoggingOut(false);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-status-urgent text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-status-urgent/20 hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Signing out...</span>
                      </>
                    ) : (
                      "Log Out"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SettingsModal() {
  return <SettingsPage />;
}
