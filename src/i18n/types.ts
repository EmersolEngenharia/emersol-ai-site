import type {
  GroupId,
  InternalProjectId,
  PricingModelId,
  RouteKey,
  ServiceId,
} from "./routes";

export type Titled = { title: string; text: string };

export type Highlight = {
  kicker: string;
  title: string;
  text: string;
  points: string[];
};

export type ServiceCopy = {
  name: string;
  summary: string;
  lead: string;
  forWhom: string;
  situations: Titled[];
  includes: Titled[];
  highlight: Highlight | null;
  boundary: string;
};

export type Dictionary = {
  languageName: string;
  seo: Record<RouteKey, { title: string; description: string }>;
  schemaDescription: string;
  founderRole: string;
  nav: {
    solutions: string;
    segment: string;
    projects: string;
    about: string;
    contact: string;
  };
  footer: {
    tagline: string;
    solutions: string;
    company: string;
    contact: string;
    privacy: string;
    remote: string;
    rights: string;
    formChannel: string;
  };
  cta: { talk: string; practice: string };
  common: {
    demo: string;
    demoNote: string;
    internal: string;
    related: string;
    forWhom: string;
    situations: string;
    includes: string;
    boundary: string;
    breadcrumb: string;
    home: string;
    required: string;
    optional: string;
    menu: string;
    close: string;
    language: string;
    skip: string;
  };
  mock: {
    title: string;
    columns: [string, string, string];
    cards: { title: string; meta: string }[];
  };
  home: {
    eyebrow: string;
    title: string;
    lead: string;
    freeNote: string;
    problems: { eyebrow: string; title: string; intro: string; items: Titled[] };
    solutions: { eyebrow: string; title: string; intro: string };
    segment: {
      eyebrow: string;
      title: string;
      text: string;
      points: string[];
      link: string;
    };
    projects: { eyebrow: string; title: string; text: string; link: string };
    founder: {
      eyebrow: string;
      title: string;
      paragraphs: string[];
      link: string;
    };
    closing: { title: string; text: string };
  };
  groups: Record<GroupId, { title: string; text: string }>;
  services: Record<ServiceId, ServiceCopy>;
  examples: {
    eyebrow: string;
    title: string;
    intro: string;
    before: string;
    after: string;
    items: { title: string; before: string; after: string }[];
  };
  process: { eyebrow: string; title: string; intro: string; steps: Titled[] };
  solutionsPage: {
    eyebrow: string;
    title: string;
    lead: string;
    n8n: { kicker: string; title: string; text: string };
    solarNote: { kicker: string; title: string; text: string; link: string };
    formatsTitle: string;
    formatsIntro: string;
  };
  segment: {
    eyebrow: string;
    title: string;
    lead: string;
    audienceTitle: string;
    audiences: Titled[];
    dayTitle: string;
    day: Titled[];
    breaksTitle: string;
    breaks: Titled[];
    pictureTitle: string;
    picture: string;
  };
  projects: {
    eyebrow: string;
    title: string;
    lead: string;
    internalTitle: string;
    internalIntro: string;
    items: Record<InternalProjectId, { name: string; text: string }>;
    demosTitle: string;
    demosIntro: string;
    casesTitle: string;
    casesIntro: string;
    casesEmpty: string;
  };
  about: {
    eyebrow: string;
    title: string;
    lead: string;
    paragraphs: string[];
    facts: { label: string; value: string }[];
    practiceTitle: string;
    practice: Titled[];
    marketsTitle: string;
    markets: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    lead: string;
    freeTitle: string;
    freeText: string;
    diagnosisTitle: string;
    diagnosisText: string;
    asideTitle: string;
    asideText: string;
    noEmail: string;
  };
  form: {
    name: string;
    company: string;
    email: string;
    country: string;
    website: string;
    phone: string;
    problem: string;
    budget: string;
    timeline: string;
    consentBefore: string;
    consentLink: string;
    consentAfter: string;
    submit: string;
    sending: string;
    countryPlaceholder: string;
    budgetPlaceholder: string;
    timelinePlaceholder: string;
    countries: { value: string; label: string }[];
    budgets: { value: string; label: string }[];
    timelines: { value: string; label: string }[];
    honeypot: string;
    successTitle: string;
    successBody: string;
    errors: {
      validation: string;
      rejected: string;
      rate_limited: string;
      not_configured: string;
      delivery_failed: string;
      network: string;
    };
    fallbackIntro: string;
    noFallback: string;
  };
  privacy: {
    eyebrow: string;
    title: string;
    versionLabel: string;
    intro: string[];
    sections: { title: string; paragraphs: string[] }[];
    identityTitle: string;
    identityIntro: string;
    fieldLabels: {
      legalName: string;
      email: string;
      address: string;
      taxId: string;
      dpo: string;
      hosting: string;
    };
    notPublished: string;
    noDpo: string;
    hostingUnknown: string;
    statusTitle: string;
    statusCookiesOff: string;
    statusCookiesOn: string;
    statusAnalyticsOff: string;
    statusAnalyticsOn: string;
    statusCaptchaOff: string;
    statusCaptchaOn: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    lead: string;
    models: Record<PricingModelId, { title: string; text: string; fit: string }>;
    pending: string;
    note: string;
  };
  faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
  notFound: { title: string; text: string; home: string };
  cookies: {
    title: string;
    text: string;
    accept: string;
    reject: string;
  };
};
