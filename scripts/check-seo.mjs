import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
const failures = [];

function fail(message) {
  failures.push(message);
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, acc);
    else acc.push(path);
  }
  return acc;
}

const files = walk(dist);
const pages = files.filter((file) => file.endsWith(".html") && !file.endsWith("404.html"));
const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
const required = ["pt-BR", "en", "es", "de", "x-default"];

if (!files.includes(join(dist, "404.html"))) fail("missing 404.html");
if (!files.includes(join(dist, "api", "contact.php"))) fail("missing contact.php");
if (!files.includes(join(dist, "robots.txt"))) fail("missing robots.txt");
if (pages.length < 64) fail(`expected at least 64 pages, found ${pages.length}`);

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canonical) {
    fail(`${file} missing canonical`);
    continue;
  }
  const href = canonical[1];
  if (!href.startsWith("https://emersol.ai")) fail(`${file} canonical is not the production origin`);
  if (!sitemap.includes(`<loc>${href}</loc>`)) fail(`${file} canonical missing from sitemap: ${href}`);
  for (const lang of required) {
    const tag = new RegExp(`<link rel="alternate" hreflang="${lang}" href="([^"]+)"`);
    if (!tag.test(html)) fail(`${file} missing hreflang ${lang}`);
  }
  const xdefault = html.match(/<link rel="alternate" hreflang="x-default" href="([^"]+)"/);
  const pt = html.match(/<link rel="alternate" hreflang="pt-BR" href="([^"]+)"/);
  if (xdefault && pt && xdefault[1] !== pt[1]) fail(`${file} x-default is not pt-BR`);
  if (!html.includes("application/ld+json")) fail(`${file} missing structured data`);
}

const banned = [
  /lorem ipsum/i,
  /exemplo@/i,
  /example\.com/i,
  /\b99[,.]9\s*%/,
  /clientes atendidos/i,
  /\+\s*55\s*11/,
];
const corpus = pages.map((file) => readFileSync(file, "utf8")).join("\n");
for (const pattern of banned) {
  if (pattern.test(corpus)) fail(`banned pattern in pages: ${pattern}`);
}
if (corpus.includes("/precos/") || corpus.includes("/pricing/") || corpus.includes("/precios/") || corpus.includes("/de/preise/")) {
  fail("pricing routes were generated while the flag is off");
}

const client = files.filter((file) => file.includes(`${join(dist, "_astro")}`) || file.endsWith(".js"));
const clientText = client.map((file) => readFileSync(file, "utf8")).join("\n");
for (const secret of ["SMTP_PASSWORD", "WEBHOOK_SECRET", "TURNSTILE_SECRET"]) {
  if (clientText.includes(secret)) fail(`client bundle contains ${secret}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`SEO ok: ${pages.length} pages, sitemap, hreflang, no pricing route, no secrets in the client bundle.`);
