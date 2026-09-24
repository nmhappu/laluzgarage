import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ServiceRecord, Vehicle, Part, WorkshopUser } from '../types';
import { isWithinInterval } from 'date-fns';
import { parseDateSafe } from '../lib/utils';
import {
  calculateAnalyticsInterval,
  calculateRevenueMetrics,
  calculateJobFlowMetrics,
  calculateTurnaroundMetrics,
  calculateTechnicianMetrics,
  calculateInventoryMetrics,
  calculateFleetMetrics,
  calculateCustomerMetrics,
  calculateWorkloadMetrics,
  type TimeRangeKey,
  type TimelineDataPoint,
  type TechMetric,
  type PartUsageMetric,
  type BrandShareMetric,
} from '../lib/analyticsCalculators';

export type {
  TimeRangeKey,
  TimelineDataPoint,
  TechMetric,
  PartUsageMetric,
  BrandShareMetric,
};

export function useAnalytics(
  timeRange: TimeRangeKey = '30d',
  customStart?: Date | null,
  customEnd?: Date | null
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [users, setUsers] = useState<WorkshopUser[]>([]);

  // Fetch collections
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rSnap, vSnap, pSnap, uSnap] = await Promise.all([
        getDocs(collection(db, 'serviceRecords')),
        getDocs(collection(db, 'vehicles')),
        getDocs(collection(db, 'parts')),
        getDocs(collection(db, 'users')),
      ]);

      setServiceRecords(rSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord)));
      setVehicles(vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)));
      setParts(pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Part)));
      setUsers(uSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkshopUser)));
    } catch (err: unknown) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute current & previous date intervals
  const { currentInterval, previousInterval } = useMemo(() => {
    return calculateAnalyticsInterval(timeRange, customStart, customEnd);
  }, [timeRange, customStart, customEnd]);

  // Maps for O(1) enrichment
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => {
      if (v.id) map.set(v.id, v);
    });
    return map;
  }, [vehicles]);

  // Filter records within current period
  const currentRecords = useMemo(() => {
    if (timeRange === 'all') return serviceRecords;

    return serviceRecords.filter((r) => {
      const recordDate = parseDateSafe(r.date);
      if (!recordDate) return false;
      return isWithinInterval(recordDate, currentInterval);
    });
  }, [serviceRecords, timeRange, currentInterval]);

  // Filter records in previous period for growth comparison
  const previousRecords = useMemo(() => {
    if (timeRange === 'all') return [];

    return serviceRecords.filter((r) => {
      const recordDate = parseDateSafe(r.date);
      if (!recordDate) return false;
      return isWithinInterval(recordDate, previousInterval);
    });
  }, [serviceRecords, timeRange, previousInterval]);

  // Delegated metrics
  const revenue = useMemo(
    () => calculateRevenueMetrics(currentRecords, previousRecords),
    [currentRecords, previousRecords]
  );

  const jobFlow = useMemo(
    () => calculateJobFlowMetrics(currentRecords),
    [currentRecords]
  );

  const turnaround = useMemo(
    () => calculateTurnaroundMetrics(currentRecords),
    [currentRecords]
  );

  const technicians = useMemo(
    () => calculateTechnicianMetrics(users, currentRecords),
    [users, currentRecords]
  );

  const inventory = useMemo(
    () => calculateInventoryMetrics(parts, currentRecords),
    [parts, currentRecords]
  );

  const fleet = useMemo(
    () => calculateFleetMetrics(currentRecords, vehicleMap),
    [currentRecords, vehicleMap]
  );

  const customers = useMemo(
    () => calculateCustomerMetrics(currentRecords),
    [currentRecords]
  );

  const workload = useMemo(
    () => calculateWorkloadMetrics(currentRecords),
    [currentRecords]
  );

  return {
    loading,
    error,
    refresh: fetchData,
    recordsCount: currentRecords.length,
    revenue,
    jobFlow,
    turnaround,
    technicians,
    inventory,
    fleet,
    customers,
    workload,
  };
}
