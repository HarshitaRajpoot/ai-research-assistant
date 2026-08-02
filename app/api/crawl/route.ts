import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/crawler";

// Crawling several pages can take a while - give this route more headroom
// than the platform default so it isn't killed mid-crawl.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const website = (body?.website ?? "").toString().trim();

    if (!website) {
      return NextResponse.json({ error: "Missing website to crawl." }, { status: 400 });
    }

    const result = await crawlWebsite(website);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to crawl website." },
      { status: 422 }
    );
  }
}
