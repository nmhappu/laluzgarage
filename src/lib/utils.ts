import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

/**
 * Standardizes customer and advisor names with title casing.
 */
export function capitalizeName(name?: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Strips non-digit characters from a phone string (keeping numbers only).
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Ensures phone number has standard +91 country prefix.
 */
export function formatIndianPhone(phone?: string): string {
  if (!phone) return '';
  const cleanDigits = phone.replace(/[^0-9]/g, '');
  if (!cleanDigits) return '';
  if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
    return `+91 ${cleanDigits.slice(2)}`;
  }
  return `+91 ${cleanDigits}`;
}

/**
 * Constructs a standard WhatsApp chat or prefilled message URL.
 */
export function buildWhatsAppUrl(phone?: string, text?: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) return '';
  if (text && text.trim()) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text.trim())}`;
  }
  return `https://wa.me/${cleanPhone}`;
}

/**
 * Formats an itemized parts list for WhatsApp notifications.
 */
export function formatPartsListForWhatsApp(
  parts?: Array<{ name: string; quantity: number; unitPrice: number }>
): string {
  if (!parts || parts.length === 0) {
    return '• General Inspection & Maintenance';
  }
  return parts
    .map((p, idx) => `${idx + 1}. ${p.name} (x${p.quantity}) - ${formatCurrency(p.unitPrice * p.quantity)}`)
    .join('\n');
}

/**
 * Safely parses an ISO date or standard date string without timezone skew.
 */
export function parseDateSafe(dateStr?: string): Date | null {
  if (!dateStr) return null;
  try {
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = parseISO(trimmed);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Safely formats a date string using date-fns pattern with fallback.
 */
export function formatDateSafe(
  dateStr?: string,
  pattern = 'dd MMM yyyy',
  fallback = 'No Date'
): string {
  const d = parseDateSafe(dateStr);
  if (!d) return fallback;
  try {
    return format(d, pattern);
  } catch {
    return fallback;
  }
}
