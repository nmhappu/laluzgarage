import { describe, expect, it } from 'vitest';
import type { ServiceRecord, Vehicle } from '../types';
import { addDays, dateRangeShortText, fieldDateLabel, parseRecordDate, relativeDayLabel, weekdayLabel } from './dates';
import { computeDashboard, sparklinePaths } from './dashboard';
import { formatInr, formatInrWhole, initialsOf } from './format';
import { compactPlate, dueFlag, formatPhone, formatPlate, parseTasks, securityOf, serializeTasks, tasksFromText } from './jobs';
import { groupByArrivalDay, ServicesListIndex } from './servicesList';
import { axisLabel, buildPeriod, comparisonText, dailyTotals, formatCount, span } from './statistics';
import { buildWhatsAppUrl, formatDeliveryMessage, whatsAppDigits } from './whatsapp';

function record(over: Partial<ServiceRecord> = {}): ServiceRecord {
  return {
    id: 'r1',
    vehicleId: 'v1',
    customerId: 'c1',
    technicianId: 't1',
    date: '2026-10-14T09:30:00',
    mileage: 1000,
    isDeadVehicle: false,
    isUnknownMileage: false,
    description: '',
    status: 'pending',
    laborCost: 0,
    partsCost: 0,
    totalCost: 0,
    partsUsed: [],
    ...over,
  };
}

const vehicle: Vehicle = {
  id: 'v1',
  customerId: 'c1',
  make: 'Honda',
  model: 'City',
  color: 'Silver',
  plateNumber: 'KL07CB4521',
  passwordOrPin: '123456',
  technicianId: 't1',
};

