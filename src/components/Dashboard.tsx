import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { ClipboardList, PlusCircle, Car, Clock, Package, Wrench } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import type { ServiceRecord, Customer, Vehicle } from '../types';
import { StatTile, type StatTrendItem } from './dashboard/StatTile';

type HistoryItem = StatTrendItem;

export function Dashboard() {
  const navigate = useNavigate();
  const [pendingQueue, setPendingQueue] = useState<ServiceRecord[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    totalVehicles: 0,
    totalServices: 0,
    pendingWorks: 0,
    issuesAttended: 0,
    completedWorks: 0,
    history: {
      customers: [] as HistoryItem[],
      vehicles: [] as HistoryItem[],
      services: [] as HistoryItem[],
      pending: [] as HistoryItem[],
      issues: [] as HistoryItem[],
      completed: [] as HistoryItem[],
    }
  });

  /**
   * Fetches all necessary data to populate the dashboard metrics and activity feed.
   * Joins Customers, Vehicles, and Service Records in-memory using Maps.
   */
  const fetchDashboardData = async () => {
    try {
      const [customersSnap, servicesSnap, vehiclesSnap] = await Promise.all([
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'serviceRecords')),
        getDocs(collection(db, 'vehicles')),
      ]);

      const customers = customersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      const vehicles = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
      const serviceRecords = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));

      const customerMap = new Map<string, Customer>();
      customers.forEach(c => customerMap.set(c.id, c));

      const vehicleMap = new Map<string, Vehicle>();
      vehicles.forEach(v => vehicleMap.set(v.id, v));

      // Build 14-day date keys
      const days = 14;
      const dateKeys: string[] = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dateKeys.push(format(d, 'yyyy-MM-dd'));
      }

      const servicesFreq = new Map<string, number>();
      const pendingFreq = new Map<string, number>();
      const completedFreq = new Map<string, number>();
      const issuesFreq = new Map<string, number>();
      dateKeys.forEach(k => {
        servicesFreq.set(k, 0);
        pendingFreq.set(k, 0);
        completedFreq.set(k, 0);
        issuesFreq.set(k, 0);
      });

      let pendingWorksCount = 0;
      let completedWorksCount = 0;
      let issuesAttendedCount = 0;

      // Single-pass enrichment and metrics calculation
      const enrichedRecords = serviceRecords.map(record => {
        const vehicle = vehicleMap.get(record.vehicleId);
        const customer = customerMap.get(record.customerId);
        
        const isPending = record.status === 'pending' || record.status === 'in-progress';
        const isCompleted = record.status === 'completed';
        const partsCount = record.partsUsed?.length || 0;

        if (isPending) pendingWorksCount++;
        if (isCompleted) completedWorksCount++;
        issuesAttendedCount += partsCount;

        const dateStr = record.date ? record.date.split('T')[0] : '';
        if (servicesFreq.has(dateStr)) {
          servicesFreq.set(dateStr, servicesFreq.get(dateStr)! + 1);
          if (isPending) {
            pendingFreq.set(dateStr, pendingFreq.get(dateStr)! + 1);
          } else if (isCompleted) {
            completedFreq.set(dateStr, completedFreq.get(dateStr)! + 1);
          }
          if (partsCount > 0) {
            issuesFreq.set(dateStr, issuesFreq.get(dateStr)! + partsCount);
          }
        }

        return {
          ...record,
          make: vehicle?.make || 'Unknown',
          model: vehicle?.model || 'Vehicle',
          plateNumber: vehicle?.plateNumber || 'N/A',
          customerName: customer?.name || 'Unknown Customer',
          technicianName: record.technicianName || 'Unknown Advisor'
        };
      });

      const servicesHistory = dateKeys.map(k => ({ date: k, value: servicesFreq.get(k) || 0 }));
      const pendingHistory = dateKeys.map(k => ({ date: k, value: pendingFreq.get(k) || 0 }));
      const completedHistory = dateKeys.map(k => ({ date: k, value: completedFreq.get(k) || 0 }));
      const issuesHistory = dateKeys.map(k => ({ date: k, value: issuesFreq.get(k) || 0 }));

      // Sort activities: most recent first
      const allActivities = enrichedRecords.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

      setMetrics({
        totalCustomers: customersSnap.size,
        totalVehicles: vehiclesSnap.size,
        totalServices: enrichedRecords.length,
        pendingWorks: pendingWorksCount,
        issuesAttended: issuesAttendedCount,
        completedWorks: completedWorksCount,
        history: {
          customers: [],
          vehicles: [],
          services: servicesHistory,
          pending: pendingHistory,
          issues: issuesHistory,
          completed: completedHistory
        }
      });
      setPendingQueue(allActivities as ServiceRecord[]);

    } catch (e: unknown) {
      console.error('Dashboard data fetch error:', e);
      handleFirestoreError(e, 'list', 'dashboard_data');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 200);
    fetchDashboardData();
    return () => clearTimeout(timer);
  }, []);


  const stats = [
    { label: 'Total Services', value: metrics.totalServices, icon: ClipboardList, color: 'text-blue-500', trend: metrics.history.services, target: '/services', state: { activeTab: 'all' } },
    { label: 'Pending Works', value: metrics.pendingWorks, icon: Clock, color: 'text-status-urgent', trend: metrics.history.pending, target: '/services', state: { activeTab: 'pending' } },
    { label: 'Completed Jobs', value: metrics.completedWorks, icon: Package, color: 'text-workshop-accent', trend: metrics.history.completed, target: '/services', state: { activeTab: 'completed' } },
    { label: 'Issues Attended', value: metrics.issuesAttended, icon: Wrench, color: 'text-status-success', trend: metrics.history.issues },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.2, 0, 0, 1.0]
      }
    }
  };

  return (
    <div className="space-y-8 pb-20 font-google-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl md:text-4xl font-black text-workshop-text tracking-tighter uppercase font-google-sans">Dashboard</h1>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-workshop-accent/20 blur-xl rounded group-hover:bg-workshop-accent/40 transition-all duration-500" />
          <button 
            onClick={() => navigate('/intake')}
            className="relative flex items-center gap-2 px-6 py-4 bg-workshop-accent text-workshop-bg text-xs font-black uppercase tracking-widest rounded hover:brightness-110 transition-all active:scale-95 cursor-pointer font-google-sans"
          >
            <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            Vehicle Intake
          </button>
        </motion.div>
      </header>

      {/* Dashboard Watchlist Style */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col -mx-4 md:-mx-8 lg:-mx-10 accelerate-gpu will-change-transform-opacity"
      >
        {stats.map((stat) => (
          <StatTile
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            trend={stat.trend}
            isMounted={isMounted}
            variants={itemVariants}
            onClick={
              stat.target
                ? () => navigate(stat.target, { state: stat.state })
                : undefined
            }
          />
        ))}
      </motion.div>

      {/* Pending Services Log - List Style */}
      <div className="space-y-6 pt-8">
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-black text-workshop-text uppercase tracking-tighter font-google-sans"
        >
          Recent Activities
        </motion.h2>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col -mx-4 md:-mx-8 lg:-mx-10"
        >
          {pendingQueue.length > 0 ? (
            <>
              {pendingQueue.slice(0, 5).map((job) => (
                <motion.div 
                  key={job.id}
                  variants={itemVariants}
                  onClick={() => navigate('/services', { state: { openRecordId: job.id } })}
                  className="flex items-center justify-between px-4 md:px-8 lg:px-10 py-6 hover:bg-workshop-surface transition-colors group border-b border-workshop-border/30 cursor-pointer active:scale-[0.99] select-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center text-workshop-muted group-hover:text-workshop-accent transition-colors">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-workshop-text uppercase tracking-tight mb-1 font-google-sans">{job.make} {job.model}</p>
                      <p className="text-[10px] text-workshop-muted font-bold tracking-widest uppercase opacity-70 font-google-sans">
                        <span className="font-plate font-bold text-secondary">{job.plateNumber}</span> • {job.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={cn(
                        "flex items-center justify-end gap-2 mb-1",
                        job.status === 'completed' ? "text-status-success" :
                        job.status === 'in-progress' ? "text-status-pending" :
                        job.status === 'pending' ? "text-status-urgent" :
                        "text-workshop-muted"
                      )}>
                        <Clock className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-right font-google-sans">
                          {job.status}
                        </span>
                      </div>
                      <p className="text-[9px] text-workshop-muted font-bold opacity-40 uppercase font-google-sans">
                        {job.expectedDeliveryDate ? format(new Date(job.expectedDeliveryDate), 'dd MMM') : 'No Date'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 opacity-20"
            >
              <Package className="w-16 h-16 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs font-google-sans">No pending activities</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// End of component
