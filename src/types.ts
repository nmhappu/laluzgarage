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

export interface WorkshopUser {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline';
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}


