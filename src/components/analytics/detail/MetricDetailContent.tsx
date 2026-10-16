import { useMemo } from 'react';
import { EChartsReact } from '../EChartsReact';
import { formatCurrency, cn } from '../../../lib/utils';
import type { useAnalytics } from '../../../hooks/useAnalytics';
import type { CardKey } from './types';
import { getDetailChartOption } from './detailUtils';

interface MetricDetailContentProps {
  activeCard: CardKey;
  analyticsData: ReturnType<typeof useAnalytics>;
  className?: string;
  chartHeightClassName?: string;
}

export function MetricDetailContent({
  activeCard,
  analyticsData,
  className,
  chartHeightClassName = 'h-64 sm:h-80 md:h-96',
}: MetricDetailContentProps) {
  const detailChartOption = useMemo(
    () => getDetailChartOption(activeCard, analyticsData),
    [activeCard, analyticsData]
  );

  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      {/* 1. Main Interactive Chart */}
      <section className="bg-workshop-surface border border-workshop-border/60 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-6 space-y-3 shadow-xs">
        <div className={cn("w-full min-h-0", chartHeightClassName)}>
          <EChartsReact option={detailChartOption} className="w-full h-full min-h-0" />
        </div>
      </section>

      {/* 2. Domain-specific KPI and Breakdown Sections */}
      {activeCard === 'revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Total Invoiced</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-status-success mt-0.5">
                {formatCurrency(analyticsData.revenue.totalRevenue)}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Labor Revenue</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-blue-400 mt-0.5">
                {formatCurrency(analyticsData.revenue.laborRevenue)}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Parts Revenue</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-amber-400 mt-0.5">
                {formatCurrency(analyticsData.revenue.partsRevenue)}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeCard === 'jobFlow' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Total Orders</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-workshop-text mt-0.5">
                {analyticsData.jobFlow.total}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Active In-Bay WIP</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-cyan-400 mt-0.5">
                {analyticsData.jobFlow.activeJobs}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Completed Jobs</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-status-success mt-0.5">
                {analyticsData.jobFlow.completed}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Completion Rate</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-workshop-text mt-0.5">
                {analyticsData.jobFlow.completionRate}%
              </p>
            </div>
          </div>
        </div>
      )}

      {activeCard === 'turnaround' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Average Duration</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-amber-400 mt-0.5">
                {analyticsData.turnaround.avgDays} Days
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Average Hours</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-workshop-text mt-0.5">
                {analyticsData.turnaround.avgHours} hrs
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">On-Time Rate</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-status-success mt-0.5">
                {analyticsData.turnaround.onTimeRate}%
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Express Deliveries</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-cyan-400 mt-0.5">
                {analyticsData.turnaround.expressCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeCard === 'technicians' && (
        <div className="space-y-3">
          <div className="divide-y divide-workshop-border/30 border border-workshop-border/60 rounded-xl overflow-hidden bg-workshop-surface">
            {analyticsData.technicians.list.map((tech, idx) => (
              <div key={tech.id} className="p-3 sm:p-3.5 flex items-center justify-between text-xs hover:bg-workshop-card/30 transition-colors">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="w-5 text-center font-bold text-workshop-muted text-[11px]">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-workshop-text">{tech.name}</p>
                    <p className="text-[10px] text-workshop-muted font-numeric">
                      {tech.completed} completed • {tech.active} active
                    </p>
                  </div>
                </div>
                <div className="text-right font-numeric font-bold">
                  <p className="text-workshop-accent">{formatCurrency(tech.laborRevenue)}</p>
                  <p className="text-[10px] text-workshop-muted font-normal">{tech.completionRate}% completion</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCard === 'inventory' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Total Stock Billed</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-amber-500 mt-0.5">
                {formatCurrency(analyticsData.inventory.totalBilled)}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Items Dispatched</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-workshop-text mt-0.5">
                {analyticsData.inventory.totalItemsDispatched}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Low Stock Alerts</p>
              <p className={cn(
                "text-base sm:text-lg font-black font-google-sans mt-0.5",
                analyticsData.inventory.lowStockCount > 0 ? "text-status-urgent" : "text-status-success"
              )}>
                {analyticsData.inventory.lowStockCount} Items
              </p>
            </div>
          </div>

          <div className="divide-y divide-workshop-border/30 border border-workshop-border/60 rounded-xl overflow-hidden bg-workshop-surface">
            {analyticsData.inventory.topParts.map((part) => (
              <div key={part.name} className="p-3 sm:p-3.5 flex items-center justify-between text-xs hover:bg-workshop-card/30 transition-colors">
                <div>
                  <p className="font-bold text-workshop-text">{part.name}</p>
                  <p className="text-[10px] text-workshop-muted">{part.quantity} units dispatched</p>
                </div>
                <p className="font-bold text-amber-400 font-numeric">{formatCurrency(part.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCard === 'fleet' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Total Vehicles Serviced</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-indigo-400 mt-0.5">
                {analyticsData.fleet.totalVehiclesServiced}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Repeat Fleet Rate</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-status-success mt-0.5">
                {analyticsData.fleet.repeatRate}%
              </p>
            </div>
          </div>

          <div className="divide-y divide-workshop-border/30 border border-workshop-border/60 rounded-xl overflow-hidden bg-workshop-surface">
            {analyticsData.fleet.brands.map((brand) => (
              <div key={brand.name} className="p-3 sm:p-3.5 flex items-center justify-between text-xs hover:bg-workshop-card/30 transition-colors">
                <span className="font-bold text-workshop-text">{brand.name}</span>
                <div className="text-right font-numeric">
                  <span className="font-bold text-indigo-400">{brand.count} cars</span>
                  <span className="text-workshop-muted text-[10px] ml-2">({brand.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCard === 'retention' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Unique Customers</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-workshop-text mt-0.5">
                {analyticsData.customers.uniqueCustomers}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Returning Accounts</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-purple-400 mt-0.5">
                {analyticsData.customers.returningCustomers}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">New Customers</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-cyan-400 mt-0.5">
                {analyticsData.customers.newCustomers}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Repeat Percentage</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-status-success mt-0.5">
                {analyticsData.customers.repeatPercent}%
              </p>
            </div>
          </div>
        </div>
      )}

      {activeCard === 'workload' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Peak Intake Day</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-rose-400 mt-0.5">
                {analyticsData.workload.peakDay || '—'}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Weekend Volume Share</p>
              <p className="text-base sm:text-lg font-black font-google-sans text-cyan-400 mt-0.5">
                {analyticsData.workload.weekendPercent}%
              </p>
            </div>
          </div>
        </div>
      )}

      {activeCard === 'categories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Top Category</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-teal-400 mt-0.5 truncate">
                {analyticsData.categories.topCategory.name}
              </p>
              <p className="text-[10px] text-workshop-muted mt-0.5">
                {analyticsData.categories.topCategory.count} orders ({analyticsData.categories.topCategory.percentage}%)
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Highest Revenue</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-status-success mt-0.5 truncate">
                {analyticsData.categories.topRevenueCategory.name}
              </p>
              <p className="text-[10px] text-workshop-muted mt-0.5">
                {formatCurrency(analyticsData.categories.topRevenueCategory.revenue)}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Categorized Work</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-workshop-text mt-0.5">
                {analyticsData.categories.totalCategorized} Orders
              </p>
              <p className="text-[10px] text-workshop-muted mt-0.5">
                Across {analyticsData.categories.categories.length} job groups
              </p>
            </div>
          </div>

          <div className="divide-y divide-workshop-border/30 border border-workshop-border/60 rounded-xl overflow-hidden bg-workshop-surface">
            {analyticsData.categories.categories.map((cat) => (
              <div key={cat.name} className="p-3 sm:p-3.5 flex items-center justify-between text-xs hover:bg-workshop-card/30 transition-colors">
                <div>
                  <p className="font-bold text-workshop-text">{cat.name}</p>
                  <p className="text-[10px] text-workshop-muted">
                    {cat.count} jobs • {cat.percentage}% of bay throughput
                  </p>
                </div>
                <div className="text-right font-numeric font-bold">
                  <p className="text-teal-400">{formatCurrency(cat.revenue)}</p>
                  <p className="text-[10px] text-workshop-muted font-normal">
                    Avg ticket: {formatCurrency(cat.avgTicket)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCard === 'ticketTiers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Median Ticket</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-emerald-400 mt-0.5">
                {formatCurrency(analyticsData.invoiceTiers.medianTicket)}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Highest Invoice</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-status-success mt-0.5">
                {formatCurrency(analyticsData.invoiceTiers.highestTicket)}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">High-Value Share</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-amber-400 mt-0.5">
                {analyticsData.invoiceTiers.highValueShare}%
              </p>
            </div>
          </div>

          <div className="divide-y divide-workshop-border/30 border border-workshop-border/60 rounded-xl overflow-hidden bg-workshop-surface">
            {analyticsData.invoiceTiers.tiers.map((tier) => (
              <div key={tier.id} className="p-3 sm:p-3.5 flex items-center justify-between text-xs hover:bg-workshop-card/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tier.color }}
                  />
                  <div>
                    <p className="font-bold text-workshop-text">{tier.name}</p>
                    <p className="text-[10px] text-workshop-muted font-numeric">
                      {tier.range} • {tier.count} orders ({tier.percentage}%)
                    </p>
                  </div>
                </div>
                <div className="text-right font-numeric font-bold">
                  <p className="text-workshop-text">{formatCurrency(tier.totalRevenue)}</p>
                  <p className="text-[10px] text-workshop-muted font-normal">
                    Avg {formatCurrency(tier.avgTicket)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCard === 'vehicleHealth' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Average Odometer</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-sky-400 mt-0.5">
                {analyticsData.vehicleHealth.avgMileage > 0
                  ? `${analyticsData.vehicleHealth.avgMileage.toLocaleString()} km`
                  : '—'}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Tow-in / Dead In</p>
              <p className={cn(
                "text-sm sm:text-base font-black font-google-sans mt-0.5",
                analyticsData.vehicleHealth.deadVehicleCount > 0 ? "text-status-urgent" : "text-status-success"
              )}>
                {analyticsData.vehicleHealth.deadVehicleCount} ({analyticsData.vehicleHealth.deadVehicleRate}%)
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">High-Mileage Fleet</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-amber-400 mt-0.5">
                {analyticsData.vehicleHealth.highMileageCount} ({analyticsData.vehicleHealth.highMileageRate}%)
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">KM Between Visits</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-workshop-text mt-0.5">
                {analyticsData.vehicleHealth.avgDeltaKm > 0
                  ? `${analyticsData.vehicleHealth.avgDeltaKm.toLocaleString()} km`
                  : '—'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-workshop-border/30 border border-workshop-border/60 rounded-xl overflow-hidden bg-workshop-surface">
            {analyticsData.vehicleHealth.mileageBrackets.map((bracket) => (
              <div key={bracket.bracket} className="p-3 sm:p-3.5 flex items-center justify-between text-xs hover:bg-workshop-card/30 transition-colors">
                <div>
                  <p className="font-bold text-workshop-text">{bracket.rangeLabel}</p>
                  <p className="text-[10px] text-workshop-muted">Tier: {bracket.bracket}</p>
                </div>
                <div className="text-right font-numeric font-bold">
                  <span className="text-sky-400">{bracket.count} vehicles</span>
                  <span className="text-workshop-muted text-[10px] ml-2">({bracket.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCard === 'clientSpend' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Avg Customer Spend</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-rose-400 mt-0.5">
                {formatCurrency(analyticsData.topClients.avgCustomerSpend)}
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">Top 5 Concentration</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-purple-400 mt-0.5">
                {analyticsData.topClients.top5Share}%
              </p>
            </div>
            <div className="bg-workshop-surface p-3.5 sm:p-4 rounded-xl border border-workshop-border/60 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase text-workshop-muted">VIP Accounts</p>
              <p className="text-sm sm:text-base font-black font-google-sans text-status-success mt-0.5">
                {analyticsData.topClients.vipCount}
              </p>
            </div>
          </div>

          <div className="divide-y divide-workshop-border/30 border border-workshop-border/60 rounded-xl overflow-hidden bg-workshop-surface">
            {analyticsData.topClients.topClients.map((client, idx) => (
              <div key={client.id} className="p-3 sm:p-3.5 flex items-center justify-between text-xs hover:bg-workshop-card/30 transition-colors">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="w-5 text-center font-bold text-workshop-muted text-[11px]">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-workshop-text">{client.name}</p>
                    <p className="text-[10px] text-workshop-muted font-numeric">
                      {client.visitsCount} visits • {client.phone !== '—' ? client.phone : 'No phone'}
                    </p>
                  </div>
                </div>
                <div className="text-right font-numeric font-bold">
                  <p className="text-rose-400">{formatCurrency(client.totalSpent)}</p>
                  <p className="text-[10px] text-workshop-muted font-normal">
                    Avg {formatCurrency(client.avgSpend)}/visit
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default MetricDetailContent;
