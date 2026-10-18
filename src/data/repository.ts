import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Part, ServiceRecord, UserRole, Vehicle, WorkshopUser } from '../types';
import { DEFAULT_PRESETS, type WhatsAppPresets } from '../core/whatsapp';

/** The collections the app mirrors (SyncCollections.kt). */
export const SERVICE_RECORDS = 'serviceRecords';
export const VEHICLES = 'vehicles';
export const CUSTOMERS = 'customers';
export const PARTS = 'parts';
export const ALL_COLLECTIONS = [SERVICE_RECORDS, VEHICLES, CUSTOMERS, PARTS] as const;
export type CollectionName = (typeof ALL_COLLECTIONS)[number];

/** Newest N records streamed live; bounds read cost and parse time as history grows. */
const SERVICE_RECORD_LIMIT = 500;

/**
 * The query behind each collection. Live listeners and sync fetches share it, so the cache that
 * answers one also answers the other.
 */
export function collectionQuery(name: CollectionName): Query {
  switch (name) {
    case SERVICE_RECORDS:
      return query(collection(db, name), orderBy('date', 'desc'), limit(SERVICE_RECORD_LIMIT));
    case PARTS:
      return query(collection(db, name), orderBy('name', 'asc'));
    default:
      return query(collection(db, name));
  }
}

/**
 * Offline, a write lands in the cache at once but only resolves when the server acknowledges it.
 * Wait this long for the ack, then treat it as done: the SDK keeps it queued and listeners show it.
 */
const WRITE_ACK_TIMEOUT_MS = 3000;

