import type { PartUsed, ServiceRecord, Vehicle } from '../types';
import { capitalizeName, formatInr } from './format';
import { parseTasks } from './jobs';

export const DEFAULT_DELIVERY_TEMPLATE = `*Service Completed - LaluZ Garage*

Hello *{customer_name}*,
Your vehicle *{vehicle_title}* [{vehicle_plate}] service has been successfully completed and is ready for pickup!

*Job Details:* {job_description}

*Fixed / Replaced Parts:*
{parts_list}

*Labor Charges:* {labor_cost}
*Final Bill Amount:* {total_cost}

Thank you for choosing LaluZ Garage!`;

export const DEFAULT_INTAKE_TEMPLATE = `Hello {customer_name},

We have successfully registered your vehicle *{vehicle_make} {vehicle_model}* [{vehicle_plate}] at our service center.

*Job Details:* {job_description}
*Status:* Pending

We will keep you updated on the progress. Thank you!`;

export interface WhatsAppPresets {
  intakeTemplate: string;
  deliveryTemplate: string;
}

export const DEFAULT_PRESETS: WhatsAppPresets = {
  intakeTemplate: DEFAULT_INTAKE_TEMPLATE,
  deliveryTemplate: DEFAULT_DELIVERY_TEMPLATE,
};

function partsList(parts: PartUsed[]): string {
  if (parts.length === 0) return '• General Inspection & Maintenance';
  return parts.map((p, i) => `${i + 1}. ${p.name} (x${p.quantity}) - ${formatInr(p.unitPrice * p.quantity)}`).join('\n');
}

/** The delivery template filled for [record]; customer remarks are appended when present. */
export function formatDeliveryMessage(
  template: string,
  record: ServiceRecord,
  vehicle: Vehicle | null | undefined,
  customerName: string | null | undefined
): string {
  const title = vehicle ? `${vehicle.make} ${vehicle.model}`.trim() || 'Vehicle' : 'Vehicle';
  const plate = vehicle?.plateNumber?.toUpperCase() || 'No Plate';
  const description = parseTasks(record.description).map((t) => t.text).join('\n') || 'Service Maintenance';
  const message = template
    .replaceAll('{customer_name}', (customerName && capitalizeName(customerName)) || 'Customer')
    .replaceAll('{vehicle_title}', title)
    .replaceAll('{vehicle_make}', vehicle?.make ?? '')
    .replaceAll('{vehicle_model}', vehicle?.model ?? '')
    .replaceAll('{vehicle_plate}', plate)
    .replaceAll('{parts_list}', partsList(record.partsUsed))
    .replaceAll('{labor_cost}', formatInr(record.laborCost))
    .replaceAll('{total_cost}', formatInr(record.totalCost))
    .replaceAll('{job_description}', description);
  const remarks = (record.finalRemarks ?? '').trim();
  return remarks ? `${message}\n\n*Remarks:* ${remarks}` : message;
}

export function formatIntakeMessage(
  template: string,
  customerName: string | null | undefined,
  make: string,
  model: string,
  plate: string | null | undefined,
  description: string
): string {
  const tasks = parseTasks(description).map((t) => t.text).join('\n') || 'Service Maintenance';
  return template
    .replaceAll('{customer_name}', (customerName && capitalizeName(customerName)) || 'Customer')
    .replaceAll('{vehicle_make}', make)
    .replaceAll('{vehicle_model}', model)
    .replaceAll('{vehicle_plate}', plate?.toUpperCase() || 'No Plate')
    .replaceAll('{job_description}', tasks);
}

/** Digits only; a bare 10-digit Indian mobile gets the 91 country code wa.me needs. */
export function whatsAppDigits(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export function buildWhatsAppUrl(phone: string | null | undefined, text?: string | null): string | null {
  const digits = whatsAppDigits(phone);
  if (!digits) return null;
  if (!text || !text.trim()) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text.trim())}`;
}

export function telUrl(phone: string | null | undefined): string {
  return 'tel:' + (phone ?? '').replace(/[^\d+]/g, '');
}
