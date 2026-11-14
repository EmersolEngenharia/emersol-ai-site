import { site } from "../config/site";
import { defaultLocale, hreflang, locales } from "../i18n/locales";
import { localePath } from "../i18n/path";
import { routeKeys } from "../i18n/routes";

export function GET() {
  const keys = routeKeys.filter((key) => site.pricing.enabled || key !== "pricing");
  const blocks = locales.flatMap((locale) =>
    keys.map((key) => {
      const loc = new URL(localePath(locale, key), site.url).href;
      const alternates = [
        ...locales.map((alt) => {
          const href = new URL(localePath(alt, key), site.url).href;
          return `    <xhtml:link rel="alternate" hreflang="${hreflang[alt]}" href="${href}"/>`;
        }),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${new URL(localePath(defaultLocale, key), site.url).href}"/>`,
      ];
      return `  <url>\n    <loc>${loc}</loc>\n${alternates.join("\n")}\n  </url>`;
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${blocks.join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
