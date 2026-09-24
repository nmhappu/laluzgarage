/**
 * Centralized Application Constants for LaluZ Garage
 */

export const STORAGE_KEYS = {
  THEME: 'theme',
  WHATSAPP_PRESETS: 'whatsapp_message_presets_v1',
  CUSTOM_TAGS: 'workshop_custom_tags',
} as const;

export const DEFAULT_ADVISOR_PIN = '1234';

export const WORKSHOP_DETAILS = {
  name: 'LaluZ Garage',
  tagline: 'Workshop Management Core',
  currency: 'INR',
  currencySymbol: '₹',
  defaultCountryCode: '+91',
  taxRate: '18% (GST)',
} as const;

export const DEFAULT_PLATE_PLACEHOLDER = 'MH12AB1234';

export type ServiceStatusKey = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface ServiceStatusDetail {
  label: string;
  textColor: string;
  dotColor: string;
  dotShadow: string;
  badgeBg: string;
  badgeBorder: string;
  chipClass: string;
}

export const SERVICE_STATUS_CONFIG: Record<ServiceStatusKey, ServiceStatusDetail> = {
  'completed': {
    label: 'Completed',
    textColor: 'text-status-success',
    dotColor: 'bg-status-success',
    dotShadow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    badgeBg: 'bg-status-success/15',
    badgeBorder: 'border-status-success/30',
    chipClass: 'bg-status-success/15 border-status-success/30 text-status-success',
  },
  'in-progress': {
    label: 'In Progress',
    textColor: 'text-status-pending',
    dotColor: 'bg-status-pending',
    dotShadow: 'shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    badgeBg: 'bg-status-warning/15',
    badgeBorder: 'border-status-warning/30',
    chipClass: 'bg-status-warning/15 border-status-warning/30 text-status-warning',
  },
  'pending': {
    label: 'Pending',
    textColor: 'text-status-urgent',
    dotColor: 'bg-status-urgent',
    dotShadow: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]',
    badgeBg: 'bg-status-urgent/15',
    badgeBorder: 'border-status-urgent/30',
    chipClass: 'bg-status-urgent/15 border-status-urgent/30 text-status-urgent',
  },
  'cancelled': {
    label: 'Cancelled',
    textColor: 'text-workshop-muted',
    dotColor: 'bg-workshop-muted',
    dotShadow: '',
    badgeBg: 'bg-workshop-muted/15',
    badgeBorder: 'border-workshop-muted/30',
    chipClass: 'bg-workshop-muted/15 border-workshop-muted/30 text-workshop-muted',
  },
};

export function getServiceStatusDetail(status?: string): ServiceStatusDetail {
  const key = (status?.toLowerCase() || 'pending') as ServiceStatusKey;
  return SERVICE_STATUS_CONFIG[key] || {
    label: status || 'Active',
    textColor: 'text-workshop-muted',
    dotColor: 'bg-workshop-muted',
    dotShadow: '',
    badgeBg: 'bg-workshop-border/30',
    badgeBorder: 'border-workshop-border',
    chipClass: 'bg-workshop-border/30 border-workshop-border text-workshop-muted',
  };
}

