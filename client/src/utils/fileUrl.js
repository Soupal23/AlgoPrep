/**
 * Utility to resolve uploaded file paths/URLs safely.
 * If the path is an absolute URL (e.g. Cloudinary: https://...), returns it directly.
 * If it's a relative path (e.g. uploads/avatars/...), ensures a single leading slash.
 */
export const resolveFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
};
