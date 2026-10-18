import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { ServiceRange } from '../core/dashboard';
import type { StatusFilter } from '../core/servicesList';
import type { LocalDate } from '../core/dates';
import { PART_FILTER_ALL, type PartSort } from '../core/catalog';

/**
 * List filters, searches and toggles that outlive a screen (they live in ServiceViewModel in the
 * Compose app): switching tabs or opening a job card and coming back keeps them.
 *
 * Each screen reads its own context, so typing in one tab's search re-renders only that tab (every
 * visited tab stays mounted). The setters never change, so [useViewActions] re-renders nothing.
 */

interface ServicesView {
  statusFilter: StatusFilter;
  servicesSearch: string;
  newestFirst: boolean;
  compactCards: boolean;
  dateFrom: LocalDate | null;
  dateTo: LocalDate | null;
  /** Set by the dashboard's search button: Services focuses its search field once. */
  focusServicesSearch: boolean;
}

interface VehiclesView {
  vehicleSearch: string;
}

interface InventoryView {
  partSearch: string;
  partFilter: string;
  partSort: PartSort;
}

interface DashboardView {
  dashboardRange: ServiceRange;
}

interface ViewActions {
  setStatusFilter: Dispatch<SetStateAction<StatusFilter>>;
  setServicesSearch: Dispatch<SetStateAction<string>>;
  setNewestFirst: Dispatch<SetStateAction<boolean>>;
  setCompactCards: Dispatch<SetStateAction<boolean>>;
  setDateRange: (from: LocalDate | null, to: LocalDate | null) => void;
  setFocusServicesSearch: Dispatch<SetStateAction<boolean>>;
  setVehicleSearch: Dispatch<SetStateAction<string>>;
  setPartSearch: Dispatch<SetStateAction<string>>;
  setPartFilter: Dispatch<SetStateAction<string>>;
  setPartSort: Dispatch<SetStateAction<PartSort>>;
  setDashboardRange: Dispatch<SetStateAction<ServiceRange>>;
}

const ServicesViewContext = createContext<ServicesView | null>(null);
const VehiclesViewContext = createContext<VehiclesView | null>(null);
const InventoryViewContext = createContext<InventoryView | null>(null);
const DashboardViewContext = createContext<DashboardView | null>(null);
const ViewActionsContext = createContext<ViewActions | null>(null);

export function ViewStateProvider({ children }: { children: ReactNode }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [servicesSearch, setServicesSearch] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const [compactCards, setCompactCards] = useState(false);
  const [range, setRange] = useState<{ from: LocalDate | null; to: LocalDate | null }>({ from: null, to: null });
  const [dashboardRange, setDashboardRange] = useState<ServiceRange>('45d');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [partFilter, setPartFilter] = useState(PART_FILTER_ALL);
  const [partSort, setPartSort] = useState<PartSort>('name-asc');
  const [focusServicesSearch, setFocusServicesSearch] = useState(false);

  const services = useMemo(
    () => ({ statusFilter, servicesSearch, newestFirst, compactCards, dateFrom: range.from, dateTo: range.to, focusServicesSearch }),
    [statusFilter, servicesSearch, newestFirst, compactCards, range, focusServicesSearch]
  );
  const vehicles = useMemo(() => ({ vehicleSearch }), [vehicleSearch]);
  const inventory = useMemo(() => ({ partSearch, partFilter, partSort }), [partSearch, partFilter, partSort]);
  const dashboard = useMemo(() => ({ dashboardRange }), [dashboardRange]);
  const [actions] = useState<ViewActions>(() => ({
    setStatusFilter,
    setServicesSearch,
    setNewestFirst,
    setCompactCards,
    setDateRange: (from, to) => setRange({ from, to }),
    setFocusServicesSearch,
    setVehicleSearch,
    setPartSearch,
    setPartFilter,
    setPartSort,
    setDashboardRange,
  }));

  return (
    <ViewActionsContext.Provider value={actions}>
      <ServicesViewContext.Provider value={services}>
        <VehiclesViewContext.Provider value={vehicles}>
          <InventoryViewContext.Provider value={inventory}>
            <DashboardViewContext.Provider value={dashboard}>{children}</DashboardViewContext.Provider>
          </InventoryViewContext.Provider>
        </VehiclesViewContext.Provider>
      </ServicesViewContext.Provider>
    </ViewActionsContext.Provider>
  );
}

function required<T>(value: T | null): T {
  if (!value) throw new Error('View state used outside ViewStateProvider');
  return value;
}

export const useServicesView = (): ServicesView & ViewActions => ({ ...required(useContext(ServicesViewContext)), ...useViewActions() });
export const useVehiclesView = (): VehiclesView & ViewActions => ({ ...required(useContext(VehiclesViewContext)), ...useViewActions() });
export const useInventoryView = (): InventoryView & ViewActions => ({ ...required(useContext(InventoryViewContext)), ...useViewActions() });
export const useDashboardView = (): DashboardView & ViewActions => ({ ...required(useContext(DashboardViewContext)), ...useViewActions() });
export const useViewActions = (): ViewActions => required(useContext(ViewActionsContext));
