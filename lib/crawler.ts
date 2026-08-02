import * as cheerio from "cheerio";
import type { CrawledPage, CrawlResult } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; CompanyResearchBot/1.0; +https://company-research-ai.example/bot)";

const MAX_PAGES = 7;
const PER_REQUEST_TIMEOUT_MS = 9000;
const TOTAL_BUDGET_MS = 25000;
const MAX_TEXT_PER_PAGE = 3500;

const SKIP_PATH_PATTERNS = [
  /\/(login|signin|sign-in|log-in|register|signup|sign-up|logout)(\/|$|\?)/i,
  /\/(cart|checkout|basket)(\/|$|\?)/i,
  /\/(my-)?account(\/|$|\?)/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|json|xml|zip|pdf|mp4|mov|avi|woff2?|ttf|eot)(\?|$)/i,
  /^mailto:/i,
  /^tel:/i,
  /^javascript:/i,
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  about: ["about", "about-us", "who-we-are", "our-story", "company", "team"],
  products: ["product", "products", "platform"],
  services: ["service", "services"],
  solutions: ["solution", "solutions"],
  pricing: ["pricing", "plans", "price"],
  contact: ["contact", "contact-us", "get-in-touch"],
};

function categorize(pathname: string): string {
  const lower = pathname.toLowerCase();
  if (lower === "/" || lower === "") return "home";
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "other";
}

function shouldSkip(url: string): boolean {
  return SKIP_PATH_PATTERNS.some((re) => re.test(url));
}

function normalize(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return `${u.protocol}//${u.hostname}${path}`;
  } catch {
    return url;
  }
}

async function fetchPage(
  url: string
): Promise<{ ok: boolean; html?: string; status?: number; finalUrl?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
      return { ok: false, status: res.status };
    }
    const html = await res.text();
    return { ok: true, html, status: res.status, finalUrl: res.url || url };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

async function loadRobotsDisallow(origin: string): Promise<string[]> {
  try {
    const res = await fetchPage(`${origin}/robots.txt`);
    if (!res.ok || !res.html) return [];
    const lines = res.html.split("\n");
    const disallow: string[] = [];
    let relevant = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (/^user-agent:\s*\*/i.test(line)) relevant = true;
      else if (/^user-agent:/i.test(line)) relevant = false;
      else if (relevant && /^disallow:/i.test(line)) {
        const path = line.split(":").slice(1).join(":").trim();
        if (path) disallow.push(path);
      }
    }
    return disallow;
  } catch {
    return [];
  }
}

function isDisallowed(pathname: string, disallow: string[]): boolean {
  return disallow.some((rule) => rule !== "" && pathname.startsWith(rule));
}

function extractText($: cheerio.CheerioAPI): string {
  const clone = $.root().clone();
  clone.find("script, style, noscript, svg, nav, footer, header, iframe, form").remove();
  const text = clone.text();
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_PER_PAGE);
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g);
  if (!match) return undefined;
  const plausible = match.find((m) => m.replace(/\D/g, "").length >= 7 && m.replace(/\D/g, "").length <= 15);
  return plausible?.trim();
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  return Array.from(new Set(matches)).filter((e) => !/\.(png|jpg|jpeg|gif|svg)$/i.test(e)).slice(0, 5);
}

export async function crawlWebsite(website: string): Promise<CrawlResult> {
  const start = Date.now();
  const origin = new URL(website).origin;
  const visited = new Set<string>();
  const skipped: string[] = [];
  const pages: CrawledPage[] = [];

  const disallow = await loadRobotsDisallow(origin);

  const homeUrl = normalize(website);
  const homeRes = await fetchPage(homeUrl);
  if (!homeRes.ok || !homeRes.html) {
    throw new Error(
      `Could not reach ${website}. The site may block automated requests, or the URL may be incorrect.`
    );
  }

  // Sites often redirect (http -> https, bare domain -> /en/, etc). Resolve
  // relative links against where we actually landed, not the input URL.
  const effectiveBase = homeRes.finalUrl ?? homeUrl;

  visited.add(homeUrl);
  const $home = cheerio.load(homeRes.html);
  pages.push({
    url: homeUrl,
    title: $home("title").first().text().trim() || website,
    category: "home",
    text: extractText($home),
  });

  const linkScores: { url: string; score: number; category: string }[] = [];
  $home("a[href]").each((_, el) => {
    const href = $home(el).attr("href");
    if (!href) return;
    let abs: string;
    try {
      abs = new URL(href, effectiveBase).toString();
    } catch {
      return;
    }
    if (new URL(abs).origin !== origin) return;
    if (shouldSkip(abs)) return;

    const normalized = normalize(abs);
    if (visited.has(normalized)) return;

    const pathname = new URL(abs).pathname;
    if (isDisallowed(pathname, disallow)) {
      skipped.push(normalized);
      return;
    }

    const category = categorize(pathname);
    const score = category === "other" ? 0 : 10;
    linkScores.push({ url: normalized, score, category });
  });

  const seen = new Set<string>();
  const prioritized = linkScores
    .filter((l) => {
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PAGES - 1);

  for (const link of prioritized) {
    if (Date.now() - start > TOTAL_BUDGET_MS) break;
    if (visited.has(link.url)) continue;
    visited.add(link.url);

    const res = await fetchPage(link.url);
    if (!res.ok || !res.html) {
      skipped.push(link.url);
      continue;
    }
    const $page = cheerio.load(res.html);
    pages.push({
      url: link.url,
      title: $page("title").first().text().trim() || link.url,
      category: link.category,
      text: extractText($page),
    });
  }

  const combinedText = pages.map((p) => p.text).join(" ");
  const contactPage = pages.find((p) => p.category === "contact");
  const phone = extractPhone(contactPage?.text ?? combinedText);
  const emails = extractEmails(combinedText);

  return {
    website: homeUrl,
    pages,
    phone,
    emails,
    address: undefined,
    skipped,
    robotsDisallowed: disallow,
  };
}
