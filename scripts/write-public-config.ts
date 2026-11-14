import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { site } from "../src/config/site.ts";
import { defaultLocale, locales, type Locale } from "../src/i18n/locales.ts";
import { slugs } from "../src/i18n/routes.ts";

function contactPath(locale: Locale): string {
  const slug = slugs[locale].contact;
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return slug ? `${prefix}/${slug}/` : `${prefix || ""}/`;
}

const contactPaths = Object.fromEntries(locales.map((locale) => [locale, contactPath(locale)]));

const payload = {
  email: site.email.trim(),
  contactPaths,
};

const target = resolve("public/runtime-config.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
