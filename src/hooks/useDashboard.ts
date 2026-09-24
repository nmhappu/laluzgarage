import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { ClipboardList, Clock, Package, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import type { ServiceRecord, Customer, Vehicle } from '../types';
import type { StatTrendItem } from '../components/dashboard/StatTile';

export type HistoryItem = StatTrendItem;

export interface EnrichedActivity extends ServiceRecord {
  make?: string;
  model?: string;
  plateNumber?: string;
  customerName?: string;
}

export interface DashboardMetrics {
  totalCustomers: number;
  totalVehicles: number;
  totalServices: number;
  pendingWorks: number;
  issuesAttended: number;
  completedWorks: number;
  history: {
    customers: HistoryItem[];
    vehicles: HistoryItem[];
    services: HistoryItem[];
    pending: HistoryItem[];
    issues: HistoryItem[];
    completed: HistoryItem[];
  };
}

export function useDashboard() {
  const [pendingQueue, setPendingQueue] = useState<EnrichedActivity[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCustomers: 0,
    totalVehicles: 0,
    totalServices: 0,
    pendingWorks: 0,
    issuesAttended: 0,
    completedWorks: 0,
    history: {
      customers: [],
      vehicles: [],
      services: [],
      pending: [],
      issues: [],
      completed: [],
    },
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const [customersSnap, servicesSnap, vehiclesSnap] = await Promise.all([
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'serviceRecords')),
        getDocs(collection(db, 'vehicles')),
      ]);

      const customers = customersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
      const vehicles = vehiclesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle));
      const serviceRecords = servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord));

      const customerMap = new Map<string, Customer>();
      customers.forEach((c) => customerMap.set(c.id, c));

      const vehicleMap = new Map<string, Vehicle>();
      vehicles.forEach((v) => vehicleMap.set(v.id, v));

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
      dateKeys.forEach((k) => {
        servicesFreq.set(k, 0);
        pendingFreq.set(k, 0);
        completedFreq.set(k, 0);
        issuesFreq.set(k, 0);
      });

      let pendingWorksCount = 0;
      let completedWorksCount = 0;
      let issuesAttendedCount = 0;

      // Single-pass enrichment and metrics calculation
      const enrichedRecords = serviceRecords.map((record) => {
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
          servicesFreq.set(dateStr, (servicesFreq.get(dateStr) || 0) + 1);
          if (isPending) {
            pendingFreq.set(dateStr, (pendingFreq.get(dateStr) || 0) + 1);
          } else if (isCompleted) {
            completedFreq.set(dateStr, (completedFreq.get(dateStr) || 0) + 1);
          }
          if (partsCount > 0) {
            issuesFreq.set(dateStr, (issuesFreq.get(dateStr) || 0) + partsCount);
          }
        }

        return {
          ...record,
          make: vehicle?.make || 'Unknown',
          model: vehicle?.model || 'Vehicle',
          plateNumber: vehicle?.plateNumber || 'N/A',
          customerName: customer?.name || 'Unknown Customer',
          technicianName: record.technicianName || 'Unknown Advisor',
        };
      });

      const servicesHistory = dateKeys.map((k) => ({ date: k, value: servicesFreq.get(k) || 0 }));
      const pendingHistory = dateKeys.map((k) => ({ date: k, value: pendingFreq.get(k) || 0 }));
      const completedHistory = dateKeys.map((k) => ({ date: k, value: completedFreq.get(k) || 0 }));
      const issuesHistory = dateKeys.map((k) => ({ date: k, value: issuesFreq.get(k) || 0 }));

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
          completed: completedHistory,
        },
      });
      setPendingQueue(allActivities);
    } catch (e: unknown) {
      console.error('Dashboard data fetch error:', e);
      handleFirestoreError(e, 'list', 'dashboard_data');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 200);
    fetchDashboardData();
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  const stats = [
    {
      label: 'Total Services',
      value: metrics.totalServices,
      icon: ClipboardList,
      color: 'text-blue-500',
      trend: metrics.history.services,
      target: '/services',
      state: { activeTab: 'all' },
    },
    {
      label: 'Pending Works',
      value: metrics.pendingWorks,
      icon: Clock,
      color: 'text-status-urgent',
      trend: metrics.history.pending,
      target: '/services',
      state: { activeTab: 'pending' },
    },
    {
      label: 'Completed Jobs',
      value: metrics.completedWorks,
      icon: Package,
      color: 'text-workshop-accent',
      trend: metrics.history.completed,
      target: '/services',
      state: { activeTab: 'completed' },
    },
    {
      label: 'Issues Attended',
      value: metrics.issuesAttended,
      icon: Wrench,
      color: 'text-status-success',
      trend: metrics.history.issues,
    },
  ];

  return {
    metrics,
    pendingQueue,
    isMounted,
    refreshDashboard: fetchDashboardData,
    stats,
  };
}
