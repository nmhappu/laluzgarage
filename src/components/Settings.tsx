import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Database, 
  Download, 
  Upload,
  Settings as SettingsIcon,
  Clock,
  Plus,
  Mail,
  Lock,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { Portal } from './Portal';
import type { WorkshopUser, UserRole } from '../types';

export function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'database'>('profile');

  const tabs = [
    { id: 'profile', label: 'Operator Profile', icon: User },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
    { id: 'database', label: 'Database & Sync', icon: Database },
  ];

  const roles = [
    { id: 'admin', label: 'Administrator', desc: 'Full system access and data deletion rights', color: 'text-rose-500' },
    { id: 'manager', label: 'Service Manager', desc: 'Manage customers and job cards. No deletions.', color: 'text-workshop-accent' },
    { id: 'technician', label: 'Technician', desc: 'Update work status and parts. Limited client view.', color: 'text-blue-400' },
  ];

  const [team, setTeam] = React.useState<WorkshopUser[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<WorkshopUser | null>(null);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    password: '',
    role: 'technician' as UserRole
  });

  React.useEffect(() => {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WorkshopUser[];
      setTeam(users);
    }, (error) => {
      console.error("Error fetching team:", error);
      handleFirestoreError(error, 'list', 'users');
    });
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users'), {
        ...newMember,
        status: 'offline',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowAddMember(false);
      setNewMember({ name: '', email: '', password: '', role: 'technician' });
    } catch (e: unknown) {
      handleFirestoreError(e, 'create', 'users');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      await deleteDoc(doc(db, 'users', memberId));
      setShowDeleteConfirm(null);
    } catch (e: unknown) {
      handleFirestoreError(e, 'delete', `users/${memberId}`);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-workshop-accent/10 rounded-xl flex items-center justify-center border border-workshop-accent/20 shadow-sm">
          <SettingsIcon className="w-6 h-6 text-workshop-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-workshop-text tracking-tight uppercase">Workshop Settings</h1>
          <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest mt-1">Configure system behavior and data rules</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'profile' | 'security' | 'database')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border",
                activeTab === tab.id 
                  ? "bg-workshop-accent border-workshop-accent text-workshop-bg shadow-lg shadow-workshop-accent/20" 
                  : "bg-workshop-surface border-workshop-border text-workshop-muted hover:text-workshop-text hover:border-workshop-accent/30"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-workshop-card rounded-xl border border-workshop-border p-6 md:p-8 space-y-8 shadow-sm"
              >
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-workshop-surface rounded-2xl border-2 border-workshop-accent/20 flex items-center justify-center overflow-hidden shadow-inner">
                    {auth.currentUser?.photoURL ? (
                      <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-workshop-muted" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-workshop-text uppercase tracking-tight">{auth.currentUser?.displayName || 'Operator'}</h2>
                    <p className="text-workshop-muted font-mono text-sm opacity-60 underline decoration-workshop-accent/30 underline-offset-4">{auth.currentUser?.email}</p>
                    <div className="inline-block px-3 py-1 bg-workshop-accent/10 text-workshop-accent rounded text-[10px] font-black uppercase tracking-widest mt-3 border border-workshop-accent/20">
                      Super Admin (Project Owner)
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted ml-1">Operator Display Name</label>
                    <input 
                      disabled
                      className="w-full bg-workshop-surface/50 border border-workshop-border px-4 py-3 rounded-xl text-workshop-text font-bold uppercase tracking-tight cursor-not-allowed opacity-60"
                      value={auth.currentUser?.displayName || 'NOT SET'}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted ml-1">Authentication Provider</label>
                    <div className="w-full bg-workshop-surface/50 border border-workshop-border px-4 py-3 rounded-xl text-workshop-muted font-bold uppercase tracking-tight opacity-60">
                      {auth.currentUser?.providerData[0]?.providerId || 'internal'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="bg-workshop-card rounded-xl border border-workshop-border p-6 md:p-8 shadow-sm">
                  <h3 className="text-lg font-black text-workshop-text uppercase tracking-tight mb-6 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-workshop-accent" />
                    Internal Role Definitions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {roles.map((role) => (
                      <div key={role.id} className="p-5 bg-workshop-surface rounded-xl border border-workshop-border hover:border-workshop-accent/30 transition-all font-bold">
                        <div className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-3", role.color)}>
                          {role.label}
                        </div>
                        <p className="text-[11px] text-workshop-muted leading-relaxed uppercase tracking-wider opacity-70">
                          {role.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-workshop-card rounded-xl border border-workshop-border p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                      <h3 className="text-lg font-black text-workshop-text uppercase tracking-tight">Team Management</h3>
                      <p className="text-workshop-muted text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">Platform access granularity control</p>
                    </div>
                    <button 
                      onClick={() => setShowAddMember(true)}
                      className="px-5 py-2.5 bg-workshop-accent/10 text-workshop-accent border border-workshop-accent/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-workshop-accent hover:text-workshop-bg transition-all shadow-lg shadow-workshop-accent/10"
                    >
                      Add Team Member
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-workshop-surface/30 rounded-xl border border-workshop-border overflow-hidden">
                      <thead className="bg-workshop-surface text-workshop-muted text-[10px] font-black uppercase tracking-[0.2em] border-b border-workshop-border font-bold">
                        <tr>
                          <th className="px-6 py-4">Technician/Advisor</th>
                          <th className="px-6 py-4">System Role</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-workshop-border/30">
                        {team.map((member) => (
                          <tr key={member.id} className="group hover:bg-workshop-surface/50 transition-colors">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-workshop-card rounded-xl border border-workshop-border flex items-center justify-center font-black text-workshop-accent text-sm shadow-sm group-hover:border-workshop-accent/50 transition-all">
                                  {member.name[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-black text-workshop-text text-sm uppercase tracking-tight">{member.name}</p>
                                  <p className="text-[10px] text-workshop-muted font-mono opacity-60">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border",
                                member.role === 'admin' ? "text-rose-500 bg-rose-500/10 border-rose-500/20" :
                                member.role === 'manager' ? "text-workshop-accent bg-workshop-accent/10 border-workshop-accent/20" :
                                "text-blue-400 bg-blue-400/10 border-blue-400/20"
                              )}>
                                {roles.find(r => r.id === member.role)?.label || member.role}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                               <button 
                                 onClick={() => setShowDeleteConfirm(member)}
                                 className="text-workshop-muted hover:text-rose-500 transition-colors p-2"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-6 border-2 border-dashed border-workshop-border rounded-xl bg-workshop-surface/20 flex items-center gap-6">
                   <div className="w-12 h-12 bg-workshop-card rounded-xl border border-workshop-border flex items-center justify-center">
                     <Clock className="w-6 h-6 text-workshop-muted opacity-40" />
                   </div>
                   <div className="flex-1">
                      <p className="text-[10px] font-black text-workshop-muted uppercase tracking-widest mb-1">Access Logs arriving soon</p>
                      <p className="text-[10px] text-workshop-muted font-bold opacity-40 uppercase tracking-widest">Digital footprint tracking for sensitive workshop operations will be available in v1.1.0</p>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'database' && (
              <motion.div
                key="database"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-workshop-card rounded-xl border border-workshop-border p-6 md:p-8 space-y-8 shadow-sm"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-5 p-5 bg-workshop-surface rounded-xl border border-workshop-border shadow-inner">
                    <div className="p-4 bg-workshop-accent/10 text-workshop-accent rounded-2xl border border-workshop-accent/20">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-workshop-text uppercase tracking-tight text-sm">Firestore Connectivity</h4>
                      <p className="text-[10px] font-black text-workshop-accent uppercase tracking-widest mt-1">Status: Cluster operational</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-workshop-surface rounded-xl border border-workshop-border space-y-4 hover:border-workshop-accent/30 transition-all">
                      <div className="flex items-center gap-2 text-workshop-accent mb-2">
                        <Download className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Export Dataset</span>
                      </div>
                      <p className="text-[11px] text-workshop-muted leading-relaxed font-bold uppercase tracking-wider opacity-70">
                        Export your entire workshop ledger to JSON or professional CSV formats for local auditing.
                      </p>
                      <button className="w-full py-3 bg-workshop-bg border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest text-workshop-text hover:bg-workshop-accent hover:text-workshop-bg transition-all active:scale-95">
                        Download Inventory Backup
                      </button>
                    </div>

                    <div className="p-6 bg-workshop-surface rounded-xl border border-workshop-border space-y-4 hover:border-blue-400/30 transition-all">
                      <div className="flex items-center gap-2 text-blue-400 mb-2">
                        <Upload className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Import Engine</span>
                      </div>
                      <p className="text-[11px] text-workshop-muted leading-relaxed font-bold uppercase tracking-wider opacity-70">
                        Batch import legacy CSV spreadsheets containing customer details or vehicle inventory models.
                      </p>
                      <button className="w-full py-3 bg-workshop-bg border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest text-workshop-text hover:border-blue-400/50 hover:bg-blue-400/10 transition-all active:scale-95">
                        Initialize CSV Mapping
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <Portal>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddMember(false)}
                className="absolute inset-0 bg-workshop-bg/60 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-workshop-card w-full max-w-md rounded-2xl border border-workshop-border shadow-2xl p-8"
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-xl font-black text-workshop-text uppercase tracking-tight">Onboard Member</h2>
                    <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest mt-1">Assign system permissions</p>
                  </div>
                  <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-workshop-surface rounded-xl transition-colors text-workshop-muted">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddMember} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-workshop-muted ml-1">Full Identity</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                        <input 
                          required
                          type="text"
                          placeholder="e.g. John Mechanic"
                          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-3 rounded-xl text-workshop-text font-bold uppercase tracking-tight focus:border-workshop-accent/50 focus:ring-4 focus:ring-workshop-accent/5 transition-all"
                          value={newMember.name}
                          onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-workshop-muted ml-1">Work Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                        <input 
                          required
                          type="email"
                          placeholder="john@workshop.com"
                          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-3 rounded-xl text-workshop-text font-bold focus:border-workshop-accent/50 focus:ring-4 focus:ring-workshop-accent/5 transition-all font-mono text-sm"
                          value={newMember.email}
                          onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-workshop-muted ml-1">Access Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                        <input 
                          required
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-3 rounded-xl text-workshop-text font-bold focus:border-workshop-accent/50 focus:ring-4 focus:ring-workshop-accent/5 transition-all"
                          value={newMember.password}
                          onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-workshop-muted ml-1">System Role</label>
                      <div className="grid grid-cols-3 gap-2">
                        {roles.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setNewMember({ ...newMember, role: role.id as UserRole })}
                            className={cn(
                              "px-3 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                              newMember.role === role.id 
                                ? "bg-workshop-accent border-workshop-accent text-workshop-bg shadow-lg shadow-workshop-accent/20" 
                                : "bg-workshop-surface border-workshop-border text-workshop-muted hover:border-workshop-accent/30"
                            )}
                          >
                            {role.label.split(' ')[1] || role.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-workshop-accent text-workshop-bg rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-workshop-accent/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Register Member
                  </button>
                </form>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <Portal>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeleteConfirm(null)}
                className="absolute inset-0 bg-workshop-bg/60 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-workshop-card w-full max-sm:max-w-xs max-w-sm rounded-2xl p-8 shadow-2xl border border-workshop-border text-center"
              >
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 border border-rose-500/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                
                <h2 className="text-xl font-black text-workshop-text uppercase tracking-tight mb-2">Revoke Access?</h2>
                <p className="text-workshop-muted text-sm mb-8 leading-relaxed">
                  Are you sure you want to remove <span className="text-workshop-text font-bold">{showDeleteConfirm.name}</span> from the workshop? This will immediately terminate their access.
                </p>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-3 bg-workshop-surface text-workshop-muted rounded-xl text-[10px] font-black uppercase tracking-widest border border-workshop-border hover:text-workshop-text transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDeleteMember(showDeleteConfirm.id)}
                    className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 hover:bg-rose-700 transition-all font-black text-white"
                  >
                    Revoke
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
