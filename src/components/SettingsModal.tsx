import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Key, Check, Loader2, RefreshCw, User, Sliders, Info, Trash2, Plus, Mail, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Portal } from './Portal';
import { cn } from '../lib/utils';
import type { WorkshopUser } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsView = 'categories' | 'accounts' | 'edit_account' | 'general' | 'system';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [viewState, setViewState] = useState<SettingsView>('categories');
  const [users, setUsers] = useState<WorkshopUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Profile Editor states
  const [selectedUser, setSelectedUser] = useState<WorkshopUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Editor form values
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState<'online' | 'offline'>('offline');
  const [formPin, setFormPin] = useState('');

  // Secret Accounts easter egg state
  const [accountsRevealed, setAccountsRevealed] = useState(false);
  const [headingClickCount, setHeadingClickCount] = useState(0);
  const [lastHeadingClick, setLastHeadingClick] = useState(0);

  const handleSettingsHeadingClick = () => {
    const now = Date.now();
    if (now - lastHeadingClick < 1000) {
      const newCount = headingClickCount + 1;
      setHeadingClickCount(newCount);
      if (newCount >= 7) {
        setAccountsRevealed(true);
      }
    } else {
      setHeadingClickCount(1);
    }
    setLastHeadingClick(now);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const fetchedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopUser));
      setUsers(fetchedUsers);
    } catch (e) {
      console.error(e);
      setError('Failed to fetch users list from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setViewState('categories');
      setAccountsRevealed(false);
      setHeadingClickCount(0);
      setLastHeadingClick(0);
    }
  }, [isOpen]);

  const handleSelectUser = (user: WorkshopUser) => {
    setSelectedUser(user);
    setFormName(user.name || '');
    setFormEmail(user.email || '');
    setFormStatus(user.status || 'offline');
    setFormPin(user.pin || '');
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setSelectedUser(null);
    setFormName('');
    setFormEmail('');
    setFormStatus('offline');
    setFormPin('');
    setIsCreating(true);
  };

  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setError('Name and Email are required.');
      return;
    }
    if (formPin && formPin.length !== 4) {
      setError('PIN must be exactly 4 digits (or empty if not setting one).');
      return;
    }

    setSavingId(selectedUser?.id || 'new');
    setError(null);
    setSuccessMessage(null);

    try {
      if (isCreating) {
        await addDoc(collection(db, 'users'), {
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          status: formStatus,
          pin: formPin || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        setSuccessMessage(`User "${formName}" created successfully!`);
        setIsCreating(false);
        await fetchUsers();
        setViewState('accounts');
      } else if (selectedUser) {
        const userRef = doc(db, 'users', selectedUser.id);
        const newName = formName.trim();
        await updateDoc(userRef, {
          name: newName,
          email: formEmail.trim().toLowerCase(),
          status: formStatus,
          pin: formPin || null,
          updatedAt: serverTimestamp()
        });

        // Sync with Firebase Auth display name if updating self
        if (auth.currentUser && selectedUser.id === auth.currentUser.uid) {
          try {
            await updateProfile(auth.currentUser, {
              displayName: newName
            });
          } catch (authError) {
            console.error('Error syncing auth displayName:', authError);
          }
        }

        setSuccessMessage(`User "${formName}" updated successfully!`);
        await fetchUsers();
        setViewState('accounts');
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to save user profile.');
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
      await deleteDoc(doc(db, 'users', id));
      setSuccessMessage(`Advisor "${name}" deleted successfully.`);
      setSelectedUser(null);
      setUserToDelete(null); // Only close on successful deletion
      await fetchUsers();
      setViewState('accounts');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to delete advisor.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.2, 0, 0, 1.0] } },
    exit: { opacity: 0, x: -10, transition: { duration: 0.16, ease: [0.2, 0, 0, 1.0] } }
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.26, ease: [0.2, 0, 0, 1.0] }}
        className="fixed inset-0 z-[100] bg-workshop-bg flex flex-col overflow-hidden text-workshop-text font-sans"
      >
        {/* Dynamic Navigation Header based on ViewState */}
        <div className="border-b border-workshop-border/30 bg-workshop-surface/20">
          <div className="max-w-4xl mx-auto w-full px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button
                id="settings-back-button"
                onClick={() => {
                  setError(null);
                  if (viewState === 'categories') {
                    onClose();
                  } else if (viewState === 'edit_account') {
                    setViewState('accounts');
                  } else {
                    setViewState('categories');
                  }
                }}
                className="p-2 -ml-2 hover:bg-workshop-surface/80 rounded-lg transition-colors text-workshop-muted hover:text-workshop-text flex items-center justify-center shrink-0"
                title={viewState === 'categories' ? "Close Settings" : "Back"}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="min-w-0">
                {viewState === 'categories' && (
                  <>
                    <h2 
                      onClick={handleSettingsHeadingClick}
                      className="text-base font-black tracking-tight uppercase leading-none cursor-pointer select-none active:scale-95 transition-transform"
                    >
                      Settings
                    </h2>
                  </>
                )}
                {viewState === 'accounts' && (
                  <>
                    <h2 className="text-base font-black tracking-tight uppercase leading-none text-status-success">Accounts</h2>
                  </>
                )}
                {viewState === 'edit_account' && (
                  <>
                    <h2 className="text-base font-black tracking-tight uppercase leading-none text-status-success">
                      {isCreating ? 'Create Advisor' : 'Edit Advisor'}
                    </h2>
                  </>
                )}
                {viewState === 'general' && (
                  <>
                    <h2 className="text-base font-black tracking-tight uppercase leading-none text-workshop-secondary">General Settings</h2>
                  </>
                )}
                {viewState === 'system' && (
                  <>
                    <h2 className="text-base font-black tracking-tight uppercase leading-none text-amber-500 font-black">System Diagnostics</h2>
                  </>
                )}
              </div>
            </div>

            {/* Action Group on the Right */}
            <div className="flex items-center gap-3 shrink-0">
              {viewState === 'accounts' && (
                <>
                  <button 
                    id="accounts-refresh-btn"
                    onClick={fetchUsers}
                    className="p-2 hover:bg-workshop-surface rounded-lg transition-colors text-workshop-muted hover:text-workshop-text"
                    title="Refresh Accounts"
                  >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                  </button>
                  <button
                    id="accounts-create-btn"
                    onClick={() => {
                      handleStartCreate();
                      setViewState('edit_account');
                    }}
                    className="flex items-center gap-1.5 text-xs font-black text-status-success hover:brightness-110 uppercase tracking-widest bg-status-success/5 border border-status-success/20 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New Advisor</span>
                  </button>
                </>
              )}

              {viewState === 'categories' && (
                <div />
              )}
            </div>
          </div>
        </div>

        {/* Global Alert Banners */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
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
              animate={{ opacity: 1, height: 'auto' }}
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
          <div className="max-w-4xl mx-auto w-full px-6 py-8 md:py-12">
            <AnimatePresence mode="wait">
              {viewState === 'categories' && (
                <motion.div
                  key="categories"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-workshop-muted">Settings Categories</h3>
                  </div>

                  {/* Cardless Flat Categories List */}
                  <div className="divide-y divide-workshop-border/30 border-t border-b border-workshop-border/30">
                    {/* Accounts Category */}
                    {accountsRevealed && (
                      <button
                        id="settings-category-accounts"
                        onClick={() => setViewState('accounts')}
                        className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors px-4 -mx-4 rounded-xl group animate-fade-in"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 bg-status-success/10 rounded-xl flex items-center justify-center text-status-success border border-status-success/20 shrink-0">
                            <User className="w-5 h-5 text-status-success" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-status-success transition-colors">Accounts</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
                      </button>
                    )}

                    {/* General Category */}
                    <button
                      id="settings-category-general"
                      onClick={() => setViewState('general')}
                      className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors px-4 -mx-4 rounded-xl group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 bg-workshop-secondary/10 rounded-xl flex items-center justify-center text-workshop-secondary border border-workshop-secondary/20 shrink-0">
                          <Sliders className="w-5 h-5 text-workshop-secondary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-workshop-secondary transition-colors">General</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
                    </button>

                    {/* System Category */}
                    <button
                      id="settings-category-system"
                      onClick={() => setViewState('system')}
                      className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/30 transition-colors px-4 -mx-4 rounded-xl group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                          <Info className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-amber-400 transition-colors">System</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {viewState === 'accounts' && (
                <motion.div
                  key="accounts"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-workshop-muted">Authorized Advisors ({users.length})</h3>
                  </div>

                  {loading && users.length === 0 ? (
                    <div className="py-16 text-center text-workshop-muted text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-status-success" />
                      <span>Loading advisors...</span>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="py-16 text-center text-workshop-muted text-xs font-bold uppercase tracking-wider border border-dashed border-workshop-border/30 rounded-xl">
                      No advisors registered yet. Click &quot;New Advisor&quot; at the top right to get started.
                    </div>
                  ) : (
                    /* Flat List, Clean Cardless Style with Thin Dividers */
                    <div className="divide-y divide-workshop-border/20 border-t border-b border-workshop-border/20">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          id={`advisor-item-${u.id}`}
                          onClick={() => {
                            handleSelectUser(u);
                            setViewState('edit_account');
                          }}
                          className="w-full text-left py-4 flex items-center justify-between hover:bg-workshop-surface/20 transition-all rounded-lg px-3 -mx-3 group"
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <p className="text-sm font-bold text-workshop-text group-hover:text-status-success transition-colors">
                              {u.name || 'Unnamed Advisor'}
                            </p>
                            <p className="text-xs font-mono text-workshop-muted mt-0.5 truncate">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-1.5 bg-workshop-surface border border-workshop-border/40 px-2.5 py-1 rounded-lg">
                              <Key className="w-3.5 h-3.5 text-workshop-muted" />
                              <span className="text-[11px] font-mono font-bold text-workshop-text">
                                {u.pin ? u.pin : 'None'}
                              </span>
                            </div>

                            <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-text transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {viewState === 'edit_account' && (
                <motion.div
                  key="edit_account"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="max-w-xl mx-auto"
                >
                  <form onSubmit={handleSaveUserProfile} className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-workshop-muted">
                        {isCreating ? 'Create Advisor Profile' : 'Edit Advisor Profile'}
                      </h3>
                    </div>

                    {/* Flat Form Fields */}
                    <div className="space-y-4 pt-2">
                      {/* Name field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">Advisor Name</label>
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
                        <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">Email Address</label>
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
                        <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">Advisor Security PIN (4 Digits)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-workshop-muted">
                            <Key className="w-4 h-4" />
                          </span>
                          <input 
                            type="text"
                            pattern="\d*"
                            maxLength={4}
                            value={formPin}
                            onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            placeholder="4-Digit Security PIN"
                            className="w-full bg-workshop-surface border border-workshop-border/60 pl-10 pr-4 py-2.5 rounded-lg text-sm font-mono tracking-widest font-bold text-workshop-text focus:border-status-success focus:ring-1 focus:ring-status-success/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-5 flex items-center justify-between border-t border-workshop-border/20">
                      {selectedUser ? (
                        isCurrentUser ? (
                          <span className="text-xs font-bold uppercase tracking-wider text-workshop-muted flex items-center gap-1.5 py-2 cursor-not-allowed select-none opacity-50" title="You cannot delete your own logged-in advisor profile.">
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Delete Advisor (Self)</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={deletingId === selectedUser.id}
                            onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name || selectedUser.email)}
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
                          onClick={() => setViewState('accounts')}
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
                          <span>{isCreating ? 'Create Advisor' : 'Save Changes'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}

              {viewState === 'general' && (
                <motion.div
                  key="general"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-workshop-muted">General Workshop Preferences</h3>
                  </div>

                  {/* General Settings Options List - Flat, clean, cardless style */}
                  <div className="divide-y divide-workshop-border/30 border-t border-b border-workshop-border/20">
                    <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-workshop-text">Workshop Identifier</p>
                        <p className="text-xs text-workshop-muted">The name used on customer correspondence and reports</p>
                      </div>
                      <input 
                        type="text" 
                        readOnly 
                        value="Workshop Manager Pro" 
                        className="bg-workshop-surface border border-workshop-border/40 px-3.5 py-2 rounded-lg text-xs font-bold text-workshop-text text-right max-w-xs focus:outline-none"
                      />
                    </div>

                    <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-workshop-text">Base Currency</p>
                        <p className="text-xs text-workshop-muted">Default billing and pricing currency</p>
                      </div>
                      <span className="text-xs font-bold font-mono text-workshop-muted bg-workshop-surface px-3.5 py-2 rounded-lg border border-workshop-border/40">AUD ($)</span>
                    </div>

                    <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-workshop-text">GST Billing Integration</p>
                        <p className="text-xs text-workshop-muted">Standard sales tax rate for billing items and invoices</p>
                      </div>
                      <span className="text-xs font-bold font-mono text-workshop-muted bg-workshop-surface px-3.5 py-2 rounded-lg border border-workshop-border/40">10% (GST)</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {viewState === 'system' && (
                <motion.div
                  key="system"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-workshop-muted">Cloud & Database Services</h3>
                  </div>

                  {/* System Diagnostics List - Flat, clean, cardless style */}
                  <div className="divide-y divide-workshop-border/30 border-t border-b border-workshop-border/20">
                    <div className="py-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-workshop-text">Firestore Database</p>
                        <p className="text-xs text-workshop-muted font-mono mt-0.5">ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e</p>
                      </div>
                      <span className="text-xs font-bold text-status-success bg-status-success/10 px-2.5 py-1 rounded">Active</span>
                    </div>

                    <div className="py-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-workshop-text">Authentication Provider</p>
                        <p className="text-xs text-workshop-muted mt-0.5">Google OAuth SSO / Secure Local PINs</p>
                      </div>
                      <span className="text-xs font-bold text-status-success bg-status-success/10 px-2.5 py-1 rounded">Connected</span>
                    </div>

                    <div className="py-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-workshop-text">Client Environment</p>
                        <p className="text-xs text-workshop-muted mt-0.5">Cloud Run Application Container Sandbox</p>
                      </div>
                      <span className="text-xs font-bold text-workshop-muted bg-workshop-surface px-2.5 py-1 rounded font-mono border border-workshop-border/40">Production</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 bg-workshop-bg/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-workshop-surface max-w-sm w-full rounded-xl p-6 border border-workshop-border shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-4 text-status-urgent border border-status-urgent/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-workshop-text uppercase tracking-tight mb-2">Delete Advisor?</h3>
              <p className="text-workshop-muted text-xs mb-6 leading-relaxed">
                Are you sure you want to permanently delete advisor <span className="font-semibold text-workshop-text">"{userToDelete.name}"</span>? This action cannot be undone.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-status-urgent/10 border border-status-urgent/20 rounded-lg text-status-urgent text-xs font-semibold text-left">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => {
                    setError(null);
                    setUserToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-workshop-surface text-workshop-muted hover:text-workshop-text rounded-lg text-xs font-bold uppercase tracking-wider border border-workshop-border/40 hover:bg-workshop-border/20 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={confirmDeleteUser}
                  className="flex-1 px-4 py-2.5 bg-status-urgent text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-status-urgent/25 hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deletingId !== null ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
