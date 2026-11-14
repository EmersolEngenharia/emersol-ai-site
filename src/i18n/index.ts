import { de } from "./dictionaries/de";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { pt } from "./dictionaries/pt";
import type { Locale } from "./locales";
import type { Dictionary } from "./types";

export const dictionaries: Record<Locale, Dictionary> = { pt, en, es, de };

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