async function awaitWrite(write: Promise<unknown>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, WRITE_ACK_TIMEOUT_MS);
  });
  try {
    await Promise.race([write.then(() => undefined), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function createCustomer(name: string, phone: string, technicianId: string): Promise<string> {
  const ref = doc(collection(db, CUSTOMERS));
  await awaitWrite(
    setDoc(ref, {
      name: name.trim(),
      phone: phone.trim(),
      technicianId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  return ref.id;
}

export async function createVehicle(v: {
  customerId: string;
  plateNumber: string;
  make: string;
  model: string;
  color: string;
  passwordOrPin: string;
  technicianId: string;
}): Promise<string> {
  const ref = doc(collection(db, VEHICLES));
  await awaitWrite(
    setDoc(ref, {
      customerId: v.customerId,
      plateNumber: v.plateNumber.trim().toUpperCase(),
      make: v.make.trim(),
      model: v.model.trim(),
      color: v.color.trim(),
      passwordOrPin: v.passwordOrPin.trim(),
      technicianId: v.technicianId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  return ref.id;
}

export async function createServiceRecord(r: Omit<ServiceRecord, 'id' | 'status' | 'laborCost' | 'partsCost' | 'totalCost' | 'partsUsed'>): Promise<string> {
  const ref = doc(collection(db, SERVICE_RECORDS));
  await awaitWrite(
    setDoc(ref, {
      vehicleId: r.vehicleId,
      customerId: r.customerId,
      technicianId: r.technicianId,
      technicianName: r.technicianName ?? null,
      date: r.date,
      expectedDeliveryDate: r.expectedDeliveryDate ?? null,
      mileage: r.mileage,
      isDeadVehicle: r.isDeadVehicle,
      isUnknownMileage: r.isUnknownMileage,
      battery: r.battery ?? null,
      personalItems: r.personalItems ?? null,
      description: r.description,
      remarks: r.remarks ?? null,
      status: 'pending',
      laborCost: 0,
      partsCost: 0,
      totalCost: 0,
      partsUsed: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  return ref.id;
}

export async function updateServiceRecord(r: ServiceRecord): Promise<void> {
  await awaitWrite(
    setDoc(
      doc(db, SERVICE_RECORDS, r.id),
      {
        status: r.status,
        description: r.description,
        remarks: r.remarks ?? null,
        finalRemarks: r.finalRemarks ?? null,
        mileage: r.mileage,
        completionMileage: r.completionMileage ?? null,
        isDeadVehicle: r.isDeadVehicle,
        isUnknownMileage: r.isUnknownMileage,
        battery: r.battery ?? null,
        personalItems: r.personalItems ?? null,
        expectedDeliveryDate: r.expectedDeliveryDate ?? null,
        laborCost: r.laborCost,
        partsCost: r.partsCost,
        totalCost: r.totalCost,
        partsUsed: r.partsUsed.map((p) => ({ partId: p.partId, name: p.name, quantity: p.quantity, unitPrice: p.unitPrice })),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  );
}

export async function deleteServiceRecord(id: string): Promise<void> {
  await awaitWrite(deleteDoc(doc(db, SERVICE_RECORDS, id)));
}

/** Edits the fields the vehicle detail screen exposes; owner and createdAt stay as they are. */
export async function updateVehicle(v: Vehicle): Promise<void> {
  await awaitWrite(
    updateDoc(doc(db, VEHICLES, v.id), {
      make: v.make.trim(),
      model: v.model.trim(),
      color: v.color.trim(),
      plateNumber: v.plateNumber.trim().toUpperCase(),
      passwordOrPin: v.passwordOrPin.trim(),
      updatedAt: serverTimestamp(),
    })
  );
}

export async function deleteVehicle(id: string): Promise<void> {
  await awaitWrite(deleteDoc(doc(db, VEHICLES, id)));
}

/** Creates the part when [part.id] is blank, else updates it. */
export async function savePart(part: Part): Promise<void> {
  const data = {
    name: part.name.trim(),
    category: part.category.trim(),
    stockQuantity: Math.trunc(part.stockQuantity),
    price: part.price,
    minStockLevel: Math.trunc(part.minStockLevel),
    location: part.location.trim(),
    updatedAt: serverTimestamp(),
  };
  if (!part.id) {
    await awaitWrite(setDoc(doc(collection(db, PARTS)), { ...data, createdAt: serverTimestamp() }));
  } else {
    await awaitWrite(setDoc(doc(db, PARTS, part.id), data, { merge: true }));
  }
}

export async function deletePart(id: string): Promise<void> {
  await awaitWrite(deleteDoc(doc(db, PARTS, id)));
}

// ---- Settings: team, tags, WhatsApp (SettingsRepository.kt) ----

const ROLE_TAGS = new Set(['admin', 'tech', 'technician', 'assistant']);

/**
 * Saves a member the way the Compose app does: the role is mirrored into the legacy tags
 * (admin / tech / assistant) so older clients and the security rules agree.
 */
export async function saveUser(id: string, name: string, email: string, role: UserRole | null, pin: string, tags: string[]): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const finalName = name.trim() || cleanEmail.split('@')[0];
  const merged = new Set(tags.filter((t) => !ROLE_TAGS.has(t)));
  if (role === 'admin') merged.add('admin');
  if (role === 'technician') merged.add('tech');
  if (role === 'assistant') merged.add('assistant');
  await setDoc(
    doc(db, 'users', id),
    {
      name: finalName,
      email: cleanEmail,
      role,
      pin: pin || null,
      tags: [...merged],
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteUser(id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', id));
}

const CUSTOM_TAGS_KEY = 'workshop_custom_tags';

/** Tags created on this device that no member carries yet. */
export function readCustomTags(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
    if (!raw) return ['tech'];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : ['tech'];
  } catch {
    return ['tech'];
  }
}

export async function getWhatsAppPresets(): Promise<WhatsAppPresets> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'whatsapp'));
    const data = snap.data() ?? {};
    const intake = typeof data.intakeTemplate === 'string' && data.intakeTemplate.trim() ? data.intakeTemplate : DEFAULT_PRESETS.intakeTemplate;
    const delivery = typeof data.deliveryTemplate === 'string' && data.deliveryTemplate.trim() ? data.deliveryTemplate : DEFAULT_PRESETS.deliveryTemplate;
    return { intakeTemplate: intake, deliveryTemplate: delivery };
  } catch {
    return DEFAULT_PRESETS;
  }
}

export async function saveWhatsAppPresets(p: WhatsAppPresets): Promise<void> {
  await setDoc(doc(db, 'settings', 'whatsapp'), {
    intakeTemplate: p.intakeTemplate,
    deliveryTemplate: p.deliveryTemplate,
    updatedAt: serverTimestamp(),
  });
}

/** A readable reason for a failed write; Firestore's own message when it has one. */
export function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Check your connection and try again.';
}

export type { WorkshopUser };
