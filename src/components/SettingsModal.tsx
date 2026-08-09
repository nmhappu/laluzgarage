import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Key, Check, Loader2, RefreshCw, User, Sliders, Info, Trash2, Plus, Mail, ChevronRight, ArrowLeft, MessageSquare, RotateCcw, Sparkles, Tag, BarChart2, Wrench, CheckCircle2, DollarSign, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import type { WorkshopUser, ServiceRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import {
  fetchWhatsAppPresets,
  saveWhatsAppPresets,
  DEFAULT_INTAKE_TEMPLATE,
  DEFAULT_DELIVERY_TEMPLATE,
  formatIntakeMessage,
  formatDeliveryMessage,
} from '../services/whatsappPresetService';

export interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type SettingsView = 'categories' | 'accounts' | 'edit_account' | 'general' | 'system' | 'whatsapp_presets' | 'tags' | 'performance';

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab') as SettingsView | null;

  const [viewState, setViewState] = useState<SettingsView>(() => {
    if (tabParam && ['accounts', 'edit_account', 'general', 'system', 'whatsapp_presets', 'tags', 'performance'].includes(tabParam)) {
      return tabParam;
    }
    return 'categories';
  });

  useEffect(() => {
    if (tabParam && ['accounts', 'edit_account', 'general', 'system', 'whatsapp_presets', 'tags', 'performance'].includes(tabParam)) {
      setViewState(tabParam);
      if (tabParam === 'performance') {
        setPerformanceRevealed(true);
      }
    } else if (!tabParam && viewState !== 'edit_account') {
      setViewState('categories');
    }
  }, [tabParam]);

  const handleSelectTab = (tab: SettingsView) => {
    setError(null);
    setViewState(tab);
    if (tab === 'categories') {
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
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // WhatsApp Presets states
  const [intakeTemplate, setIntakeTemplate] = useState(DEFAULT_INTAKE_TEMPLATE);
  const [deliveryTemplate, setDeliveryTemplate] = useState(DEFAULT_DELIVERY_TEMPLATE);
  const [presetTab, setPresetTab] = useState<'intake' | 'delivery'>('intake');
  const [savingPresets, setSavingPresets] = useState(false);

  // Profile Editor states
  const [selectedUser, setSelectedUser] = useState<WorkshopUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Editor form values
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState<'online' | 'offline'>('offline');
  const [formPin, setFormPin] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  // Tags states & custom persistence
  const [customTags, setCustomTags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('workshop_custom_tags');
      return saved ? JSON.parse(saved) : ['tech'];
    } catch {
      return ['tech'];
    }
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Dynamically calculate all tags in database + customTags
  useEffect(() => {
    const tagsSet = new Set<string>(customTags);
    users.forEach(u => {
      if (u.tags && Array.isArray(u.tags)) {
        u.tags.forEach(t => {
          if (t && typeof t === 'string') {
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
      setError('Tag name must be 20 characters or less.');
      return;
    }
    if (!availableTags.includes(trimmed)) {
      const updated = [...customTags, trimmed];
      setCustomTags(updated);
      try {
        localStorage.setItem('workshop_custom_tags', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    setNewTagInput('');
    setSuccessMessage(`Tag "${trimmed}" added successfully.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    const updatedCustom = customTags.filter(t => t !== tagToDelete);
    setCustomTags(updatedCustom);
    try {
      localStorage.setItem('workshop_custom_tags', JSON.stringify(updatedCustom));
    } catch (e) {
      console.error(e);
    }

    // Remove tag from any user that has it in Firestore
    const usersWithTag = users.filter(u => u.tags?.includes(tagToDelete));
    for (const user of usersWithTag) {
      try {
        const userRef = doc(db, 'users', user.id);
        const newTags = (user.tags || []).filter(t => t !== tagToDelete);
        await updateDoc(userRef, {
          tags: newTags,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error('Error removing tag from user:', e);
      }
    }
    await fetchUsers();
    setSuccessMessage(`Tag "${tagToDelete}" deleted.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Performance States & Logic
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [perfTimeRange, setPerfTimeRange] = useState<'all' | '30days' | 'month'>('all');

  const fetchPerformanceData = async () => {
    setLoadingPerformance(true);
    try {
      const snap = await getDocs(collection(db, 'serviceRecords'));
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
      setServiceRecords(records);
    } catch (err) {
      console.error("Error fetching service records for performance:", err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => {
    if (viewState === 'performance') {
      fetchPerformanceData();
    }
  }, [viewState]);

  const filteredRecords = useMemo(() => {
    if (perfTimeRange === 'all') return serviceRecords;
    const now = new Date();
    if (perfTimeRange === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return serviceRecords.filter(r => {
        const d = r.date ? new Date(r.date) : null;
        return d && d >= thirtyDaysAgo;
      });
    }
    if (perfTimeRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return serviceRecords.filter(r => {
        const d = r.date ? new Date(r.date) : null;
        return d && d >= startOfMonth;
      });
    }
    return serviceRecords;
  }, [serviceRecords, perfTimeRange]);

  const techPerformanceData = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      completed: number;
      inProgress: number;
      pending: number;
      total: number;
      totalRevenue: number;
      laborRevenue: number;
    }>();

    users.forEach(u => {
      map.set(u.id, {
        id: u.id,
        name: u.name || 'Unnamed Advisor',
        completed: 0,
        inProgress: 0,
        pending: 0,
        total: 0,
        totalRevenue: 0,
        laborRevenue: 0,
      });
    });

    filteredRecords.forEach(r => {
      let key = r.technicianId;
      let techName = r.technicianName;

      if (!key && techName) {
        key = techName;
      } else if (!key && !techName) {
        key = 'Unassigned';
        techName = 'Unassigned';
      }

      if (key && !techName) {
        const foundUser = users.find(u => u.id === key);
        techName = foundUser?.name || 'Unknown Advisor';
      }

      let entry = map.get(key!);
      if (!entry && techName) {
        entry = Array.from(map.values()).find(e => e.name.toLowerCase() === techName?.toLowerCase());
      }

      if (!entry) {
        entry = {
          id: key || techName || 'Unassigned',
          name: techName || 'Unassigned',
          completed: 0,
          inProgress: 0,
          pending: 0,
          total: 0,
          totalRevenue: 0,
          laborRevenue: 0,
        };
        map.set(key || techName || 'Unassigned', entry);
      }

      entry.total += 1;
      if (r.status === 'completed') {
        entry.completed += 1;
        entry.totalRevenue += (Number(r.totalCost) || 0);
        entry.laborRevenue += (Number(r.laborCost) || 0);
      } else if (r.status === 'in-progress') {
        entry.inProgress += 1;
      } else if (r.status === 'pending') {
        entry.pending += 1;
      }
    });

    return Array.from(map.values()).filter(t => t.total > 0 || users.some(u => u.id === t.id));
  }, [filteredRecords, users]);

  // Secret Technician Performance state (revealed by holding Settings title for 5 seconds)
  const [performanceRevealed, setPerformanceRevealed] = useState(() => tabParam === 'performance');
  const holdTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [holdProgress, setHoldProgress] = useState(false);

  const startTitleHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setHoldProgress(true);
    holdTimerRef.current = setTimeout(() => {
      setPerformanceRevealed(true);
      setHoldProgress(false);
    }, 5000);
  };

  const cancelTitleHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(false);
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

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
    fetchUsers();
    fetchWhatsAppPresets().then((res) => {
      setIntakeTemplate(res.intakeTemplate);
      setDeliveryTemplate(res.deliveryTemplate);
    }).catch(console.error);
  }, []);

  const handleInsertVariable = (variableName: string) => {
    if (presetTab === 'intake') {
      setIntakeTemplate(prev => prev + variableName);
    } else {
      setDeliveryTemplate(prev => prev + variableName);
    }
  };

  const handleSavePresets = async () => {
    setSavingPresets(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await saveWhatsAppPresets({
        intakeTemplate,
        deliveryTemplate,
      });
      setSuccessMessage('WhatsApp message presets saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to save WhatsApp presets.');
    } finally {
      setSavingPresets(false);
    }
  };

  const handleResetPresets = () => {
    if (presetTab === 'intake') {
      setIntakeTemplate(DEFAULT_INTAKE_TEMPLATE);
    } else {
      setDeliveryTemplate(DEFAULT_DELIVERY_TEMPLATE);
    }
  };

  const handleSelectUser = (user: WorkshopUser) => {
    setSelectedUser(user);
    setFormName(user.name || '');
    setFormEmail(user.email || '');
    setFormStatus(user.status || 'offline');
    setFormPin(user.pin || '');
    setFormTags(user.tags || []);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setSelectedUser(null);
    setFormName('');
    setFormEmail('');
    setFormStatus('offline');
    setFormPin('');
    setFormTags([]);
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
          tags: formTags,
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
          tags: formTags,
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

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.2, 0, 0, 1.0] } },
    exit: { opacity: 0, x: -10, transition: { duration: 0.16, ease: [0.2, 0, 0, 1.0] } }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col text-workshop-text font-sans pb-12">
      {/* Dynamic Navigation Header based on ViewState */}
      <div className="bg-workshop-bg sticky top-0 z-20 border-b border-workshop-border/20">
        <div className="safe-top" />
        <div className="h-16 flex items-center justify-between px-5">
          <div className="flex items-center gap-4 min-w-0">
            <button
              id="settings-back-button"
              onClick={() => {
                setError(null);
                if (viewState === 'categories') {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/', { replace: true });
                  }
                } else if (viewState === 'edit_account') {
                  handleSelectTab('accounts');
                } else {
                  handleSelectTab('categories');
                }
              }}
              className="p-2 -ml-2 hover:bg-workshop-surface/80 rounded-lg transition-colors text-workshop-muted hover:text-workshop-text flex items-center justify-center shrink-0 cursor-pointer"
              title={viewState === 'categories' ? "Close Settings" : "Back"}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
              
              <div className="min-w-0">
                {viewState === 'categories' && (
                  <>
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
                {viewState === 'whatsapp_presets' && (
                  <>
                    <h2 className="text-base font-black tracking-tight uppercase leading-none text-emerald-500">WhatsApp Presets</h2>
                  </>
                )}
                {viewState === 'tags' && (
                  <>
                    <h2 className="text-base font-black tracking-tight uppercase leading-none text-indigo-400">Tags</h2>
                  </>
                )}
                {viewState === 'system' && (
                  <>
                    <h2 className="text-base font-black tracking-tight uppercase leading-none text-amber-500 font-black">System Diagnostics</h2>
                  </>
                )}
                {viewState === 'performance' && (
                  <>
                    <h2 className="text-base font-black tracking-tight uppercase leading-none text-cyan-400">Technician Performance</h2>
                  </>
                )}
              </div>
            </div>

            {/* Action Group on the Right */}
            <div className="flex items-center gap-3 shrink-0">
              {viewState === 'performance' && (
                <button 
                  id="performance-refresh-btn"
                  onClick={fetchPerformanceData}
                  className="p-2 hover:bg-workshop-surface rounded-lg transition-colors text-workshop-muted hover:text-workshop-text cursor-pointer"
                  title="Refresh Performance Data"
                >
                  <RefreshCw className={cn("w-4 h-4", loadingPerformance && "animate-spin")} />
                </button>
              )}
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
          <div className="max-w-4xl mx-auto w-full px-6 pt-1 pb-8 md:pb-12">
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
                  {/* Cardless Flat Categories List */}
                  <div className="divide-y divide-workshop-border/30 border-b border-workshop-border/30">
                    {/* Accounts Category */}
                    {accountsRevealed && (
                      <button
                        id="settings-category-accounts"
                        onClick={() => handleSelectTab('accounts')}
                        className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group animate-fade-in px-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <User className="w-5 h-5 text-status-success shrink-0" />
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
                      onClick={() => handleSelectTab('general')}
                      className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group px-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <Sliders className="w-5 h-5 text-workshop-secondary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-workshop-secondary transition-colors">General</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
                    </button>

                    {/* WhatsApp Presets Category */}
                    <button
                      id="settings-category-whatsapp"
                      onClick={() => handleSelectTab('whatsapp_presets')}
                      className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group px-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/whatsapp-light.svg" alt="WhatsApp" className="w-5 h-5 shrink-0" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-emerald-400 transition-colors">WhatsApp Presets</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
                    </button>

                    {/* Tags Category */}
                    <button
                      id="settings-category-tags"
                      onClick={() => handleSelectTab('tags')}
                      className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group px-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <Tag className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-indigo-400 transition-colors">Tags</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
                    </button>

                    {/* Technician Performance Category */}
                    {performanceRevealed && (
                      <button
                        id="settings-category-performance"
                        onClick={() => handleSelectTab('performance')}
                        className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group animate-fade-in px-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <BarChart2 className="w-5 h-5 text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-workshop-text leading-tight group-hover:text-cyan-400 transition-colors">Technician Performance</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-text transition-colors shrink-0 ml-4" />
                      </button>
                    )}

                    {/* System Category */}
                    <button
                      id="settings-category-system"
                      onClick={() => handleSelectTab('system')}
                      className="w-full py-5 flex items-center justify-between text-left hover:bg-workshop-surface/10 transition-colors rounded-none group px-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <Info className="w-5 h-5 text-amber-500 shrink-0" />
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
                    <div className="divide-y divide-workshop-border/20 border-b border-workshop-border/20">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          id={`advisor-item-${u.id}`}
                          onClick={() => {
                            handleSelectUser(u);
                            setViewState('edit_account');
                          }}
                          className="w-full text-left py-4 flex items-center justify-between hover:bg-workshop-surface/10 transition-all rounded-none px-0 group"
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-workshop-text group-hover:text-status-success transition-colors">
                                {u.name || 'Unnamed Advisor'}
                              </p>
                              {u.tags && u.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {u.tags.map(t => (
                                    <span key={t} className="px-1.5 py-0.5 bg-workshop-surface border border-workshop-border/40 text-[9px] font-mono font-black uppercase tracking-wider text-workshop-muted rounded">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
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

                      {/* Tags Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider">Advisor Tags</label>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {availableTags.map(tag => {
                            const isSelected = formTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setFormTags(formTags.filter(t => t !== tag));
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
                  {/* General Settings Options List - Flat, clean, cardless style */}
                  <div className="divide-y divide-workshop-border/30 border-b border-workshop-border/20">
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
                  {/* System Diagnostics List - Flat, clean, cardless style */}
                  <div className="divide-y divide-workshop-border/30 border-b border-workshop-border/20">
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

              {viewState === 'whatsapp_presets' && (
                <motion.div
                  key="whatsapp_presets"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  {/* Tab Switcher */}
                  <div className="flex bg-workshop-surface border border-workshop-border/40 p-1 rounded-xl">
                    <button
                      type="button"
                      id="preset-tab-intake"
                      onClick={() => setPresetTab('intake')}
                      className={cn(
                        "flex-1 py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
                        presetTab === 'intake'
                          ? "bg-emerald-500 text-workshop-bg shadow"
                          : "text-workshop-muted hover:text-workshop-text"
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Intake Message</span>
                    </button>
                    <button
                      type="button"
                      id="preset-tab-delivery"
                      onClick={() => setPresetTab('delivery')}
                      className={cn(
                        "flex-1 py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
                        presetTab === 'delivery'
                          ? "bg-emerald-500 text-workshop-bg shadow"
                          : "text-workshop-muted hover:text-workshop-text"
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Delivery Message</span>
                    </button>
                  </div>

                  {/* Section Guidance & Reset */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-workshop-text uppercase tracking-wider">
                          {presetTab === 'intake' ? 'Vehicle Intake Registration Preset' : 'Service Delivery & Completion Preset'}
                        </h3>
                        <p className="text-xs text-workshop-muted mt-0.5">
                          {presetTab === 'intake'
                            ? 'Sent or opened when registering a vehicle for service intake.'
                            : 'Sent or opened when completing a service job and issuing final bill.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetPresets}
                        className="text-xs font-bold text-workshop-muted hover:text-status-urgent transition-colors flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-workshop-surface border border-workshop-border/40 rounded-lg"
                        title="Reset current template to system default"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                      </button>
                    </div>

                    {/* Available Placeholders (Click to insert) */}
                    <div className="space-y-2 bg-workshop-surface/60 border border-workshop-border/30 p-3.5 rounded-xl">
                      <span className="text-[10px] font-bold text-workshop-muted uppercase tracking-wider block">
                        Available Variables (Click to insert into template):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(presetTab === 'intake' ? [
                          { tag: '{customer_name}', label: 'Customer Name' },
                          { tag: '{vehicle_make}', label: 'Vehicle Make' },
                          { tag: '{vehicle_model}', label: 'Vehicle Model' },
                          { tag: '{vehicle_plate}', label: 'Plate Number' },
                          { tag: '{job_description}', label: 'Job Details' },
                        ] : [
                          { tag: '{customer_name}', label: 'Customer Name' },
                          { tag: '{vehicle_title}', label: 'Vehicle Title' },
                          { tag: '{vehicle_make}', label: 'Vehicle Make' },
                          { tag: '{vehicle_model}', label: 'Vehicle Model' },
                          { tag: '{vehicle_plate}', label: 'Plate Number' },
                          { tag: '{job_description}', label: 'Job Details' },
                          { tag: '{parts_list}', label: 'Parts Used List' },
                          { tag: '{labor_cost}', label: 'Labor Cost' },
                          { tag: '{total_cost}', label: 'Total Amount' },
                        ]).map(({ tag, label }) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleInsertVariable(tag)}
                            className="px-2.5 py-1 bg-workshop-surface hover:bg-emerald-500/10 border border-workshop-border/60 hover:border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 rounded-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                            title={`Click to append ${tag}`}
                          >
                            <span>{tag}</span>
                            <span className="text-[9px] text-workshop-muted font-sans font-normal">({label})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Message Editor Textarea */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider block">
                      Message Template Text
                    </label>
                    <textarea
                      rows={8}
                      value={presetTab === 'intake' ? intakeTemplate : deliveryTemplate}
                      onChange={(e) => {
                        if (presetTab === 'intake') setIntakeTemplate(e.target.value);
                        else setDeliveryTemplate(e.target.value);
                      }}
                      placeholder="Enter WhatsApp template message..."
                      className="w-full bg-workshop-surface border border-workshop-border/60 p-4 rounded-xl text-xs font-mono leading-relaxed text-workshop-text focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Live Message Preview */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-workshop-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Live WhatsApp Message Preview</span>
                    </span>
                    <div className="bg-[#0b141a] border border-[#222d34] p-4 rounded-xl font-sans text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed relative overflow-hidden shadow-inner">
                      <div className="text-[10px] font-mono text-[#8696a0] mb-2 uppercase tracking-wider font-bold">Sample Live Preview</div>
                      <div className="bg-[#005c4b] text-[#e9edef] p-3.5 rounded-lg max-w-full font-sans leading-relaxed border border-[#005c4b]/50 shadow">
                        {presetTab === 'intake' ? (
                          formatIntakeMessage(intakeTemplate, {
                            customerName: 'Rahul Sharma',
                            vehicleMake: 'BMW',
                            vehicleModel: 'M3 Competition',
                            vehiclePlate: 'KA-01-AB-1234',
                            jobDescription: 'Full synthetic oil change, brake pad inspection & alignment check',
                          })
                        ) : (
                          formatDeliveryMessage(deliveryTemplate, {
                            customerName: 'Rahul Sharma',
                            vehicleTitle: 'BMW M3 Competition',
                            vehicleMake: 'BMW',
                            vehicleModel: 'M3 Competition',
                            vehiclePlate: 'KA-01-AB-1234',
                            partsList: '1. Brembo Front Brake Pads (x2) - ₹8,500.00\n2. Engine Oil 5W40 (x4L) - ₹3,200.00',
                            laborCost: '₹2,500.00',
                            totalCost: '₹14,200.00',
                            jobDescription: 'Full synthetic oil change, brake pad inspection & alignment check',
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Save Actions Bar */}
                  <div className="pt-4 flex items-center justify-between border-t border-workshop-border/20">
                    <button
                      type="button"
                      onClick={() => setViewState('categories')}
                      className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-workshop-muted hover:text-workshop-text transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingPresets}
                      onClick={handleSavePresets}
                      className="px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-500 text-workshop-bg hover:brightness-110 shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      {savingPresets ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Save Presets</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Tags View */}
              {viewState === 'tags' && (
                <motion.div
                  key="tags"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  {/* Create New Tag */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider block">Create New Tag</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').substring(0, 20))}
                        placeholder="New tag name (e.g. admin, mechanic)"
                        className="flex-1 bg-workshop-surface border border-workshop-border/60 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-workshop-text focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 outline-none transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateTag();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateTag}
                        className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Tag</span>
                      </button>
                    </div>
                  </div>

                  {/* Tags List */}
                  <div className="space-y-4 pt-2">
                    <label className="text-xs font-bold text-workshop-muted uppercase tracking-wider block">Manage Tags</label>
                    
                    {availableTags.length === 0 ? (
                      <div className="py-12 text-center text-workshop-muted text-xs font-bold uppercase tracking-wider border border-dashed border-workshop-border/30 rounded-xl">
                        No tags created yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-workshop-border/20 border-y border-workshop-border/20">
                        {availableTags.map(tag => {
                          const assignedAdvisors = users.filter(u => u.tags?.includes(tag));
                          return (
                            <div key={tag} className="py-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-black uppercase tracking-wider rounded-md">
                                  {tag}
                                </span>
                                <span className="text-xs text-workshop-muted font-mono">
                                  ({assignedAdvisors.length} {assignedAdvisors.length === 1 ? 'advisor' : 'advisors'})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTag(tag)}
                                className="p-1.5 text-workshop-muted hover:text-status-urgent transition-colors rounded cursor-pointer"
                                title={`Delete tag "${tag}"`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Performance View */}
              {viewState === 'performance' && (
                <motion.div
                  key="performance"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  {/* Filter & Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-workshop-surface/60 border border-workshop-border/30 p-3 rounded-xl">
                    <span className="text-xs font-bold text-workshop-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Time Range Filter</span>
                    </span>

                    <div className="flex items-center gap-1.5 bg-workshop-surface border border-workshop-border/40 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPerfTimeRange('all')}
                        className={cn(
                          "px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                          perfTimeRange === 'all'
                            ? "bg-cyan-500 text-workshop-bg shadow"
                            : "text-workshop-muted hover:text-workshop-text"
                        )}
                      >
                        All Time
                      </button>
                      <button
                        type="button"
                        onClick={() => setPerfTimeRange('30days')}
                        className={cn(
                          "px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                          perfTimeRange === '30days'
                            ? "bg-cyan-500 text-workshop-bg shadow"
                            : "text-workshop-muted hover:text-workshop-text"
                        )}
                      >
                        Last 30 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setPerfTimeRange('month')}
                        className={cn(
                          "px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                          perfTimeRange === 'month'
                            ? "bg-cyan-500 text-workshop-bg shadow"
                            : "text-workshop-muted hover:text-workshop-text"
                        )}
                      >
                        This Month
                      </button>
                    </div>
                  </div>

                  {loadingPerformance ? (
                    <div className="py-16 text-center text-workshop-muted text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      <span>Calculating Technician Metrics...</span>
                    </div>
                  ) : (
                    <>
                      {/* Overview Summary Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-workshop-surface border border-workshop-border/30 p-4 rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-workshop-muted">Completed Jobs</p>
                            <p className="text-lg font-black font-mono text-workshop-text">
                              {techPerformanceData.reduce((acc, t) => acc + t.completed, 0)}
                            </p>
                          </div>
                        </div>

                        <div className="bg-workshop-surface border border-workshop-border/30 p-4 rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                            <Wrench className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-workshop-muted">Active Jobs</p>
                            <p className="text-lg font-black font-mono text-workshop-text">
                              {techPerformanceData.reduce((acc, t) => acc + t.inProgress + t.pending, 0)}
                            </p>
                          </div>
                        </div>

                        <div className="bg-workshop-surface border border-workshop-border/30 p-4 rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-workshop-muted">Revenue Generated</p>
                            <p className="text-lg font-black font-mono text-workshop-text">
                              ₹{techPerformanceData.reduce((acc, t) => acc + t.totalRevenue, 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Performance Chart */}
                      <div className="bg-workshop-surface border border-workshop-border/30 p-5 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-workshop-text uppercase tracking-wider flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-cyan-400" />
                            <span>Jobs Completed vs Active per Technician</span>
                          </h3>
                        </div>

                        {techPerformanceData.length === 0 ? (
                          <div className="py-12 text-center text-workshop-muted text-xs font-bold uppercase tracking-wider border border-dashed border-workshop-border/20 rounded-lg">
                            No technician service records found for selected period.
                          </div>
                        ) : (
                          <div className="h-64 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={techPerformanceData.map(t => ({
                                  name: t.name,
                                  Completed: t.completed,
                                  Active: t.inProgress + t.pending,
                                }))}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} allowDecimals={false} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: '#131b23',
                                    borderColor: 'rgba(255,255,255,0.15)',
                                    color: '#f8fafc',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}
                                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                <Bar dataKey="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="Active" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={28} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* Technician Detailed Breakdown Table / List */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-workshop-muted uppercase tracking-wider block">
                          Detailed Performance Breakdown
                        </h3>

                        {techPerformanceData.length === 0 ? (
                          <div className="py-8 text-center text-workshop-muted text-xs font-bold uppercase tracking-wider border border-dashed border-workshop-border/30 rounded-xl">
                            No technician data available.
                          </div>
                        ) : (
                          <div className="divide-y divide-workshop-border/20 border-y border-workshop-border/20">
                            {techPerformanceData.map(tech => {
                              const completionRate = tech.total > 0 ? Math.round((tech.completed / tech.total) * 100) : 0;
                              return (
                                <div key={tech.id} className="py-4 space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                                        {tech.name.substring(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-xs font-bold text-workshop-text leading-tight">{tech.name}</p>
                                        <p className="text-[10px] text-workshop-muted font-mono">{tech.total} total assigned work orders</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs font-mono font-bold">
                                      <div className="text-right">
                                        <span className="text-[10px] uppercase font-sans text-workshop-muted block">Completed</span>
                                        <span className="text-status-success">{tech.completed}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[10px] uppercase font-sans text-workshop-muted block">Active</span>
                                        <span className="text-cyan-400">{tech.inProgress + tech.pending}</span>
                                      </div>
                                      <div className="text-right pl-2 border-l border-workshop-border/20">
                                        <span className="text-[10px] uppercase font-sans text-workshop-muted block">Revenue</span>
                                        <span className="text-emerald-400">₹{tech.totalRevenue.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Completion Progress Bar */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono text-workshop-muted">
                                      <span>Completion Rate</span>
                                      <span className="font-bold text-workshop-text">{completionRate}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-workshop-surface border border-workshop-border/40 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-cyan-500 to-status-success transition-all duration-500 rounded-full"
                                        style={{ width: `${completionRate}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

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
    </div>
  );
}

export function SettingsModal() {
  return <SettingsPage />;
}

