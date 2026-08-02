import { NextResponse } from "next/server";
import { enrichCompanyContext, extractDomain, SerperError } from "@/lib/serper";
import { callOpenRouterJSON, OpenRouterError } from "@/lib/openrouter";
import type { CrawledPage, Competitor, ResearchResult, SearchSnippet } from "@/lib/types";

// Serper enrichment + the OpenRouter call can take a while, especially on
// slower/free models - give this route more headroom than the default.
export const maxDuration = 60;

const MAX_PROMPT_CHARS = 9000;

function buildCrawlSummary(pages: CrawledPage[]): string {
  const priority = ["home", "about", "products", "services", "solutions", "pricing", "contact", "other"];
  const sorted = [...pages].sort((a, b) => priority.indexOf(a.category) - priority.indexOf(b.category));

  let budget = MAX_PROMPT_CHARS;
  const parts: string[] = [];
  for (const page of sorted) {
    if (budget <= 0) break;
    const chunk = `### Page: ${page.title} [${page.category}] (${page.url})\n${page.text}`.slice(0, budget);
    parts.push(chunk);
    budget -= chunk.length;
  }
  return parts.join("\n\n");
}

function snippetsToText(label: string, snippets: SearchSnippet[]): string {
  if (!snippets.length) return "";
  const lines = snippets
    .slice(0, 6)
    .map((s) => `- ${s.title} (${s.link}): ${s.snippet}`)
    .join("\n");
  return `### ${label}\n${lines}`;
}

interface AiAnalysis {
  companyName?: string;
  phone?: string | null;
  address?: string | null;
  summary?: string;
  products?: string[];
  painPoints?: string[];
  competitors?: Competitor[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const website = (body?.website ?? "").toString().trim();
    const companyName = (body?.companyName ?? "").toString().trim();
    const pages: CrawledPage[] = Array.isArray(body?.pages) ? body.pages : [];
    const crawledPhone = (body?.phone ?? "").toString().trim();
    const serperKey = (body?.serperKey ?? "").toString().trim();
    const openrouterKey = (body?.openrouterKey ?? "").toString().trim();
    const model = (body?.model ?? "").toString().trim();

    if (!website) {
      return NextResponse.json({ error: "Missing website." }, { status: 400 });
    }
    if (!openrouterKey) {
      return NextResponse.json(
        { error: "Add an OpenRouter API key in Settings to generate AI insights." },
        { status: 400 }
      );
    }
    if (!model) {
      return NextResponse.json({ error: "Pick an AI model in Settings." }, { status: 400 });
    }

    const domain = extractDomain(website);
    const sources: SearchSnippet[] = [];
    let enrichment = { overview: [] as SearchSnippet[], competitors: [] as SearchSnippet[], contact: [] as SearchSnippet[] };

    if (serperKey) {
      try {
        enrichment = await enrichCompanyContext(companyName || domain, domain, serperKey);
        sources.push(...enrichment.overview, ...enrichment.competitors, ...enrichment.contact);
      } catch (err) {
        // Enrichment is a bonus signal, not a hard requirement - keep going without it.
        if (!(err instanceof SerperError)) throw err;
      }
    }

    const crawlSummary = buildCrawlSummary(pages);
    const searchContext = [
      snippetsToText("Company overview (web search)", enrichment.overview),
      snippetsToText("Competitor signals (web search)", enrichment.competitors),
      snippetsToText("Contact info (web search)", enrichment.contact),
    ]
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `You are a meticulous B2B company research analyst. You will be given raw crawled website content and web search snippets about one company. Produce ONLY a single valid JSON object (no markdown fences, no commentary) with this exact shape:
{
  "companyName": string,
  "phone": string | null,
  "address": string | null,
  "summary": string,
  "products": string[],
  "painPoints": string[],
  "competitors": [{"name": string, "website": string}]
}
Rules:
- "summary" is 3-5 sentences describing what the company does, who it serves, and its market position.
- "products" lists concrete product/service names (3-8 items), short phrases, no duplicates.
- "painPoints" are 3-6 specific, plausible business challenges this company likely faces given its industry, scale, and competitive position - not generic filler.
- "competitors" lists 3-6 real companies in the same country and industry with similar products/services. Only include a website if you are reasonably confident it is correct; otherwise use best judgement domain guesses.
- If phone or address are not present anywhere in the provided content, use null.
- Output MUST be valid JSON and nothing else.`;

    const userPrompt = `Company name (best guess): ${companyName || "unknown"}
Website: ${website}
Phone number already found by crawler (use if consistent, otherwise verify): ${crawledPhone || "none found"}

${crawlSummary}

${searchContext}`;

    const analysis = await callOpenRouterJSON<AiAnalysis>(openrouterKey, model, systemPrompt, userPrompt);

    const result: ResearchResult = {
      companyName: analysis.companyName?.trim() || companyName || domain,
      website,
      phone: analysis.phone?.trim() || crawledPhone || "",
      address: analysis.address?.trim() || "",
      summary: analysis.summary?.trim() || "",
      products: Array.isArray(analysis.products) ? analysis.products.filter(Boolean).slice(0, 10) : [],
      painPoints: Array.isArray(analysis.painPoints) ? analysis.painPoints.filter(Boolean).slice(0, 8) : [],
      competitors: Array.isArray(analysis.competitors)
        ? analysis.competitors
            .filter((c) => c && c.name)
            .map((c) => ({ name: c.name, website: c.website || "" }))
            .slice(0, 8)
        : [],
      model,
      generatedAt: new Date().toISOString(),
      sources: sources.slice(0, 12),
    };

    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof OpenRouterError || err instanceof SerperError ? 422 : 500;
    return NextResponse.json(
      { error: (err as Error).message || "Failed to generate research report." },
      { status }
    );
  }
}
