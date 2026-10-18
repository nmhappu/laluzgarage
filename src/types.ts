import type { FieldValue, Timestamp } from 'firebase/firestore';

/** Firestore documents, matching compose-app/.../data/model/DomainModels.kt. */

export type FireTime = FieldValue | Timestamp | null | undefined;

export interface Customer {
  id: string;
  name: string;
  phone: string;
  technicianId: string;
  createdAt?: FireTime;
  updatedAt?: FireTime;
}

export interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  passwordOrPin: string;
  technicianId: string;
  createdAt?: FireTime;
  updatedAt?: FireTime;
}

export interface Part {
  id: string;
  name: string;
  category: string;
  stockQuantity: number;
  price: number;
  minStockLevel: number;
  location: string;
  createdAt?: FireTime;
  updatedAt?: FireTime;
}

export interface PartUsed {
  partId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type ServiceStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  customerId: string;
  technicianId: string;
  technicianName?: string | null;
  date: string;
  expectedDeliveryDate?: string | null;
  mileage: number;
  completionMileage?: number | null;
  isDeadVehicle: boolean;
  isUnknownMileage: boolean;
  /** Battery charge at intake in 5% steps (0-100); null when it wasn't recorded. */
  battery?: number | null;
  personalItems?: string | null;
  description: string;
  remarks?: string | null;
  finalRemarks?: string | null;
  status: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  partsUsed: PartUsed[];
  createdAt?: FireTime;
  updatedAt?: FireTime;
}

export type UserRole = 'admin' | 'technician' | 'assistant';

export interface WorkshopUser {
  id: string;
  name: string;
  email: string;
  photoURL?: string | null;
  status: string;
  role?: string | null;
  pin?: string | null;
  tags: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

function roleFromString(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  switch (role.trim().toLowerCase()) {
    case 'admin':
    case 'owner':
    case 'manager':
      return 'admin';
    case 'technician':
    case 'tech':
    case 'mechanic':
      return 'technician';
    case 'assistant':
    case 'helper':
    case 'trainee':
      return 'assistant';
    default:
      return null;
  }
}

/**
 * The effective role: the explicit `role` field (with synonyms), else the legacy `tags` array.
 * Same rules as WorkshopUser.effectiveRole in the Compose app.
 */
export function getUserRole(user: WorkshopUser | null | undefined): UserRole | null {
  if (!user) return null;
  const explicit = roleFromString(user.role);
  if (explicit) return explicit;
  const tags = (user.tags ?? []).map((t) => t.trim().toLowerCase());
  if (tags.some((t) => t === 'admin' || t === 'owner' || t === 'manager')) return 'admin';
  if (tags.some((t) => t === 'technician' || t === 'tech' || t === 'mechanic')) return 'technician';
  if (tags.some((t) => t === 'assistant' || t === 'helper' || t === 'trainee')) return 'assistant';
  return null;
}

/** Reads a users/{uid} document the forgiving way WorkshopUser.fromDocument does. */
export function userFromDoc(id: string, data: Record<string, unknown>): WorkshopUser {
  const rawTags = data.tags;
  const tags = Array.isArray(rawTags)
    ? rawTags.filter((t) => t != null).map(String)
    : typeof rawTags === 'string'
      ? [rawTags]
      : [];
  const pin = data.pin;
  return {
    id,
    name: (typeof data.name === 'string' ? data.name : typeof data.displayName === 'string' ? data.displayName : '') as string,
    email: typeof data.email === 'string' ? data.email : '',
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    status: typeof data.status === 'string' ? data.status : 'offline',
    role: (typeof data.role === 'string' ? data.role : typeof data.userRole === 'string' ? data.userRole : typeof data.roleName === 'string' ? data.roleName : null) as string | null,
    pin: pin == null ? null : String(pin),
    tags,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
