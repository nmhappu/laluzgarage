import { expect, it } from 'vitest';
import { cn } from './format';

it('lets t- type styles replace each other', () => {
  expect(cn('text-on-surface t-title-md', 't-plate-value')).toBe('text-on-surface t-plate-value');
  expect(cn('h-6 t-label-md', 'min-w-6 t-label-tiny')).toBe('h-6 min-w-6 t-label-tiny');
  expect(cn('text-primary', 't-label-lg')).toBe('text-primary t-label-lg');
});
