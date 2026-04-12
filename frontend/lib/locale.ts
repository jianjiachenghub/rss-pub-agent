export type SiteLocale = "zh" | "en";

export function getLocalePrefix(locale: SiteLocale): string {
  return locale === "en" ? "/en" : "";
}

export function withLocalePath(locale: SiteLocale, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const prefix = getLocalePrefix(locale);

  if (normalizedPath === "/") {
    return prefix || "/";
  }

  return `${prefix}${normalizedPath}`;
}

export function getAlternateLocale(locale: SiteLocale): SiteLocale {
  return locale === "en" ? "zh" : "en";
}
