import type { Locale } from "./locales";

export const serviceIds = [
  "commercial",
  "admin",
  "ai",
  "systems",
  "websites",
  "hosting",
  "consulting",
  "solar",
  "coops",
] as const;

export type ServiceId = (typeof serviceIds)[number];

export const pageIds = [
  "home",
  "solutions",
  "segment",
  "projects",
  "about",
  "contact",
  "privacy",
  "pricing",
] as const;

export type PageId = (typeof pageIds)[number];

export type RouteKey = PageId | ServiceId;

export const routeKeys: RouteKey[] = [...pageIds, ...serviceIds];

export const groupIds = [
  "operation",
  "intelligence",
  "digital",
  "solar",
  "continuity",
] as const;

export type GroupId = (typeof groupIds)[number];

export const groups: { id: GroupId; services: ServiceId[] }[] = [
  { id: "operation", services: ["commercial", "admin"] },
  { id: "intelligence", services: ["ai"] },
  { id: "digital", services: ["systems", "websites", "coops"] },
  { id: "solar", services: ["solar"] },
  { id: "continuity", services: ["hosting", "consulting"] },
];

export const serviceGroup: Record<ServiceId, GroupId> = {
  commercial: "operation",
  admin: "operation",
  ai: "intelligence",
  systems: "digital",
  websites: "digital",
  coops: "digital",
  solar: "solar",
  hosting: "continuity",
  consulting: "continuity",
};

export const relatedServices: Record<ServiceId, ServiceId[]> = {
  commercial: ["ai", "admin", "systems"],
  admin: ["commercial", "systems", "hosting"],
  ai: ["commercial", "consulting", "systems"],
  systems: ["websites", "admin", "coops"],
  websites: ["commercial", "hosting", "systems"],
  hosting: ["websites", "systems", "consulting"],
  consulting: ["commercial", "ai", "solar"],
  solar: ["systems", "commercial", "consulting"],
  coops: ["systems", "admin", "websites"],
};

export const internalProjectIds = [
  "emersoft",
  "solzi",
  "monitoring",
  "cogede",
] as const;

export type InternalProjectId = (typeof internalProjectIds)[number];

/**
 * Slugs sem barra. Vazio = página inicial daquele idioma.
 * Ao adicionar um idioma, inclua a coluna inteira aqui.
 */
export const slugs: Record<Locale, Record<RouteKey, string>> = {
  pt: {
    home: "",
    solutions: "solucoes",
    segment: "empresas-de-servicos",
    projects: "projetos",
    about: "sobre",
    contact: "contato",
    privacy: "privacidade",
    pricing: "precos",
    commercial: "solucoes/automacao-comercial",
    admin: "solucoes/automacao-administrativa",
    ai: "solucoes/assistentes-de-ia",
    systems: "solucoes/sistemas-web",
    websites: "solucoes/sites",
    hosting: "solucoes/hospedagem",
    consulting: "solucoes/consultoria",
    solar: "solucoes/energia-solar",
    coops: "solucoes/cooperativas",
  },
  en: {
    home: "",
    solutions: "solutions",
    segment: "service-companies",
    projects: "projects",
    about: "about",
    contact: "contact",
    privacy: "privacy",
    pricing: "pricing",
    commercial: "solutions/commercial-automation",
    admin: "solutions/administrative-automation",
    ai: "solutions/ai-assistants",
    systems: "solutions/custom-systems",
    websites: "solutions/websites",
    hosting: "solutions/hosting",
    consulting: "solutions/consulting",
    solar: "solutions/solar-software",
    coops: "solutions/cooperatives",
  },
  es: {
    home: "",
    solutions: "soluciones",
    segment: "empresas-de-servicios",
    projects: "proyectos",
    about: "sobre",
    contact: "contacto",
    privacy: "privacidad",
    pricing: "precios",
    commercial: "soluciones/automatizacion-comercial",
    admin: "soluciones/automatizacion-administrativa",
    ai: "soluciones/asistentes-de-ia",
    systems: "soluciones/sistemas-web",
    websites: "soluciones/sitios-web",
    hosting: "soluciones/alojamiento",
    consulting: "soluciones/consultoria",
    solar: "soluciones/software-solar",
    coops: "soluciones/cooperativas",
  },
  de: {
    home: "",
    solutions: "leistungen",
    segment: "dienstleister",
    projects: "projekte",
    about: "ueber",
    contact: "kontakt",
    privacy: "datenschutz",
    pricing: "preise",
    commercial: "leistungen/vertriebsautomatisierung",
    admin: "leistungen/verwaltungsautomatisierung",
    ai: "leistungen/ki-assistenten",
    systems: "leistungen/webanwendungen",
    websites: "leistungen/websites",
    hosting: "leistungen/hosting",
    consulting: "leistungen/beratung",
    solar: "leistungen/solar-software",
    coops: "leistungen/genossenschaften",
  },
};

export function isServiceId(key: RouteKey): key is ServiceId {
  return (serviceIds as readonly string[]).includes(key);
}

export const pricingModelIds = ["fixed", "guided", "ongoing"] as const;
export type PricingModelId = (typeof pricingModelIds)[number];
