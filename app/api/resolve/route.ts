import { NextResponse } from "next/server";
import { resolveOfficialWebsite, normalizeUrl, extractDomain, SerperError } from "@/lib/serper";

function looksLikeUrlOrDomain(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s]*)?$/i.test(trimmed) && !trimmed.includes(" ")) return true;
  return false;
}

function guessNameFromDomain(domain: string): string {
  const base = domain.split(".")[0] ?? domain;
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = (body?.input ?? "").toString().trim();
    const serperKey = (body?.serperKey ?? "").toString().trim();

    if (!input) {
      return NextResponse.json({ error: "Enter a company name or website URL." }, { status: 400 });
    }

    if (looksLikeUrlOrDomain(input)) {
      const website = normalizeUrl(input);
      const domain = extractDomain(website);
      return NextResponse.json({
        website,
        companyName: guessNameFromDomain(domain),
        source: "direct-url",
        candidates: [],
      });
    }

    if (!serperKey) {
      return NextResponse.json(
        {
          error:
            "That looks like a company name rather than a URL. Add a Serper.dev API key in Settings so I can look up the official website, or paste the website URL directly.",
        },
        { status: 400 }
      );
    }

    const { website, candidates } = await resolveOfficialWebsite(input, serperKey);
    return NextResponse.json({
      website,
      companyName: input,
      source: "search",
      candidates,
    });
  } catch (err) {
    const status = err instanceof SerperError ? 422 : 500;
    return NextResponse.json({ error: (err as Error).message || "Failed to resolve website." }, { status });
  }
}
