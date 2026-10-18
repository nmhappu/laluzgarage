import type { Customer, Part, ServiceRecord, Vehicle } from '../types';
import { parseRecordDate, relativeDayLabel, today, type LocalDate } from './dates';
import { formatInrWhole } from './format';
import { displayName, formatPlate, modelWithColor } from './jobs';

// ---------------------------------------------------------------------------
// Vehicles (VehiclesPresentation.kt)
// ---------------------------------------------------------------------------

export interface VehicleCardModel {
  vehicle: Vehicle;
  plate: string;
  description: string;
  owner: string;
  services: number;
  lastService: string;
}

interface VehicleEntry {
  card: VehicleCardModel;
  last: LocalDate | null;
  plateKey: string;
  textKey: string;
  phoneKey: string;
}

/** Card models plus search keys, built once per snapshot; a keystroke only re-filters. */
export class VehiclesIndex {
  private readonly entries: VehicleEntry[];

  constructor(vehicles: Map<string, Vehicle>, customers: Map<string, Customer>, records: ServiceRecord[], todayDate: LocalDate = today()) {
    const byVehicle = new Map<string, ServiceRecord[]>();
    for (const r of records) {
      const list = byVehicle.get(r.vehicleId);
      if (list) list.push(r);
      else byVehicle.set(r.vehicleId, [r]);
    }
    this.entries = [...vehicles.values()]
      .map((v) => {
        const jobs = byVehicle.get(v.id) ?? [];
        const last = jobs.reduce<LocalDate | null>((acc, r) => {
          const d = parseRecordDate(r.date);
          return d && (!acc || d > acc) ? d : acc;
        }, null);
        const owner = customers.get(v.customerId);
        return {
          card: {
            vehicle: v,
            plate: formatPlate(v.plateNumber),
            description: modelWithColor(v),
            owner: displayName(owner),
            services: jobs.length,
            lastService: jobs.length === 0 || last === null ? 'No services yet' : relativeDayLabel(last, todayDate),
          },
          last,
          plateKey: v.plateNumber.toLowerCase().replaceAll(' ', ''),
          textKey: `${v.make} ${v.model} ${owner?.name ?? ''}`.toLowerCase(),
          phoneKey: (owner?.phone ?? '').replaceAll(' ', ''),
        };
      })
      .sort((a, b) => {
        const la = a.last ?? '';
        const lb = b.last ?? '';
        if (la !== lb) return la < lb ? 1 : -1;
        return a.card.plate.localeCompare(b.card.plate);
      });
  }

  get total(): number {
    return this.entries.length;
  }

  select(query: string): VehicleCardModel[] {
    const needle = query.trim().toLowerCase();
    const compact = needle.replaceAll(' ', '');
    return this.entries
      .filter((e) => !needle || e.plateKey.includes(compact) || e.textKey.includes(needle) || e.phoneKey.includes(compact))
      .map((e) => e.card);
  }
}

export function vehiclesSummary(total: number): string {
  return `${total} ${total === 1 ? 'vehicle' : 'vehicles'} on file`;
}

// ---------------------------------------------------------------------------
// Inventory (InventoryPresentation.kt)
// ---------------------------------------------------------------------------

/** Inventory filter keys: "all", "low", or "cat:<category>". */
export const PART_FILTER_ALL = 'all';
export const PART_FILTER_LOW = 'low';
export const partCategoryFilter = (name: string) => `cat:${name}`;

export interface PartChip {
  key: string;
  label: string;
  count: number;
}

export interface PartRowModel {
  part: Part;
  name: string;
  meta: string;
  price: string;
  isLow: boolean;
  stockLabel: string;
}

/** Inventory sort order, picked from the Sort menu. */
export type PartSort = 'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc';

export const PART_SORTS: { key: PartSort; label: string }[] = [
  { key: 'name-asc', label: 'Name A to Z' },
  { key: 'name-desc', label: 'Name Z to A' },
  { key: 'stock-asc', label: 'Lowest stock first' },
  { key: 'stock-desc', label: 'Highest stock first' },
  { key: 'price-asc', label: 'Lowest price first' },
  { key: 'price-desc', label: 'Highest price first' },
];

/** Stock and price ties fall back to name A to Z. */
const byNameAsc = (a: PartRowModel, b: PartRowModel) => a.name.toLowerCase().localeCompare(b.name.toLowerCase());
const PART_COMPARATORS: Record<PartSort, (a: PartRowModel, b: PartRowModel) => number> = {
  'name-asc': byNameAsc,
  'name-desc': (a, b) => byNameAsc(b, a),
  'stock-asc': (a, b) => a.part.stockQuantity - b.part.stockQuantity || byNameAsc(a, b),
  'stock-desc': (a, b) => b.part.stockQuantity - a.part.stockQuantity || byNameAsc(a, b),
  'price-asc': (a, b) => a.part.price - b.part.price || byNameAsc(a, b),
  'price-desc': (a, b) => b.part.price - a.part.price || byNameAsc(a, b),
};

export function isLowStock(p: Part): boolean {
  return p.stockQuantity <= p.minStockLevel;
}

export class InventoryIndex {
  private readonly rows: PartRowModel[];
  readonly categories: string[];
  readonly chips: PartChip[];
  readonly summary: string;

  constructor(parts: Part[]) {
    this.rows = parts.map((p) => {
      const low = isLowStock(p);
      return {
        part: p,
        name: p.name,
        meta: [p.category.trim(), p.location.trim()].filter(Boolean).join(' · '),
        price: formatInrWhole(p.price),
        isLow: low,
        stockLabel: low ? `Low stock · ${p.stockQuantity}` : `${p.stockQuantity} in stock`,
      };
    });
    this.categories = [...new Set(parts.map((p) => p.category.trim()).filter(Boolean))].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    const lowCount = this.rows.filter((r) => r.isLow).length;
    this.chips = [
      { key: PART_FILTER_ALL, label: 'All', count: this.rows.length },
      { key: PART_FILTER_LOW, label: 'Low stock', count: lowCount },
      ...this.categories.map((c) => ({ key: partCategoryFilter(c), label: c, count: parts.filter((p) => p.category.trim() === c).length })),
    ];
    this.summary = `${this.rows.length} ${this.rows.length === 1 ? 'part' : 'parts'} · ${lowCount} low stock`;
  }

  select(search: string, filter: string, sort: PartSort): PartRowModel[] {
    const needle = search.trim().toLowerCase();
    const compare = PART_COMPARATORS[sort] ?? byNameAsc;
    return this.rows
      .filter((r) => {
        if (filter === PART_FILTER_LOW) return r.isLow;
        if (filter.startsWith('cat:')) return r.part.category.trim() === filter.slice(4);
        return true;
      })
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.part.category.toLowerCase().includes(needle))
      .sort(compare);
  }
}
