import type { UserRole } from '../types';

/**
 * Upgrades avatar image URLs (such as Google OAuth photoURL) to high-resolution
 * to avoid pixelated thumbnails on retina / high-DPI displays.
 */
export function getHighQualityAvatarUrl(url?: string | null, size = 384): string | null {
  if (!url) return null;

  // Google OAuth avatars usually end with =s96-c or /s96-c/
  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    // If it already has an =sXX or =sXX-c parameter, replace it
    if (/=s\d+(-c)?/i.test(url)) {
      return url.replace(/=s\d+(-c)?/i, `=s${size}-c`);
    }
    // If it ends with /s96-c/
    if (/\/s\d+(-c)?\//i.test(url)) {
      return url.replace(/\/s\d+(-c)?\//i, `/s${size}-c/`);
    }
    // If no size parameter exists, append it
    const separator = url.includes('?') ? '&' : '=';
    return `${url}${separator}s${size}-c`;
  }

  return url;
}

/**
 * Avatar ring outline and glowing shadow styles per user role
 */
export const getRoleRingClass = (role: UserRole | null | undefined): string => {
  switch (role) {
    case 'admin':
      return 'ring-status-urgent hover:ring-status-urgent/80 shadow-sm shadow-status-urgent/25';
    case 'technician':
      return 'ring-status-success hover:ring-status-success/80 shadow-sm shadow-status-success/25';
    case 'assistant':
      return 'ring-sky-400 hover:ring-sky-300 shadow-sm shadow-sky-400/25';
    default:
      return 'ring-workshop-border/80 hover:ring-workshop-accent/70';
  }
};

/**
 * Avatar background and text color fallback when user has no photoURL
 */
export const getRoleFallbackStyle = (role: UserRole | null | undefined): { bg: string; text: string } => {
  switch (role) {
    case 'admin':
      return { bg: 'bg-status-urgent/15', text: 'text-status-urgent' };
    case 'technician':
      return { bg: 'bg-status-success/15', text: 'text-status-success' };
    case 'assistant':
      return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
    default:
      return { bg: 'bg-workshop-surface', text: 'text-workshop-accent' };
  }
};

/**
 * User-friendly display label for each role
 */
export const getRoleLabel = (role: UserRole | null | undefined): string => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'technician':
      return 'Technician';
    case 'assistant':
      return 'Assistant';
    default:
      return 'Team Member';
  }
};
