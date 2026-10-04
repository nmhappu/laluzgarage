declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

/**
 * Resolves an environment variable with cross-platform safety:
 * 1. Checks runtime container injection (window.__ENV__)
 * 2. Checks runtime alias without "VITE_" prefix (e.g. FIREBASE_API_KEY if key was VITE_FIREBASE_API_KEY)
 * 3. Falls back to Vite build-time env (import.meta.env)
 * 4. Falls back to optional defaultValue
 *
 * This ensures full compatibility across Docker runtime containers,
 * local Vite development, Vitest, and native Android (Capacitor).
 */
export function getEnv(key: string, defaultValue = ''): string {
  // 1. Check runtime window.__ENV__ first (injected dynamically by Docker container)
  if (typeof window !== 'undefined' && window.__ENV__) {
    if (window.__ENV__[key] !== undefined && window.__ENV__[key] !== '') {
      return window.__ENV__[key];
    }
    // Check stripped alias (e.g. VITE_FIREBASE_API_KEY -> FIREBASE_API_KEY)
    if (key.startsWith('VITE_')) {
      const strippedKey = key.replace(/^VITE_/, '');
      if (window.__ENV__[strippedKey] !== undefined && window.__ENV__[strippedKey] !== '') {
        return window.__ENV__[strippedKey];
      }
    }
  }

  // 2. Fall back to Vite import.meta.env (for local dev, Vitest tests, and Android Capacitor)
  const metaEnvVal = import.meta.env[key];
  if (metaEnvVal !== undefined && metaEnvVal !== '') {
    return metaEnvVal;
  }

  return defaultValue;
}
