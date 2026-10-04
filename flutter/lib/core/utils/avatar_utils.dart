/// Upgrades avatar image URLs (such as Google OAuth photoURL) to high-resolution
/// to avoid pixelated thumbnails on retina / high-DPI displays.
String? getHighQualityAvatarUrl(String? url, {int size = 256}) {
  if (url == null || url.isEmpty) return null;

  // Google OAuth avatars usually contain googleusercontent.com or ggpht.com
  if (url.contains('googleusercontent.com') || url.contains('ggpht.com')) {
    // If it already has an =sXX or =sXX-c parameter, replace it
    final regExpParam = RegExp(r'=s\d+(-c)?', caseSensitive: false);
    if (regExpParam.hasMatch(url)) {
      return url.replaceAll(regExpParam, '=s$size-c');
    }

    // If it ends with /sXX-c/
    final regExpPath = RegExp(r'/s\d+(-c)?/', caseSensitive: false);
    if (regExpPath.hasMatch(url)) {
      return url.replaceAll(regExpPath, '/s$size-c/');
    }

    // If no size parameter exists, append it
    final separator = url.contains('?') ? '&' : '=';
    return '$url${separator}s$size-c';
  }

  return url;
}
