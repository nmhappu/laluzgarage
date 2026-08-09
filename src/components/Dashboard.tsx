import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { ClipboardList, PlusCircle, Car, Clock, Package, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { ServiceRecord, Customer, Vehicle } from '../types';

interface HistoryItem {
  date: string;
  value: number;
}

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

  const getHistoryData = <T,>(records: T[], dateField: keyof T, filter?: (r: T) => boolean): HistoryItem[] => {
    const days = 14;
    const history = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      
      const count = records.filter(r => {
        const rDateRaw = r[dateField] as unknown as { toDate?: () => Date } | string | null;
        let rDateStr = '';
        if (rDateRaw && typeof rDateRaw !== 'string' && rDateRaw.toDate) { // Firestore Timestamp
          rDateStr = format(rDateRaw.toDate(), 'yyyy-MM-dd');
        } else if (typeof rDateRaw === 'string') {
          rDateStr = rDateRaw.split('T')[0];
        }
        
        const matchesDate = rDateStr === dateStr;
        return matchesDate && (filter ? filter(r) : true);
      }).length;
      
      history.push({ date: dateStr, value: count });
    }
    return history;
  };

  /**
   * Fetches all necessary data to populate the dashboard metrics and activity feed.
   * Joins Customers, Vehicles, and Service Records in-memory.
   */
  const fetchDashboardData = async () => {
    try {
      const customersSnap = await getDocs(collection(db, 'customers'));
      const servicesSnap = await getDocs(collection(db, 'serviceRecords'));
      const vehiclesSnap = await getDocs(collection(db, 'vehicles'));

      const customers = customersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      const vehicles = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
      const serviceRecords = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
      
      // Merge data for display
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
      
      // Calculate Metrics
      const totalCustomers = customersSnap.size;
      const totalVehicles = vehiclesSnap.size;
      const totalServices = enrichedRecords.length;

      const pendingJobs = enrichedRecords.filter((s) => s.status === 'pending' || s.status === 'in-progress');
      
      // Count parts used as surrogate for "issues addressed"
      const issuesAttended = enrichedRecords.reduce((acc, curr) => {
        return acc + (curr.partsUsed?.length || 0);
      }, 0);

      const completedWorks = enrichedRecords.filter(s => s.status === 'completed').length;

      // Calculate 7-day histories
      const customerHistory = getHistoryData(customers, 'createdAt');
      const vehicleHistory = getHistoryData(vehicles, 'createdAt');
      const servicesHistory = getHistoryData(enrichedRecords, 'date');
      const pendingHistory = getHistoryData(enrichedRecords, 'date', (r) => r.status === 'pending' || r.status === 'in-progress');
      const completedHistory = getHistoryData(enrichedRecords, 'date', (r) => r.status === 'completed');
      
      // For issues, we need to count parts per day
      const issuesHistory = [];
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const count = enrichedRecords.filter(r => r.date?.split('T')[0] === dateStr)
          .reduce((acc, curr) => acc + (curr.partsUsed?.length || 0), 0);
        issuesHistory.push({ date: dateStr, value: count });
      }

      // Sort activities: most recent first
      const allActivities = enrichedRecords
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });

      setMetrics({
        totalCustomers,
        totalVehicles,
        totalServices,
        pendingWorks: pendingJobs.length,
        issuesAttended,
        completedWorks,
        history: {
          customers: customerHistory,
          vehicles: vehicleHistory,
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

  const itemVariants = {
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
          <motion.div 
            key={stat.label}
            variants={itemVariants}
            onClick={() => {
              if (stat.target) {
                navigate(stat.target, { state: stat.state });
              }
            }}
            className={cn(
              "flex items-center justify-between px-4 md:px-8 lg:px-10 py-6 md:py-8 hover:bg-workshop-surface transition-colors group border-b border-workshop-border/30 accelerate-gpu will-change-transform-opacity",
              stat.target && "cursor-pointer active:scale-[0.99] select-none"
            )}
          >
            <div className="flex-1 flex items-center gap-4">
              <div className={cn("w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-110", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-workshop-text mb-1 font-google-sans">
                  {stat.label}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-workshop-text tracking-tighter font-google-sans">
                    {stat.value}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="relative w-24 md:w-32 lg:w-40 h-10 min-w-[96px] overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity shrink-0 pointer-events-none"
              style={{
                maskImage:
                  'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
              }}
            >
              {isMounted && stat.trend.length > 0 && (
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={stat.trend}>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="currentColor"
                      strokeWidth={2}
                      fill="transparent"
                      className={stat.color}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
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
                        {job.plateNumber} • {job.customerName}
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
                        <span className="text-[9px] font-black uppercase tracking-widest text-right font-google-sans" style={{ fontFamily: "'Google Sans', sans-serif" }}>
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
