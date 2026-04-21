import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { ClipboardList, PlusCircle, Car, Clock, Package, Database, Trash2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ServiceIntake } from './ServiceIntake';
import { seedDummyData, clearExistingUserData } from '../lib/seedData';
import type { ServiceRecord, Customer, Vehicle } from '../types';

export function Dashboard() {
  const [showIntake, setShowIntake] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<ServiceRecord[]>([]);
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    pendingWorks: 0,
    issuesAttended: 0
  });

  const handleSeed = async () => {
    setIsSeeding(true);
    setShowSeedConfirm(false);
    try {
      await seedDummyData();
      await fetchDashboardData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    setShowClearConfirm(false);
    try {
      await clearExistingUserData();
      await fetchDashboardData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsClearing(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const customersSnap = await getDocs(collection(db, 'customers'));
      const servicesSnap = await getDocs(collection(db, 'serviceRecords'));
      const vehiclesSnap = await getDocs(collection(db, 'vehicles'));

      const customers = customersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      const vehicles = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
      const serviceRecords = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
      
      const enrichedRecords = serviceRecords.map(record => {
        const vehicle = vehicles.find(v => v.id === record.vehicleId);
        const customer = customers.find(c => c.id === record.customerId);
        
        return {
          ...record,
          make: vehicle?.make || 'Unknown',
          model: vehicle?.model || 'Vehicle',
          plateNumber: vehicle?.plateNumber || 'N/A',
          customerName: customer?.name || 'Unknown Customer',
          technicianName: record.technicianName || 'Unknown Advisor'
        };
      });
      
      // Total Customers
      const totalCustomers = customersSnap.size;

      // Pending Works (Status 'pending' or 'in-progress')
      const pendingJobs = enrichedRecords.filter((s) => s.status === 'pending' || s.status === 'in-progress');
      
      // Issues Attended (1 part = 1 issue)
      const issuesAttended = enrichedRecords.reduce((acc, curr) => {
        return acc + (curr.partsUsed?.length || 0);
      }, 0);

      // Pending Services Logs (Oldest First)
      const queue = enrichedRecords
        .filter((s) => s.status === 'pending')
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB;
        });

      setMetrics({
        totalCustomers,
        pendingWorks: pendingJobs.length,
        issuesAttended
      });
      setPendingQueue(queue as ServiceRecord[]);

    } catch (e: unknown) {
      console.error(e);
      if (e && typeof e === 'object' && 'code' in e && e.code === 'permission-denied') {
         handleFirestoreError(e, 'list', 'dashboard_data');
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = [
    { label: 'Total Customers', value: metrics.totalCustomers, trend: '+33.45%', isUp: true },
    { label: 'Pending Works', value: metrics.pendingWorks, trend: '-112.45%', isUp: false },
    { label: 'Issues Attended', value: metrics.issuesAttended, trend: '+62.52%', isUp: true },
    { label: 'Shared Inventory', value: '1,240', trend: '+4.46%', isUp: true },
  ];

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-workshop-text tracking-tighter uppercase">Dashboard</h1>
        </div>
        <button 
          onClick={() => setShowIntake(true)}
          className="flex items-center gap-2 px-6 py-4 bg-workshop-accent text-workshop-bg text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-workshop-accent/10 hover:bg-emerald-500 transition-all active:scale-95 group"
        >
          <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Add To Queue
        </button>
      </header>

      <AnimatePresence>
        {showIntake && (
          <ServiceIntake 
            onClose={() => setShowIntake(false)} 
            onSuccess={fetchDashboardData}
          />
        )}
      </AnimatePresence>

      {/* Precision Metrics Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-workshop-card/80 backdrop-blur-md rounded-xl border border-workshop-border flex flex-col md:flex-row shadow-2xl overflow-hidden"
      >
        {stats.map((stat, i) => (
          <div 
            key={stat.label}
            className={cn(
              "flex-1 p-8 md:p-10 flex flex-col gap-3 relative",
              i !== stats.length - 1 && "md:after:absolute md:after:right-0 md:after:top-8 md:after:bottom-8 md:after:w-px md:after:bg-workshop-border",
              i !== stats.length - 1 && "after:absolute after:bottom-0 after:left-8 after:right-8 after:h-px after:bg-workshop-border md:after:hidden"
            )}
          >
            <p className="text-workshop-muted text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
              {stat.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-black text-workshop-text tracking-tighter">
                {stat.value}
              </span>
              {stat.label === 'Shared Inventory' && <span className="text-xs font-bold text-workshop-muted/50 uppercase ml-1">Parts</span>}
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <div className="flex items-center justify-center transition-transform hover:scale-110">
                {stat.isUp ? (
                  <motion.svg 
                    initial={{ y: 2, x: -2 }}
                    animate={{ y: 0, x: 0 }}
                    viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-400 fill-current"
                  >
                    <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M7 17l10-10M10 7h7v7"/>
                  </motion.svg>
                ) : (
                  <motion.svg 
                    initial={{ y: -2, x: -2 }}
                    animate={{ y: 0, x: 0 }}
                    viewBox="0 0 24 24" className="w-3.5 h-3.5 text-rose-400 fill-current"
                  >
                    <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M17 10v7h-7"/>
                  </motion.svg>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                stat.isUp ? "text-emerald-400" : "text-rose-400"
              )}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Older Pending Services Log */}
      <div className="bg-workshop-card rounded-xl border border-workshop-border overflow-hidden">
        <div className="px-8 py-6 border-b border-workshop-border flex items-center justify-between bg-workshop-surface/30">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-4 h-4 text-workshop-warning" />
            <h2 className="font-black text-workshop-text uppercase text-[10px] tracking-[0.2em]">Pending Service Logs <span className="opacity-40 ml-2 font-bold">(Oldest First)</span></h2>
          </div>
          <button 
            onClick={() => window.location.href='/services'}
            className="text-[10px] font-black uppercase tracking-widest text-workshop-muted hover:text-workshop-accent transition-colors"
          >
            View All
          </button>
        </div>
        
        <div className="p-8">
          {pendingQueue.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingQueue.map((job, idx) => (
                <motion.div 
                  key={job.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-5 bg-workshop-bg rounded-xl border border-workshop-border hover:border-workshop-accent/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-workshop-card rounded-xl border border-workshop-border flex items-center justify-center text-workshop-muted">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-workshop-text uppercase tracking-tight">{job.make} {job.model}</p>
                      <p className="text-[10px] text-workshop-muted font-bold tracking-widest uppercase opacity-70">
                        {job.plateNumber} • {job.customerName}
                      </p>
                      {job.technicianName && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-[8px] text-workshop-accent font-black uppercase tracking-widest opacity-60">
                            Adv: {job.technicianName}
                          </p>
                          {job.expectedDeliveryDate && (
                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-workshop-warning">
                              <div className="w-1 h-1 rounded-full bg-workshop-warning animate-pulse" />
                              <span>Due: {format(new Date(job.expectedDeliveryDate), 'dd MMM')} ({Math.max(0, Math.ceil((new Date(job.expectedDeliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}d)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-workshop-warning">
                      <Clock className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Service</span>
                    </div>
                    <p className="text-[9px] text-workshop-muted mt-2 font-bold opacity-40 uppercase">
                      ID: #{job.id.slice(-4)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 opacity-10">
              <Package className="w-16 h-16 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">No pending jobs in logs</p>
            </div>
          )}
        </div>
      </div>
      {/* System Maintenance Section */}
      <div className="pt-12 pb-32 mt-12 border-t border-workshop-border/30 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 bg-workshop-surface/20 rounded-xl border border-workshop-border/50 border-dashed">
          <div>
            <h3 className="text-xs font-black text-workshop-text uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-workshop-secondary" />
              Developer Tools
            </h3>
            <p className="text-[10px] font-medium text-workshop-muted uppercase tracking-tight">
              Manage database state for testing and demonstration purposes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 relative z-50">
            {!showSeedConfirm ? (
              <button
                onClick={() => setShowSeedConfirm(true)}
                disabled={isSeeding || isClearing}
                className="flex items-center gap-2 px-4 py-2 bg-workshop-surface border border-workshop-border rounded-lg text-[10px] font-black uppercase tracking-widest text-workshop-text hover:bg-workshop-accent hover:text-workshop-bg transition-all disabled:opacity-50"
              >
                {isSeeding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                {isSeeding ? 'Seeding...' : 'Seed Dummy Data'}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-workshop-surface p-1 rounded-lg border border-workshop-accent/30 shadow-xl">
                <span className="text-[9px] font-black uppercase tracking-tighter px-2 text-workshop-muted">Add dummy data?</span>
                <button 
                  onClick={handleSeed}
                  className="px-3 py-1 bg-workshop-accent text-workshop-bg rounded font-black text-[10px] uppercase"
                >
                  Confirm
                </button>
                <button 
                  onClick={() => setShowSeedConfirm(false)}
                  className="px-3 py-1 bg-workshop-surface text-workshop-muted rounded font-black text-[10px] uppercase border border-workshop-border"
                >
                  Cancel
                </button>
              </div>
            )}
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={isSeeding || isClearing}
                className="flex items-center gap-2 px-4 py-2 bg-workshop-surface border border-workshop-border rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
              >
                {isClearing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {isClearing ? 'Clearing...' : 'Clear User Data'}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-workshop-surface p-1 rounded-lg border border-rose-500/30 shadow-lg">
                <span className="text-[9px] font-black uppercase tracking-tighter px-2 text-workshop-muted">Delete all data?</span>
                <button 
                  onClick={handleClear}
                  className="px-3 py-1 bg-rose-500 text-white rounded font-black text-[10px] uppercase"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1 bg-workshop-surface text-workshop-muted rounded font-black text-[10px] uppercase border border-workshop-border"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// End of component
