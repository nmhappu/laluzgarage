import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** The `t-*` type styles (index.css) replace each other: the last one passed wins. */
const twMerge = extendTailwindMerge<'lz-type'>({
  extend: { classGroups: { 'lz-type': [{ t: [() => true] }] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const inrFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const groupedFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** "₹12,780.00" (WhatsApp messages). */
export function formatInr(amount: number): string {
  return inrFormat.format(amount).replace('INR', '₹');
}

/** Whole rupees with Indian grouping, as the artboards show them: "₹12,780". */
export function formatInrWhole(amount: number): string {
  return '₹' + groupedFormat.format(Math.round(amount));
}

/** Grouped integer (odometer readings, counts): "48,210". */
export function formatGrouped(value: number): string {
  return groupedFormat.format(Math.round(value));
}

/** "Prince Santhosh" → "PS", "Rahul" → "RA", "" → "?". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function capitalizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Google account photos come at 96px; the size is part of the URL ("=s96-c" or "/s96-c/").
 * Ask for 512px instead, so the 88px Settings avatar stays sharp. Other URLs pass through.
 */
export function highResPhotoUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  if (!url.includes('googleusercontent.com')) return url;
  if (/=s\d+(-[a-z]+)*$/.test(url)) return url.replace(/=s\d+(-[a-z]+)*$/, '=s512-c');
  if (/\/s\d+(-[a-z]+)*\//.test(url)) return url.replace(/\/s\d+(-[a-z]+)*\//, '/s512-c/');
  return `${url}=s512-c`;
}

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}
