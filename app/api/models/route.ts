import { NextResponse } from "next/server";
import { listOpenRouterModels } from "@/lib/openrouter";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const openrouterKey = (body?.openrouterKey ?? "").toString().trim();

    const models = await listOpenRouterModels(openrouterKey || undefined);

    // Keep the payload light - the full catalog can be 300+ entries.
    const slim = models
      .map((m) => ({ id: m.id, name: m.name, context_length: m.context_length }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ models: slim });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load model list.", models: [] },
      { status: 200 }
    );
  }
}
