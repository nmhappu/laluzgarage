import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { ClipboardList, PlusCircle, Car, Clock, Package, Users, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ServiceIntake } from './ServiceIntake';
import type { ServiceRecord, Customer, Vehicle } from '../types';

export function Dashboard() {
  const [showIntake, setShowIntake] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<ServiceRecord[]>([]);
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    pendingWorks: 0,
    issuesAttended: 0
  });

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
    { label: 'Total Customers', value: metrics.totalCustomers, icon: Users, color: 'text-blue-400' },
    { label: 'Pending Works', value: metrics.pendingWorks, icon: ClipboardList, color: 'text-workshop-warning' },
    { label: 'Issues Attended', value: metrics.issuesAttended, icon: Wrench, color: 'text-emerald-400' },
    { label: 'Shared Inventory', value: '1,240', icon: Package, color: 'text-workshop-secondary' },
  ];

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-workshop-text tracking-tighter uppercase">Dashboard</h1>
        </div>
        <div className="relative group">
          <div className="absolute inset-0 bg-workshop-accent/20 blur-xl rounded-xl group-hover:bg-workshop-accent/40 transition-all duration-500" />
          <button 
            onClick={() => setShowIntake(true)}
            className="relative flex items-center gap-2 px-6 py-4 bg-workshop-accent text-workshop-bg text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            New Customer
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showIntake && (
          <ServiceIntake 
            onClose={() => setShowIntake(false)} 
            onSuccess={fetchDashboardData}
          />
        )}
      </AnimatePresence>

      {/* Dashboard Watchlist Style */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col"
      >
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className={cn(
              "flex items-center justify-between py-6 md:py-8 hover:bg-white/[0.02] transition-colors group border-b border-workshop-border/30"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn("w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-110", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-workshop-text mb-1">
                  {stat.label}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-workshop-muted/80 tracking-tight">
                    {stat.value}{stat.label === 'Shared Inventory' && ' pts'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Pending Services Log - List Style */}
      <div className="space-y-6 pt-8">
        <h2 className="text-xl font-black text-workshop-text uppercase tracking-tighter">Recent Activities</h2>
        <div className="flex flex-col">
          {pendingQueue.length > 0 ? (
            <>
              {pendingQueue.slice(0, 5).map((job) => (
                <div 
                  key={job.id}
                  className="flex items-center justify-between py-6 hover:bg-white/[0.02] transition-colors group border-b border-workshop-border/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center text-workshop-muted group-hover:text-workshop-accent transition-colors">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-workshop-text uppercase tracking-tight mb-1">{job.make} {job.model}</p>
                      <p className="text-[10px] text-workshop-muted font-bold tracking-widest uppercase opacity-70">
                        {job.plateNumber} • {job.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 text-workshop-warning mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Pending</span>
                      </div>
                      <p className="text-[9px] text-workshop-muted font-bold opacity-40 uppercase">
                        {job.expectedDeliveryDate ? format(new Date(job.expectedDeliveryDate), 'dd MMM') : 'No Date'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Package className="w-16 h-16 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">No pending activities</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// End of component
