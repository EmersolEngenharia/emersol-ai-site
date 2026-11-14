import { site } from "../config/site";
import { defaultLocale, hreflang, locales, type Locale } from "./locales";
import { routeKeys, slugs, type RouteKey } from "./routes";

export function localePath(locale: Locale, key: RouteKey): string {
  const slug = slugs[locale][key];
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  if (!slug) return prefix === "" ? "/" : `${prefix}/`;
  return `${prefix}/${slug}/`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).href;
}

export function alternates(key: RouteKey): { hreflang: string; href: string }[] {
  const links = locales.map((locale) => ({
    hreflang: hreflang[locale],
    href: absoluteUrl(localePath(locale, key)),
  }));
  links.push({
    hreflang: "x-default",
    href: absoluteUrl(localePath(defaultLocale, key)),
  });
  return links;
}

export function allIndexableRoutes(includePricing: boolean): { locale: Locale; key: RouteKey }[] {
  const keys = routeKeys.filter((key) => includePricing || key !== "pricing");
  return locales.flatMap((locale) => keys.map((key) => ({ locale, key })));
}
