import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  capitalizeName,
  cleanPhoneNumber,
  formatIndianPhone,
  buildWhatsAppUrl,
  formatPartsListForWhatsApp,
  parseDateSafe,
  formatDateSafe,
} from './utils';
import {
  cleanJobDescription,
  formatIntakeMessage,
  formatDeliveryMessage,
  DEFAULT_INTAKE_TEMPLATE,
  DEFAULT_DELIVERY_TEMPLATE,
} from '../services/whatsappPresetService';
import {
  getNavTitle,
  getRoleRingClass,
  getRoleFallbackStyle,
  getRoleLabel,
} from '../components/nav/types';
import { extractFirstIssues } from '../components/settings/DateWiseHistoryView';

describe('Utility Functions', () => {
  it('cn merges Tailwind classes correctly without conflicts', () => {
    const isHidden = false;
    expect(cn('p-4', 'p-6', 'text-white')).toBe('p-6 text-white');
    expect(cn('flex', isHidden && 'hidden', 'items-center')).toBe('flex items-center');
  });

  it('formatCurrency formats numbers into Indian Rupee currency string', () => {
    const formatted = formatCurrency(1500);
    expect(formatted).toContain('1,500');
  });

  it('capitalizeName capitalizes each word in a string', () => {
    expect(capitalizeName('john doe')).toBe('John Doe');
    expect(capitalizeName('  RAJESH  KUMAR ')).toBe('Rajesh Kumar');
    expect(capitalizeName('')).toBe('');
    expect(capitalizeName(undefined)).toBe('');
  });

  it('cleanPhoneNumber extracts only digits', () => {
    expect(cleanPhoneNumber('+91 98765-43210')).toBe('919876543210');
    expect(cleanPhoneNumber('98765 43210')).toBe('9876543210');
    expect(cleanPhoneNumber('')).toBe('');
    expect(cleanPhoneNumber(undefined)).toBe('');
  });

  it('formatIndianPhone adds +91 prefix correctly', () => {
    expect(formatIndianPhone('9876543210')).toBe('+91 9876543210');
    expect(formatIndianPhone('+91 9876543210')).toBe('+91 9876543210');
    expect(formatIndianPhone('+919876543210')).toBe('+91 9876543210');
    expect(formatIndianPhone('')).toBe('');
  });

  it('buildWhatsAppUrl constructs valid WhatsApp links', () => {
    expect(buildWhatsAppUrl('+91 98765 43210')).toBe('https://wa.me/919876543210');
    expect(buildWhatsAppUrl('+91 98765 43210', 'Hello world')).toBe(
      'https://wa.me/919876543210?text=Hello%20world'
    );
    expect(buildWhatsAppUrl('')).toBe('');
  });

  it('formatPartsListForWhatsApp generates numbered parts list', () => {
    const emptyResult = formatPartsListForWhatsApp([]);
    expect(emptyResult).toBe('• General Inspection & Maintenance');

    const partsResult = formatPartsListForWhatsApp([
      { name: 'Brake Pad', quantity: 2, unitPrice: 450 },
      { name: 'Engine Oil', quantity: 1, unitPrice: 1200 },
    ]);
    expect(partsResult).toContain('1. Brake Pad (x2) -');
    expect(partsResult).toContain('2. Engine Oil (x1) -');
  });

  it('parseDateSafe and formatDateSafe handle ISO strings reliably', () => {
    expect(formatDateSafe('2026-09-11', 'dd MMM yyyy')).toBe('11 Sep 2026');
    expect(formatDateSafe('', 'dd MMM yyyy', 'No Date')).toBe('No Date');
    expect(formatDateSafe(undefined, 'dd MMM yyyy', 'No Date')).toBe('No Date');
    expect(parseDateSafe('invalid-date')).toBeNull();
  });
});

describe('WhatsApp Preset Service', () => {
  it('cleanJobDescription removes markdown checkboxes and empty lines', () => {
    const raw = `[ ] Oil change
[x] Brake pad replacement
[✓] Wheel alignment
Regular checkup`;

    const cleaned = cleanJobDescription(raw);
    expect(cleaned).toBe(`Oil change
Brake pad replacement
Wheel alignment
Regular checkup`);
  });

  it('cleanJobDescription falls back to default on empty input', () => {
    expect(cleanJobDescription('')).toBe('Service Maintenance');
  });

  it('formatIntakeMessage replaces all placeholders properly', () => {
    const result = formatIntakeMessage(DEFAULT_INTAKE_TEMPLATE, {
      customerName: 'rohit sharma',
      vehicleMake: 'Ola',
      vehicleModel: 'S1 Pro',
      vehiclePlate: 'MH12AB1234',
      jobDescription: '[ ] Battery Diagnostic',
    });

    expect(result).toContain('Rohit Sharma');
    expect(result).toContain('Ola S1 Pro');
    expect(result).toContain('MH12AB1234');
    expect(result).toContain('Battery Diagnostic');
    expect(result).not.toContain('{customer_name}');
  });

  it('formatDeliveryMessage formats delivery message with totals', () => {
    const result = formatDeliveryMessage(DEFAULT_DELIVERY_TEMPLATE, {
      customerName: 'priya verma',
      vehicleMake: 'Honda',
      vehicleModel: 'Activa',
      vehiclePlate: 'DL01XY9876',
      partsList: '• Brake Shoes x1 (₹450)',
      laborCost: '₹300',
      totalCost: '₹750',
      jobDescription: 'Brake Service',
    });

    expect(result).toContain('Priya Verma');
    expect(result).toContain('Honda Activa');
    expect(result).toContain('DL01XY9876');
    expect(result).toContain('• Brake Shoes x1 (₹450)');
    expect(result).toContain('₹750');
    expect(result).not.toContain('{total_cost}');
  });
});

