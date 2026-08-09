import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';

export interface WhatsAppPresets {
  intakeTemplate: string;
  deliveryTemplate: string;
}

export const DEFAULT_INTAKE_TEMPLATE = `Hello {customer_name},

We have successfully registered your vehicle *{vehicle_make} {vehicle_model}* [{vehicle_plate}] at our service center.

*Job Details:* {job_description}
*Status:* Pending

We will keep you updated on the progress. Thank you!`;

export const DEFAULT_DELIVERY_TEMPLATE = `*Service Completed - LaluZ Garage*

Hello *{customer_name}*,
Your vehicle *{vehicle_title}* [{vehicle_plate}] service has been successfully completed and is ready for pickup!

*Job Details:* {job_description}

*Fixed / Replaced Parts:*
{parts_list}

*Labor Charges:* {labor_cost}
*Final Bill Amount:* {total_cost}

Thank you for choosing LaluZ Garage!`;

export const DEFAULT_WHATSAPP_PRESETS: WhatsAppPresets = {
  intakeTemplate: DEFAULT_INTAKE_TEMPLATE,
  deliveryTemplate: DEFAULT_DELIVERY_TEMPLATE,
};

const LOCAL_STORAGE_KEY = 'whatsapp_message_presets_v1';

export function getWhatsAppPresetsSync(): WhatsAppPresets {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.intakeTemplate && parsed.deliveryTemplate) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading whatsapp presets from localStorage:', e);
  }
  return DEFAULT_WHATSAPP_PRESETS;
}

export async function fetchWhatsAppPresets(): Promise<WhatsAppPresets> {
  try {
    const docRef = doc(db, 'settings', 'whatsapp');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const presets: WhatsAppPresets = {
        intakeTemplate: data.intakeTemplate || DEFAULT_INTAKE_TEMPLATE,
        deliveryTemplate: data.deliveryTemplate || DEFAULT_DELIVERY_TEMPLATE,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(presets));
      return presets;
    }
  } catch (e) {
    console.warn('Could not fetch WhatsApp presets from Firestore, using local fallback:', e);
  }
  return getWhatsAppPresetsSync();
}

export async function saveWhatsAppPresets(presets: WhatsAppPresets): Promise<void> {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(presets));
  try {
    const docRef = doc(db, 'settings', 'whatsapp');
    await setDoc(docRef, {
      intakeTemplate: presets.intakeTemplate,
      deliveryTemplate: presets.deliveryTemplate,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Failed to save WhatsApp presets to Firestore:', e);
    handleFirestoreError(e, 'write', 'settings/whatsapp');
  }
}

export function capitalizeName(name?: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export interface IntakeParams {
  customerName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  jobDescription?: string;
}

export function cleanJobDescription(desc?: string): string {
  if (!desc) return 'Service Maintenance';
  const cleaned = desc
    .split('\n')
    .map(line => line.replace(/^\[[xXvV\s✓✔]*\]\s*/, '').trim())
    .filter(line => line.length > 0)
    .join('\n');
  return cleaned || 'Service Maintenance';
}

export function formatIntakeMessage(template: string, params: IntakeParams): string {
  const custName = params.customerName ? capitalizeName(params.customerName) : 'Customer';
  const make = params.vehicleMake || '';
  const model = params.vehicleModel || '';
  const plate = params.vehiclePlate ? params.vehiclePlate.toUpperCase() : 'No Plate';
  const desc = cleanJobDescription(params.jobDescription);

  return template
    .replace(/\{customer_name\}/g, custName)
    .replace(/\{vehicle_make\}/g, make)
    .replace(/\{vehicle_model\}/g, model)
    .replace(/\{vehicle_plate\}/g, plate)
    .replace(/\{job_description\}/g, desc);
}

export interface DeliveryParams {
  customerName?: string;
  vehicleTitle?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  partsList?: string;
  laborCost?: string;
  totalCost?: string;
  jobDescription?: string;
}

export function formatDeliveryMessage(template: string, params: DeliveryParams): string {
  const custName = params.customerName ? capitalizeName(params.customerName) : 'Customer';
  const make = params.vehicleMake || '';
  const model = params.vehicleModel || '';
  const title = params.vehicleTitle || `${make} ${model}`.trim() || 'Vehicle';
  const plate = params.vehiclePlate ? params.vehiclePlate.toUpperCase() : 'No Plate';
  const parts = params.partsList || '• No replacement parts';
  const labor = params.laborCost || '₹0.00';
  const total = params.totalCost || '₹0.00';
  const desc = cleanJobDescription(params.jobDescription);

  return template
    .replace(/\{customer_name\}/g, custName)
    .replace(/\{vehicle_title\}/g, title)
    .replace(/\{vehicle_make\}/g, make)
    .replace(/\{vehicle_model\}/g, model)
    .replace(/\{vehicle_plate\}/g, plate)
    .replace(/\{parts_list\}/g, parts)
    .replace(/\{labor_cost\}/g, labor)
    .replace(/\{total_cost\}/g, total)
    .replace(/\{job_description\}/g, desc);
}
