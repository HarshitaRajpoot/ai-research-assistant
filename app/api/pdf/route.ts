import { NextResponse } from "next/server";
import { generateResearchPdf } from "@/lib/pdf";
import type { ResearchResult } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as ResearchResult;
    if (!data?.companyName || !data?.website) {
      return NextResponse.json({ error: "Missing research data to render." }, { status: 400 });
    }

    const buffer = await generateResearchPdf(data);
    const filename = `${data.companyName.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-research-report.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to generate PDF." },
      { status: 500 }
    );
  }
}
