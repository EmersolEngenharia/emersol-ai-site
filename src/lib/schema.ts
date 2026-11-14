import { postalAddress, publicEmail, sameAs, site, telHref } from "../config/site";
import type { Dictionary } from "../i18n/types";
import { absoluteUrl, localePath } from "../i18n/path";
import type { Locale } from "../i18n/locales";
import { locales, htmlLang } from "../i18n/locales";
import type { RouteKey, ServiceId } from "../i18n/routes";
import { isServiceId } from "../i18n/routes";

const areaServed = [
  { "@type": "Country", name: "Brazil" },
  { "@type": "Country", name: "Portugal" },
  { "@type": "Country", name: "Spain" },
  { "@type": "Country", name: "United Kingdom" },
  { "@type": "Country", name: "Ireland" },
  { "@type": "Country", name: "Germany" },
];

export function organizationNode(locale: Locale, dict: Dictionary) {
  const node: Record<string, unknown> = {
    "@type": "ProfessionalService",
    "@id": `${site.url}/#organization`,
    name: site.name,
    url: site.url,
    description: dict.schemaDescription,
    image: absoluteUrl(`/og/${locale}.png`),
    founder: {
      "@type": "Person",
      name: site.founder.name,
      jobTitle: dict.founderRole,
      homeLocation: {
        "@type": "Place",
        name: site.founder.basedIn,
      },
    },
    areaServed,
    availableLanguage: locales.map((code) => htmlLang[code]),
    knowsLanguage: locales.map((code) => htmlLang[code]),
  };

  const email = publicEmail();
  if (email) node.email = email;

  const telephone = telHref();
  if (telephone) node.telephone = telephone.replace("tel:", "");

  const profiles = sameAs();
  if (profiles.length) node.sameAs = profiles;

  if (site.legalName.trim()) node.legalName = site.legalName.trim();

  const address = postalAddress();
  if (address) {
    node.address = {
      "@type": "PostalAddress",
      streetAddress:
        [site.address.street, site.address.district]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(", ") || undefined,
      addressLocality: site.address.city.trim() || undefined,
      addressRegion: site.address.region.trim() || undefined,
      postalCode: site.address.postalCode.trim() || undefined,
      addressCountry: site.address.country.trim() === "Brasil" ? "BR" : site.address.country.trim() || undefined,
    };
  }

  if (site.taxId.value.trim()) {
    node.identifier = site.taxId.label.trim()
      ? `${site.taxId.label.trim()} ${site.taxId.value.trim()}`
      : site.taxId.value.trim();
  }

  return node;
}

export function breadcrumbNode(locale: Locale, dict: Dictionary, items: { name: string; key: RouteKey }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localePath(locale, item.key)),
    })),
  };
}

export function faqNode(dict: Dictionary) {
  return {
    "@type": "FAQPage",
    mainEntity: dict.faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function serviceNode(locale: Locale, dict: Dictionary, id: ServiceId) {
  const copy = dict.services[id];
  return {
    "@type": "Service",
    name: copy.name,
    description: copy.summary,
    url: absoluteUrl(localePath(locale, id)),
    provider: { "@id": `${site.url}/#organization` },
    areaServed,
  };
}

export function pageGraph(locale: Locale, dict: Dictionary, routeKey: RouteKey, crumbs: { name: string; key: RouteKey }[]) {
  const graph: Record<string, unknown>[] = [
    organizationNode(locale, dict),
    breadcrumbNode(locale, dict, crumbs),
  ];
  if (routeKey === "home") graph.push(faqNode(dict));
  if (isServiceId(routeKey)) graph.push(serviceNode(locale, dict, routeKey));
  return { "@context": "https://schema.org", "@graph": graph };
}
