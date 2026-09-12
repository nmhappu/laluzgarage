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
