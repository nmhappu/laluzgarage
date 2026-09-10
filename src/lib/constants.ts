/**
 * Centralized Application Constants for LaluZ Garage
 */

export const STORAGE_KEYS = {
  THEME: 'theme',
  WHATSAPP_PRESETS: 'whatsapp_message_presets_v1',
  CUSTOM_TAGS: 'workshop_custom_tags',
  ACCOUNTS_REVEALED: 'workshop_accounts_revealed',
  PERFORMANCE_REVEALED: 'workshop_performance_revealed',
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
