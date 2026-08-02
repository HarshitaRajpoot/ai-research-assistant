import type { SearchSnippet } from "./types";

const SERPER_URL = "https://google.serper.dev/search";

export class SerperError extends Error {}

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet?: string;
  position?: number;
}

interface SerperKnowledgeGraph {
  title?: string;
  type?: string;
  website?: string;
  description?: string;
  attributes?: Record<string, string>;
}

export interface SerperResponse {
  organic?: SerperOrganicResult[];
  knowledgeGraph?: SerperKnowledgeGraph;
  answerBox?: { title?: string; answer?: string; snippet?: string };
}

export async function serperSearch(
  query: string,
  apiKey: string,
  opts: { num?: number; gl?: string; hl?: string } = {}
): Promise<SerperResponse> {
  if (!apiKey) {
    throw new SerperError("Missing Serper.dev API key. Add it in Settings.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: opts.num ?? 10,
        gl: opts.gl ?? "us",
        hl: opts.hl ?? "en",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new SerperError("Serper.dev rejected the API key (401/403). Check the key in Settings.");
      }
      throw new SerperError(`Serper.dev search failed (${res.status}): ${body.slice(0, 200)}`);
    }

    return (await res.json()) as SerperResponse;
  } catch (err) {
    if (err instanceof SerperError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new SerperError("Serper.dev search timed out.");
    }
    throw new SerperError(`Serper.dev search failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}

// Domains that are almost never a company's *official* site, even though
// they frequently rank at the top of search results for a company name.
const NON_OFFICIAL_DOMAINS = [
  "wikipedia.org",
  "linkedin.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "youtube.com",
  "crunchbase.com",
  "bloomberg.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "glassdoor.com",
  "indeed.com",
  "reddit.com",
  "medium.com",
  "forbes.com",
  "techcrunch.com",
  "wsj.com",
  "nytimes.com",
  "pitchbook.com",
  "owler.com",
  "zoominfo.com",
  "yelp.com",
  "bbb.org",
  "apps.apple.com",
  "play.google.com",
];

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isLikelyOfficial(link: string): boolean {
  const domain = extractDomain(link);
  if (!domain) return false;
  return !NON_OFFICIAL_DOMAINS.some((bad) => domain === bad || domain.endsWith(`.${bad}`));
}

export interface WebsiteResolution {
  website: string;
  candidates: SearchSnippet[];
}

/**
 * Given a company name, use Serper to find the most likely official
 * website. Prefers the knowledge graph's `website` field when present,
 * otherwise falls back to the first organic result that isn't a known
 * social/aggregator/news domain.
 */
export async function resolveOfficialWebsite(
  companyName: string,
  apiKey: string
): Promise<WebsiteResolution> {
  const data = await serperSearch(`${companyName} official website`, apiKey, { num: 10 });

  const candidates: SearchSnippet[] = (data.organic ?? []).map((o) => ({
    title: o.title,
    link: o.link,
    snippet: o.snippet ?? "",
  }));

  if (data.knowledgeGraph?.website && isLikelyOfficial(data.knowledgeGraph.website)) {
    return { website: normalizeUrl(data.knowledgeGraph.website), candidates };
  }

  const best = candidates.find((c) => isLikelyOfficial(c.link));
  if (best) {
    return { website: normalizeUrl(best.link), candidates };
  }

  if (candidates[0]) {
    return { website: normalizeUrl(candidates[0].link), candidates };
  }

  throw new SerperError(
    `Could not find an official website for "${companyName}". Try entering the URL directly.`
  );
}

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/**
 * Runs a handful of targeted searches to enrich what the crawler found:
 * general company info, contact details, and competitor signals.
 */
export async function enrichCompanyContext(
  companyName: string,
  domain: string,
  apiKey: string
): Promise<{ overview: SearchSnippet[]; competitors: SearchSnippet[]; contact: SearchSnippet[] }> {
  const [overviewRes, competitorRes, contactRes] = await Promise.all([
    serperSearch(`${companyName} company overview products services`, apiKey, { num: 8 }).catch(() => null),
    serperSearch(`${companyName} competitors alternatives`, apiKey, { num: 8 }).catch(() => null),
    serperSearch(`${companyName} contact phone address headquarters`, apiKey, { num: 6 }).catch(() => null),
  ]);

  const toSnippets = (r: SerperResponse | null): SearchSnippet[] =>
    (r?.organic ?? [])
      .filter((o) => extractDomain(o.link) !== domain)
      .map((o) => ({ title: o.title, link: o.link, snippet: o.snippet ?? "" }));

  return {
    overview: toSnippets(overviewRes),
    competitors: toSnippets(competitorRes),
    contact: toSnippets(contactRes),
  };
}