describe('dates', () => {
  it('parses record dates and rejects junk', () => {
    expect(parseRecordDate('2026-10-14T09:30:00')).toBe('2026-10-14');
    expect(parseRecordDate('2026-02-30')).toBeNull();
    expect(parseRecordDate('nope')).toBeNull();
  });

  it('labels days like the artboards', () => {
    expect(weekdayLabel('2026-10-12')).toBe('Mon, 12 Oct');
    expect(relativeDayLabel('2026-10-14', '2026-10-14')).toBe('Today, 14 Oct');
    expect(relativeDayLabel('2026-10-13', '2026-10-14')).toBe('Yesterday, 13 Oct');
    expect(fieldDateLabel('2026-10-14')).toBe('Wed, 14 Oct 2026');
    expect(dateRangeShortText('2026-10-09', '2026-10-11')).toBe('9 Oct – 11 Oct');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('format', () => {
  it('formats rupees with Indian grouping', () => {
    expect(formatInrWhole(1278000)).toBe('₹12,78,000');
    expect(formatInrWhole(12780.4)).toBe('₹12,780');
    expect(formatInr(650)).toBe('₹650.00');
  });

  it('builds initials', () => {
    expect(initialsOf('Prince Santhosh')).toBe('PS');
    expect(initialsOf('rahul')).toBe('RA');
    expect(initialsOf('  ')).toBe('?');
  });
});

describe('jobs', () => {
  it('round-trips the checklist format', () => {
    const tasks = parseTasks('[x] Oil change\n[ ] Brake pads\n- Wheel alignment\n\n');
    expect(tasks).toEqual([
      { text: 'Oil change', done: true },
      { text: 'Brake pads', done: false },
      { text: 'Wheel alignment', done: false },
    ]);
    expect(serializeTasks(tasks)).toBe('[x] Oil change\n[ ] Brake pads\n[ ] Wheel alignment');
    expect(tasksFromText('Oil change\nNew line', tasks)).toEqual([
      { text: 'Oil change', done: true },
      { text: 'New line', done: false },
    ]);
  });

  it('flags overdue and due-today open jobs', () => {
    expect(dueFlag(record({ expectedDeliveryDate: '2026-10-10' }), '2026-10-14')?.label).toBe('4d overdue');
    expect(dueFlag(record({ expectedDeliveryDate: '2026-10-14' }), '2026-10-14')?.label).toBe('Due today');
    expect(dueFlag(record({ expectedDeliveryDate: '2026-10-10', status: 'completed' }), '2026-10-14')).toBeNull();
  });

  it('formats plates, phones and security', () => {
    expect(formatPlate('kl07cb4521')).toBe('KL 07 CB 4521');
    expect(formatPlate('U/R')).toBe('U/R');
    expect(formatPlate('')).toBe('NO PLATE');
    expect(compactPlate('KL 41 M 908')).toBe('KL41M908');
    expect(formatPhone('+919072034455')).toBe('+91 90720 34455');
    expect(securityOf('Physical Key')).toEqual({ kind: 'key' });
    expect(securityOf('')).toEqual({ kind: 'unknown' });
  });
});

describe('whatsapp', () => {
  it('fills the delivery template and appends remarks', () => {
    const r = record({ description: '[x] Oil change', laborCost: 500, totalCost: 900, finalRemarks: 'Rotate tyres soon', partsUsed: [{ partId: 'p', name: 'Filter', quantity: 2, unitPrice: 200 }] });
    const text = formatDeliveryMessage('{customer_name}|{vehicle_title}|{vehicle_plate}|{parts_list}|{total_cost}|{job_description}', r, vehicle, 'anand menon');
    expect(text).toBe('Anand Menon|Honda City|KL07CB4521|1. Filter (x2) - ₹400.00|₹900.00|Oil change\n\n*Remarks:* Rotate tyres soon');
  });

  it('adds the country code for wa.me', () => {
    expect(whatsAppDigits('90720 34455')).toBe('919072034455');
    expect(buildWhatsAppUrl('', 'x')).toBeNull();
    expect(buildWhatsAppUrl('9072034455', 'Hi there')).toBe('https://wa.me/919072034455?text=Hi%20there');
  });
});

describe('services list', () => {
  it('filters, counts and groups by arrival day', () => {
    const records = [
      record({ id: 'a', date: '2026-10-14T10:00:00', status: 'pending' }),
      record({ id: 'b', date: '2026-10-14T09:00:00', status: 'completed', totalCost: 1200 }),
      record({ id: 'c', date: '2026-10-12T09:00:00', status: 'in-progress' }),
    ];
    const index = new ServicesListIndex(records, new Map([['v1', vehicle]]), new Map(), '2026-10-14');
    expect(index.counts).toEqual({ all: 3, pending: 1, 'in-progress': 1, completed: 1 });
    expect(index.summary).toBe('2 open · 1 delivered · 2 arrived today');
    const cards = index.select({ statusFilter: 'all', search: 'kl 07', newestFirst: true, dateFrom: null, dateTo: null });
    expect(cards.map((c) => c.record.id)).toEqual(['a', 'b', 'c']);
    expect(cards[0].total).toBe('Not billed');
    expect(cards[1].totalLabel).toBe('Billed');
    const groups = groupByArrivalDay(cards, '2026-10-14');
    expect(groups.map((g) => g.label)).toEqual(['Today · 14 Oct', 'Mon, 12 Oct']);
  });
});

describe('dashboard', () => {
  it('computes the 7-day trend against the previous 7 days', () => {
    const records = [
      record({ id: 'a', date: '2026-10-14', status: 'pending' }),
      record({ id: 'b', date: '2026-10-10', status: 'completed' }),
      record({ id: 'c', date: '2026-10-05', status: 'completed' }),
    ];
    const stats = computeDashboard(records, new Map(), new Map(), [], '7d', '2026-10-14');
    expect(stats.total).toBe(2);
    expect(stats.deltaText).toBe('+100%');
    expect(stats.caption).toBe('vs previous 7 days · 0.3 per day');
    expect(stats.daily).toHaveLength(7);
    expect(stats.completedShare).toBe(50);
  });

  it('draws a sparkline on the 300×72 grid', () => {
    expect(sparklinePaths([1])).toBeNull();
    expect(sparklinePaths([0, 2])?.area.endsWith('L300 72 L0 72 Z')).toBe(true);
  });
});

describe('statistics', () => {
  it('formats counts, axes and comparisons', () => {
    expect(formatCount(8)).toBe('8');
    expect(formatCount(8.34)).toBe('8.3');
    expect(axisLabel('revenue', 12500)).toBe('₹12.5k');
    expect(axisLabel('revenue', 0)).toBe('0');
    expect(comparisonText(110, 100, 'previous 7 days')).toBe('+10% vs previous 7 days');
    expect(comparisonText(1, 0, 'x')).toBeNull();
    expect(span('2026-10-08', '2026-10-14')).toBe('8–14 Oct');
    expect(span('2026-08-31', '2026-10-14')).toBe('31 Aug – 14 Oct');
  });

  it('builds a week of arrivals', () => {
    const records = [record({ date: '2026-10-14' }), record({ id: 'x', date: '2026-10-13', status: 'cancelled' })];
    const totals = dailyTotals(records, 'arrivals');
    const p = buildPeriod(totals, 'arrivals', 'week', 0, null, null, '2026-10-14');
    expect(p.title).toBe('8–14 Oct');
    expect(p.total).toBe(1);
    expect(p.bars).toHaveLength(7);
    expect(p.bars[6].axis).toBe('W');
    expect(p.rows[0]).toEqual({ title: 'Wed, 14 Oct', sub: 'Today', value: 1 });
  });

  it('marks future days in the current month', () => {
    const p = buildPeriod(new Map([['2026-10-02', 3]]), 'completed', 'month', 0, null, null, '2026-10-14');
    expect(p.title).toBe('October 2026');
    expect(p.bars).toHaveLength(31);
    expect(p.bars[13].isFuture).toBe(false);
    expect(p.bars[14].isFuture).toBe(true);
  });
});
