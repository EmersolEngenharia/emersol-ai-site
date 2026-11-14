import type { Dictionary } from "../i18n/types";
import { isServiceId, type RouteKey } from "../i18n/routes";

export function crumbs(dict: Dictionary, routeKey: RouteKey): { name: string; key: RouteKey }[] {
  const home = { name: dict.common.home, key: "home" as const };
  if (routeKey === "home") return [home];
  if (isServiceId(routeKey)) {
    return [
      home,
      { name: dict.nav.solutions, key: "solutions" },
      { name: dict.services[routeKey].name, key: routeKey },
    ];
  }
  const name =
    routeKey === "solutions"
      ? dict.nav.solutions
      : routeKey === "segment"
        ? dict.nav.segment
        : routeKey === "projects"
          ? dict.nav.projects
          : routeKey === "about"
            ? dict.nav.about
            : routeKey === "contact"
              ? dict.nav.contact
              : routeKey === "privacy"
                ? dict.footer.privacy
                : dict.pricing.title;
  return [home, { name, key: routeKey }];
}
