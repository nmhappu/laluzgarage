import { describe, it, expect } from 'vitest';
import { cn, formatCurrency } from './utils';
import {
  capitalizeName,
  cleanJobDescription,
  formatIntakeMessage,
  formatDeliveryMessage,
  DEFAULT_INTAKE_TEMPLATE,
  DEFAULT_DELIVERY_TEMPLATE,
} from '../services/whatsappPresetService';

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
});

describe('WhatsApp Preset Service', () => {
  it('capitalizeName capitalizes each word in a string', () => {
    expect(capitalizeName('john doe')).toBe('John Doe');
    expect(capitalizeName('  RAJESH  KUMAR ')).toBe('Rajesh Kumar');
    expect(capitalizeName('')).toBe('');
  });

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
