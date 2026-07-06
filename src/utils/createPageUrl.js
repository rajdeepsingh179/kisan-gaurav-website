export function createPageUrl(path = "/") {
  const baseUrl = import.meta.env.VITE_SITE_URL;

  if (!baseUrl) {
    return path;
  }

  return new URL(path, baseUrl).toString();
}
