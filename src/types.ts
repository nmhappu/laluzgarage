import { FieldValue, Timestamp } from 'firebase/firestore';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  technicianId: string;
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
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
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

export interface Part {
  id: string;
  name: string;
  category: string;
  stockQuantity: number;
  price: number;
  minStockLevel: number;
  location: string;
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  customerId: string;
  technicianId: string;
  technicianName?: string;
  date: string;
  expectedDeliveryDate?: string;
  mileage: number;
  completionMileage?: number;
  isDeadVehicle?: boolean;
  isUnknownMileage?: boolean;
  personalItems?: string;
  description: string;
  remarks?: string;
  finalRemarks?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  laborCost: number;
  partsCost: number;
  totalCost: number;
  partsUsed: Array<{
    partId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

export type UserRole = 'admin' | 'technician' | 'assistant';

export interface WorkshopUser {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  status: 'online' | 'offline';
  role?: UserRole;
  pin?: string;
  tags?: string[];
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

/**
 * Resolves the effective role of a workshop user, inspecting both
 * the explicit `role` field and legacy `tags` array for backward compatibility.
 */
export function getUserRole(user: WorkshopUser | null | undefined): UserRole | null {
  if (!user) return null;

  // 1. Explicit formal role
  if (user.role === 'admin' || user.role === 'technician' || user.role === 'assistant') {
    return user.role;
  }

  // 2. Legacy tags taxonomy fallback
  if (Array.isArray(user.tags)) {
    if (user.tags.includes('admin')) return 'admin';
    if (user.tags.includes('tech') || user.tags.includes('technician')) return 'technician';
    if (user.tags.includes('assistant')) return 'assistant';
  }

  return null;
}


