import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getEnv } from './env';

describe('getEnv', () => {
  beforeEach(() => {
    // Mock browser window environment
    (globalThis as unknown as { window?: { __ENV__?: Record<string, string> } }).window = {
      __ENV__: undefined,
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('reads from window.__ENV__ when present (runtime container injection)', () => {
    if (globalThis.window) {
      globalThis.window.__ENV__ = {
        VITE_FIREBASE_API_KEY: 'test-runtime-api-key',
      };
    }
    expect(getEnv('VITE_FIREBASE_API_KEY')).toBe('test-runtime-api-key');
  });

  it('supports stripped aliases in window.__ENV__ (FIREBASE_API_KEY for VITE_FIREBASE_API_KEY)', () => {
    if (globalThis.window) {
      globalThis.window.__ENV__ = {
        FIREBASE_API_KEY: 'test-alias-key',
      };
    }
    expect(getEnv('VITE_FIREBASE_API_KEY')).toBe('test-alias-key');
  });

  it('falls back to defaultValue if variable is not found', () => {
    expect(getEnv('NON_EXISTENT_VAR', '(default)')).toBe('(default)');
  });

  it('returns empty string by default if no defaultValue provided', () => {
    expect(getEnv('NON_EXISTENT_VAR')).toBe('');
  });

  it('safely handles non-browser environment where window is undefined', () => {
    delete (globalThis as unknown as { window?: unknown }).window;
    expect(getEnv('NON_EXISTENT_VAR', 'fallback')).toBe('fallback');
  });
});
