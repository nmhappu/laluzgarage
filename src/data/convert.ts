import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import type { Customer, Part, PartUsed, ServiceRecord, Vehicle } from '../types';

/**
 * Firestore documents to models with the same defaults the Compose data classes declare, so a
 * missing or mistyped field never breaks a screen.
 */

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const optStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const optNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean => v === true;

export function toCustomer(d: QueryDocumentSnapshot<DocumentData>): Customer {
  const x = d.data();
  return { id: d.id, name: str(x.name), phone: str(x.phone), technicianId: str(x.technicianId), createdAt: x.createdAt, updatedAt: x.updatedAt };
}

export function toVehicle(d: QueryDocumentSnapshot<DocumentData>): Vehicle {
  const x = d.data();
  return {
    id: d.id,
    customerId: str(x.customerId),
    make: str(x.make),
    model: str(x.model),
    color: str(x.color),
    plateNumber: str(x.plateNumber),
    passwordOrPin: str(x.passwordOrPin),
    technicianId: str(x.technicianId),
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
}

export function toPart(d: QueryDocumentSnapshot<DocumentData>): Part {
  const x = d.data();
  return {
    id: d.id,
    name: str(x.name),
    category: str(x.category),
    stockQuantity: Math.trunc(num(x.stockQuantity)),
    price: num(x.price),
    minStockLevel: Math.trunc(num(x.minStockLevel, 5)),
    location: str(x.location),
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
}

function toPartUsed(v: unknown): PartUsed | null {
  if (!v || typeof v !== 'object') return null;
  const x = v as Record<string, unknown>;
  return { partId: str(x.partId), name: str(x.name), quantity: Math.trunc(num(x.quantity, 1)), unitPrice: num(x.unitPrice), addedAt: num(x.addedAt) };
}

/**
 * Parts from the `parts` map (one entry per part, quantities changed by increments) or, for cards
 * not converted yet, the legacy `partsUsed` array. Map lines at zero or below were removed.
 */
function toParts(x: DocumentData): { partsUsed: PartUsed[]; legacyParts: boolean } {
  if (x.parts && typeof x.parts === 'object' && !Array.isArray(x.parts)) {
    const lines = Object.entries(x.parts as Record<string, unknown>)
      .map(([key, v]) => {
        const p = toPartUsed(v);
        return p ? { ...p, partId: p.partId || key, quantity: Math.trunc(num((v as Record<string, unknown>).quantity, 0)) } : null;
      })
      .filter((p): p is PartUsed => p !== null && p.quantity > 0)
      .sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0) || a.name.localeCompare(b.name));
    return { partsUsed: lines, legacyParts: false };
  }
  const list = Array.isArray(x.partsUsed) ? x.partsUsed.map(toPartUsed).filter((p): p is PartUsed => p !== null) : [];
  return { partsUsed: list, legacyParts: true };
}

export function toServiceRecord(d: QueryDocumentSnapshot<DocumentData>): ServiceRecord {
  const x = d.data();
  return {
    id: d.id,
    vehicleId: str(x.vehicleId),
    customerId: str(x.customerId),
    technicianId: str(x.technicianId),
    technicianName: optStr(x.technicianName),
    date: str(x.date),
    expectedDeliveryDate: optStr(x.expectedDeliveryDate),
    mileage: Math.trunc(num(x.mileage)),
    completionMileage: optNum(x.completionMileage),
    isDeadVehicle: bool(x.isDeadVehicle),
    isUnknownMileage: bool(x.isUnknownMileage),
    battery: optNum(x.battery),
    personalItems: optStr(x.personalItems),
    description: str(x.description),
    remarks: optStr(x.remarks),
    finalRemarks: optStr(x.finalRemarks),
    status: str(x.status, 'pending'),
    laborCost: num(x.laborCost),
    partsCost: num(x.partsCost),
    totalCost: num(x.totalCost),
    ...toParts(x),
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
}
