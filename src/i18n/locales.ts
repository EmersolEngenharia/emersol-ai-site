export const locales = ["pt", "en", "es", "de"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt";

/** Valores de hreflang. x-default aponta para o locale padrão (pt). */
export const hreflang: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
  de: "de",
};

export const htmlLang: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
  de: "de",
};

export const ogLocale: Record<Locale, string> = {
  pt: "pt_BR",
  en: "en_GB",
  es: "es_ES",
  de: "de_DE",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
