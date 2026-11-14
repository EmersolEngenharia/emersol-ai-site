/**
 * ÚNICA fonte de informações do negócio.
 *
 * Campo vazio = ainda não informado. O site omite o dado.
 * Não preencha com exemplo, cliente, depoimento ou número fictício.
 * Textos de interface ficam nos dicionários em src/i18n/dictionaries/.
 */

export type LocaleCode = "pt" | "en" | "es" | "de";

export type CaseStudy = {
  id: string;
  /** Nome público somente com autorização de quem é citado. */
  client: string;
  country: string;
  year: string;
  text: Partial<
    Record<LocaleCode, { title: string; summary: string; approach: string }>
  >;
};

export const site = {
  name: "Emersol.ai",
  url: "https://emersol.ai",

/**
   * Razão social registrada, sem acento, como no CNPJ.
   * Nas páginas aparece junto com legalNameDisplay.
   */
  legalName: "EMERSOL SERVICOS LTDA",

  /** Nome do responsável como deve ser lido nas quatro línguas. */
  legalNameDisplay: "Emersol Serviços Ltda",

  /** E-mail público de contato e de pedidos de privacidade. */
  email: "emerson@emersol.ai",

  /** Telefone público, com DDI. Exibido só se preenchido. */
  phone: "",

  /** WhatsApp com DDI, só dígitos ou com +. Exibido só se preenchido. */
  whatsapp: "",

  /** URL completa do perfil. Exibida só se preenchida. */
  linkedin: "",

  /**
   * Endereço postal do responsável. Não é a cidade biográfica do fundador.
   * Todos os campos vazios = endereço não publicado.
   */
  address: {
    street: "Rua José Martins Correia, 494, Sala 01",
    district: "Bairro Paranaíba",
    city: "Itumbiara",
    region: "GO",
    postalCode: "75526-300",
    country: "Brasil",
  },

  /** Identificador fiscal. label ex.: "CNPJ" ou "NIF". value vazio = omitido. */
  taxId: {
    label: "CNPJ",
    value: "45.356.855/0001-98",
  },

  /** Contato de encarregado, se houver designação. Vazio = nada é publicado. */
  dpoEmail: "",

  /**
   * Onde a hospedagem deste site guarda os dados, quando isso for fato.
   * Ex.: "União Europeia". Vazio = a política diz que a localização não está publicada.
   */
  hostingRegion: "",

  founder: {
    name: "Emerson Luiz de Miranda",
    /** Fato biográfico. Não é usado como endereço comercial. */
    basedIn: "Itumbiara, Goiás, Brasil",
  },

  /** Versão deste texto de privacidade. */
  privacyVersion: "2026-11-14",

  /** Prazo informado na política para pedidos sem contrato posterior. */
  inquiryRetentionMonths: 24,

  /**
   * Estudos de caso de clientes. Deixe vazio até haver autorização
   * para publicar nome, contexto e relato. Não coloque exemplo.
   */
  caseStudies: [] as CaseStudy[],

  /**
   * Tabela de preços. Com enabled false a rota não é gerada
   * e não entra no menu nem no sitemap.
   * amounts vazio = a página, se ligada, diz que o valor vai em proposta.
   */
  pricing: {
    enabled: false,
    amounts: {
      fixed: "",
      guided: "",
      ongoing: "",
    },
  },

  /** Medição de audiência. Desligada. Sem serviço pago obrigatório. */
  analytics: {
    enabled: false,
    scriptSrc: "",
    domain: "",
  },

  /** Aviso de cookies. Desligado enquanto não houver cookie não essencial. */
  cookies: {
    bannerEnabled: false,
  },

  /** Chave pública do Turnstile. Vazia = widget desligado. O segredo fica no .env. */
  turnstileSiteKey: "",
};

export type SiteConfig = typeof site;

export function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export function publicEmail(): string {
  return site.email.trim();
}

export function telHref(): string {
  const raw = site.phone.trim() || site.whatsapp.trim();
  const number = digits(raw);
  return number ? `tel:+${number}` : "";
}

export function whatsappHref(): string {
  const number = digits(site.whatsapp);
  return number ? `https://wa.me/${number}` : "";
}

export function controllerName(): string {
  const display = site.legalNameDisplay.trim();
  const legal = site.legalName.trim();
  if (display && legal && display !== legal) return `${display} (${legal})`;
  return display || legal;
}

export function postalAddress(): string {
  const street = [site.address.street, site.address.district]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  const city = [site.address.city.trim(), site.address.region.trim()].filter(Boolean).join(" - ");
  const postal = site.address.postalCode.trim() ? `CEP ${site.address.postalCode.trim()}` : "";
  return [street, city, postal, site.address.country.trim()].filter(Boolean).join(", ");
}

export function sameAs(): string[] {
  const url = site.linkedin.trim();
  return url ? [url] : [];
}
