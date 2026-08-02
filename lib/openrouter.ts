const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export class OpenRouterError extends Error {}

interface ChatMessagePayload {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessagePayload[]
): Promise<string> {
  if (!apiKey) {
    throw new OpenRouterError("Missing OpenRouter API key. Add it in Settings.");
  }
  if (!model) {
    throw new OpenRouterError("No AI model selected. Pick one in Settings.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-research-assistant.vercel.app",
        "X-Title": "AI Research Assistant",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) {
        throw new OpenRouterError("OpenRouter rejected the API key (401). Check the key in Settings.");
      }
      if (res.status === 402) {
        throw new OpenRouterError("OpenRouter reports insufficient credits for this key/model.");
      }
      if (res.status === 404) {
        throw new OpenRouterError(`Model "${model}" was not found on OpenRouter.`);
      }
      throw new OpenRouterError(`OpenRouter request failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new OpenRouterError("OpenRouter returned an empty response.");
    }
    return content;
  } catch (err) {
    if (err instanceof OpenRouterError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new OpenRouterError("OpenRouter request timed out. Try a faster model.");
    }
    throw new OpenRouterError(`OpenRouter request failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Pulls the first balanced {...} JSON object out of arbitrary model output. */
function extractJsonObject(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return text;

  let depth = 0;
  for (let i = firstBrace; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(firstBrace, i + 1);
    }
  }
  return text.slice(firstBrace);
}

/**
 * Calls a chat model and asks it to return strict JSON. Since users may pick
 * *any* OpenRouter model, we can't rely on provider-specific JSON modes -
 * instead we prompt for JSON explicitly and parse defensively, retrying once
 * with a stricter instruction if the first attempt isn't parseable.
 */
export async function callOpenRouterJSON<T>(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const messages: ChatMessagePayload[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const first = await chatCompletion(apiKey, model, messages);
  try {
    return JSON.parse(extractJsonObject(first)) as T;
  } catch {
    // Retry once with a stricter nudge, feeding the bad output back so the
    // model can see and correct its own formatting mistake.
    const retry = await chatCompletion(apiKey, model, [
      ...messages,
      { role: "assistant", content: first },
      {
        role: "user",
        content:
          "That was not valid JSON. Reply again with ONLY a single valid JSON object, no markdown fences, no commentary, no trailing text.",
      },
    ]);
    try {
      return JSON.parse(extractJsonObject(retry)) as T;
    } catch (err) {
      throw new OpenRouterError(
        `The model (${model}) did not return valid JSON after two attempts. Try a different model.`
      );
    }
  }
}

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

let modelCache: { data: OpenRouterModelInfo[]; fetchedAt: number } | null = null;
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

export async function listOpenRouterModels(apiKey?: string): Promise<OpenRouterModelInfo[]> {
  if (modelCache && Date.now() - modelCache.fetchedAt < MODEL_CACHE_TTL_MS) {
    return modelCache.data;
  }

  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(OPENROUTER_MODELS_URL, { headers });
  if (!res.ok) {
    throw new OpenRouterError(`Could not fetch OpenRouter model list (${res.status}).`);
  }
  const data = await res.json();
  const models: OpenRouterModelInfo[] = (data?.data ?? []).map((m: any) => ({
    id: m.id,
    name: m.name ?? m.id,
    context_length: m.context_length,
    pricing: m.pricing,
  }));

  modelCache = { data: models, fetchedAt: Date.now() };
  return models;
}
