import { useState, useEffect, useMemo } from "react";
import { motion, type Variants } from "motion/react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Clock,
  Loader2,
  CheckCircle2,
  Wrench,
  DollarSign,
  BarChart2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import type { WorkshopUser, ServiceRecord } from "../../types";
import { cn } from "../../lib/utils";

export interface PerformanceViewProps {
  users: WorkshopUser[];
  pageVariants?: Variants;
}

export function PerformanceView({ users, pageVariants }: PerformanceViewProps) {
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [perfTimeRange, setPerfTimeRange] = useState<"all" | "30days" | "month">("all");

  const fetchPerformanceData = async () => {
    setLoadingPerformance(true);
    try {
      const snap = await getDocs(collection(db, "serviceRecords"));
      const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceRecord);
      setServiceRecords(records);
    } catch (err) {
      console.error("Error fetching service records for performance:", err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const filteredRecords = useMemo(() => {
    if (perfTimeRange === "all") return serviceRecords;
    const now = new Date();
    if (perfTimeRange === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return serviceRecords.filter((r) => {
        const d = r.date ? new Date(r.date) : null;
        return d && d >= thirtyDaysAgo;
      });
    }
    if (perfTimeRange === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return serviceRecords.filter((r) => {
        const d = r.date ? new Date(r.date) : null;
        return d && d >= startOfMonth;
      });
    }
    return serviceRecords;
  }, [serviceRecords, perfTimeRange]);

  const techPerformanceData = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        completed: number;
        inProgress: number;
        pending: number;
        total: number;
        totalRevenue: number;
        laborRevenue: number;
      }
    >();

    users.forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name || "Unnamed Advisor",
        completed: 0,
        inProgress: 0,
        pending: 0,
        total: 0,
        totalRevenue: 0,
        laborRevenue: 0,
      });
    });

    filteredRecords.forEach((r) => {
      let key = r.technicianId;
      const techName = r.technicianName;

      if (!key && techName) {
        key = techName;
      } else if (!key && !techName) {
        key = "unassigned";
      }

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: techName || (key === "unassigned" ? "Unassigned" : "Unknown Advisor"),
          completed: 0,
          inProgress: 0,
          pending: 0,
          total: 0,
          totalRevenue: 0,
          laborRevenue: 0,
        });
      }

      const item = map.get(key)!;
      item.total += 1;
      if (r.status === "completed") {
        item.completed += 1;
        item.totalRevenue += Number(r.totalCost || 0);
        item.laborRevenue += Number(r.laborCost || 0);
      } else if (r.status === "in-progress") {
        item.inProgress += 1;
      } else if (r.status === "pending") {
        item.pending += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.completed - a.completed);
  }, [users, filteredRecords]);

  return (
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
            onClick={() => setPerfTimeRange("all")}
            className={cn(
              "px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
              perfTimeRange === "all"
                ? "bg-cyan-500 text-workshop-bg shadow"
                : "text-workshop-muted hover:text-workshop-text"
            )}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => setPerfTimeRange("30days")}
            className={cn(
              "px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
              perfTimeRange === "30days"
                ? "bg-cyan-500 text-workshop-bg shadow"
                : "text-workshop-muted hover:text-workshop-text"
            )}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => setPerfTimeRange("month")}
            className={cn(
              "px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
              perfTimeRange === "month"
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-workshop-muted">
                  Completed Jobs
                </p>
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-workshop-muted">
                  Active Jobs
                </p>
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-workshop-muted">
                  Revenue Generated
                </p>
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
                    data={techPerformanceData.map((t) => ({
                      name: t.name,
                      Completed: t.completed,
                      Active: t.inProgress + t.pending,
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#131b23",
                        borderColor: "rgba(255,255,255,0.15)",
                        color: "#f8fafc",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Active" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Technician Detailed Breakdown */}
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
                {techPerformanceData.map((tech) => {
                  const completionRate =
                    tech.total > 0 ? Math.round((tech.completed / tech.total) * 100) : 0;
                  return (
                    <div key={tech.id} className="py-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {tech.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-workshop-text leading-tight">
                              {tech.name}
                            </p>
                            <p className="text-[10px] text-workshop-muted font-mono">
                              {tech.total} total assigned work orders
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono font-bold">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-sans text-workshop-muted block">
                              Completed
                            </span>
                            <span className="text-status-success">{tech.completed}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-sans text-workshop-muted block">
                              Active
                            </span>
                            <span className="text-cyan-400">{tech.inProgress + tech.pending}</span>
                          </div>
                          <div className="text-right pl-2 border-l border-workshop-border/20">
                            <span className="text-[10px] uppercase font-sans text-workshop-muted block">
                              Revenue
                            </span>
                            <span className="text-emerald-400">
                              ₹{tech.totalRevenue.toLocaleString()}
                            </span>
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
  );
}
