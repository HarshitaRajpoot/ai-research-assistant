import { NextResponse } from "next/server";
import { sendToDiscord, DiscordError } from "@/lib/discord";
import { generateResearchPdf } from "@/lib/pdf";
import type { ResearchResult } from "@/lib/types";

// Rendering the PDF and uploading it to Discord in one request benefits
// from extra headroom too.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const research = body?.research as ResearchResult;
    const botToken = (body?.botToken ?? "").toString().trim();
    const channelId = (body?.channelId ?? "").toString().trim();
    const applicantName = (body?.applicantName ?? "").toString().trim();
    const applicantEmail = (body?.applicantEmail ?? "").toString().trim();

    if (!research?.companyName) {
      return NextResponse.json({ error: "Missing research data to send." }, { status: 400 });
    }
    if (!botToken || !channelId) {
      return NextResponse.json(
        { error: "Add a Discord bot token and channel ID in Settings first." },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateResearchPdf(research);
    const filename = `${research.companyName.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-research-report.pdf`;

    await sendToDiscord({
      botToken,
      channelId,
      applicantName,
      applicantEmail,
      companyName: research.companyName,
      companyWebsite: research.website,
      pdfBytes: new Uint8Array(pdfBuffer),
      pdfFilename: filename,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof DiscordError ? 422 : 500;
    return NextResponse.json(
      { error: (err as Error).message || "Failed to send to Discord." },
      { status }
    );
  }
}