describe('Contact vCard Service', () => {
  it('escapes special vCard characters properly', async () => {
    const { escapeVCardValue, generateVCard } = await import('../services/contactService');
    expect(escapeVCardValue('Smith;John,Jr.')).toBe('Smith\\;John\\,Jr.');
    expect(escapeVCardValue('Line 1\nLine 2')).toBe('Line 1\\nLine 2');
    expect(escapeVCardValue('C:\\Path\\File')).toBe('C:\\\\Path\\\\File');
    expect(escapeVCardValue('')).toBe('');

    const vcard = generateVCard({
      name: 'Dr. John;Doe, MD',
      phone: '+91 98765 43210',
      email: 'john@example.com',
      vehicleInfo: 'Ola S1 Pro; Black',
      notes: 'Helmet left in trunk\nCall before 5PM',
    });

    expect(vcard).toContain('BEGIN:VCARD');
    expect(vcard).toContain('VERSION:3.0');
    expect(vcard).toContain('TEL;TYPE=CELL,VOICE:919876543210');
    expect(vcard).toContain('EMAIL;TYPE=INTERNET:john@example.com');
    expect(vcard).toContain('\\; Black');
    expect(vcard).toContain('\\nCall before 5PM');
    expect(vcard).toContain('END:VCARD');
  });
});

describe('Ola Brand Identification', () => {
  const isOlaVehicle = (v?: { make?: string; model?: string }) => {
    const make = (v?.make || '').toLowerCase();
    const model = (v?.model || '').toLowerCase();
    return make.includes('ola') || model.includes('ola');
  };

  it('correctly identifies Ola vehicles by make or model', () => {
    expect(isOlaVehicle({ make: 'Ola', model: 'S1 Pro' })).toBe(true);
    expect(isOlaVehicle({ make: 'OLA', model: 'S1 Air' })).toBe(true);
    expect(isOlaVehicle({ make: '', model: 'Ola S1 Pro' })).toBe(true);
    expect(isOlaVehicle({ make: 'Electric', model: 'Ola S1' })).toBe(true);
    expect(isOlaVehicle({ make: 'Honda', model: 'Activa 6G' })).toBe(false);
    expect(isOlaVehicle(undefined)).toBe(false);
  });
});

describe('Navigation Title Mapping', () => {
  it('keeps LaluZ Garage on dashboard', () => {
    expect(getNavTitle('/')).toBe('LaluZ Garage');
  });

  it('changes to respective screen title on others', () => {
    expect(getNavTitle('/vehicles')).toBe('Vehicle Registry');
    expect(getNavTitle('/inventory')).toBe('Parts Inventory');
    expect(getNavTitle('/services')).toBe('Service History');
    expect(getNavTitle('/settings')).toBe('Settings');
    expect(getNavTitle('/intake')).toBe('Vehicle Intake');
  });

  it('handles subpaths and query strings gracefully', () => {
    expect(getNavTitle('/vehicles?q=test')).toBe('Vehicle Registry');
    expect(getNavTitle('/services?status_m=pending')).toBe('Service History');
    expect(getNavTitle('/inventory/edit')).toBe('Parts Inventory');
  });
});

describe('User Profile Role Circle Styling', () => {
  it('returns appropriate ring color classes for each role', () => {
    expect(getRoleRingClass('admin')).toContain('ring-status-urgent');
    expect(getRoleRingClass('technician')).toContain('ring-status-success');
    expect(getRoleRingClass('assistant')).toContain('ring-sky-400');
    expect(getRoleRingClass(null)).toContain('ring-workshop-border');
    expect(getRoleRingClass(undefined)).toContain('ring-workshop-border');
  });

  it('returns matching fallback background and text styles', () => {
    expect(getRoleFallbackStyle('admin').text).toBe('text-status-urgent');
    expect(getRoleFallbackStyle('technician').text).toBe('text-status-success');
    expect(getRoleFallbackStyle('assistant').text).toBe('text-sky-400');
    expect(getRoleFallbackStyle(null).text).toBe('text-workshop-accent');
  });

  it('returns human-readable role labels', () => {
    expect(getRoleLabel('admin')).toBe('Admin');
    expect(getRoleLabel('technician')).toBe('Technician');
    expect(getRoleLabel('assistant')).toBe('Assistant');
    expect(getRoleLabel(null)).toBe('Team Member');
    expect(getRoleLabel(undefined)).toBe('Team Member');
  });
});

describe('extractFirstIssues', () => {
  it('extracts at most first 2 issues by default', () => {
    const raw = `Engine noise during acceleration
Brake pad inspection
Oil filter replacement
Tire pressure check`;
    expect(extractFirstIssues(raw)).toEqual([
      'Engine noise during acceleration',
      'Brake pad inspection',
    ]);
  });

  it('strips markdown checkboxes and list indicators', () => {
    const raw = `[ ] Front fork oil leak
[x] Battery health check
- [ ] Chain slack adjustment
• Mirror replacement`;
    expect(extractFirstIssues(raw)).toEqual([
      'Front fork oil leak',
      'Battery health check',
    ]);
  });

  it('handles numbered lists and bullets', () => {
    const raw = `1. Throttle free play
2) Horn not working
3. Tail lamp check`;
    expect(extractFirstIssues(raw)).toEqual([
      'Throttle free play',
      'Horn not working',
    ]);
  });

  it('handles empty or undefined descriptions gracefully', () => {
    expect(extractFirstIssues('')).toEqual([]);
    expect(extractFirstIssues(undefined)).toEqual([]);
    expect(extractFirstIssues('   \n  \n')).toEqual([]);
  });

  it('returns single issue if only one is present', () => {
    expect(extractFirstIssues('[ ] General Service')).toEqual(['General Service']);
  });
});

