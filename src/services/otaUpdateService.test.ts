import { describe, it, expect } from 'vitest';
import {
  normalizeVersion,
  parseSemver,
  compareSemver,
  formatBytes,
} from './otaUpdateService';

describe('otaUpdateService - SemVer and utilities', () => {
  describe('normalizeVersion', () => {
    it('strips leading v and release- prefix', () => {
      expect(normalizeVersion('v1.2.3')).toBe('1.2.3');
      expect(normalizeVersion('V2.0.0')).toBe('2.0.0');
      expect(normalizeVersion('release-1.0.1')).toBe('1.0.1');
      expect(normalizeVersion('1.0.0')).toBe('1.0.0');
    });

    it('handles empty input gracefully', () => {
      expect(normalizeVersion('')).toBe('0.0.0');
    });
  });

  describe('parseSemver', () => {
    it('parses standard 3-part version', () => {
      const parsed = parseSemver('1.2.3');
      expect(parsed).toEqual({ major: 1, minor: 2, patch: 3, prerelease: null });
    });

    it('parses version with prerelease tag', () => {
      const parsed = parseSemver('v1.0.0-dev.1');
      expect(parsed).toEqual({ major: 1, minor: 0, patch: 0, prerelease: 'dev.1' });
    });

    it('parses short 2-part version', () => {
      const parsed = parseSemver('0.2');
      expect(parsed).toEqual({ major: 0, minor: 2, patch: 0, prerelease: null });
    });

    it('parses 2-part version with beta suffix', () => {
      const parsed = parseSemver('v0.2-beta');
      expect(parsed).toEqual({ major: 0, minor: 2, patch: 0, prerelease: 'beta' });
    });
  });

  describe('compareSemver', () => {
    it('correctly compares major versions', () => {
      expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
    });

    it('correctly compares minor versions', () => {
      expect(compareSemver('1.3.0', '1.2.9')).toBe(1);
      expect(compareSemver('1.2.0', '1.3.0')).toBe(-1);
    });

    it('correctly compares patch versions', () => {
      expect(compareSemver('1.0.2', '1.0.1')).toBe(1);
      expect(compareSemver('1.0.1', '1.0.2')).toBe(-1);
      expect(compareSemver('1.0.1', '1.0.1')).toBe(0);
    });

    it('prioritizes stable release over prerelease with same major.minor.patch', () => {
      // 1.0.0 is greater than 1.0.0-dev
      expect(compareSemver('1.0.0', '1.0.0-dev')).toBe(1);
      expect(compareSemver('1.0.0-dev', '1.0.0')).toBe(-1);
    });

    it('compares prerelease identifiers', () => {
      expect(compareSemver('1.0.0-dev.2', '1.0.0-dev.1')).toBe(1);
      expect(compareSemver('1.0.0-dev.1', '1.0.0-dev.2')).toBe(-1);
    });

    it('correctly handles newer major with dev tag vs older stable', () => {
      expect(compareSemver('1.1.0-dev', '1.0.0')).toBe(1);
      expect(compareSemver('0.2-beta', '0.1.0')).toBe(1);
    });
  });

  describe('formatBytes', () => {
    it('formats file sizes accurately', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024 * 7.5)).toBe('7.5 MB');
    });
  });
});
