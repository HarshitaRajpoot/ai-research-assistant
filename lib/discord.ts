export class DiscordError extends Error {}

export interface DiscordSendParams {
  botToken: string;
  channelId: string;
  applicantName?: string;
  applicantEmail?: string;
  companyName: string;
  companyWebsite: string;
  pdfBytes: Uint8Array;
  pdfFilename: string;
}

/**
 * Sends a research report to a Discord channel via the raw Discord REST
 * API (no discord.js dependency needed for a single message + attachment).
 */
export async function sendToDiscord(params: DiscordSendParams): Promise<void> {
  const { botToken, channelId } = params;
  if (!botToken || !channelId) {
    throw new DiscordError("Discord bot token and channel ID are required. Configure them in Settings.");
  }

  const lines = [
    "**New Company Research Report**",
    "",
    `**Applicant:** ${params.applicantName || "N/A"} (${params.applicantEmail || "N/A"})`,
    `**Company:** ${params.companyName}`,
    `**Website:** ${params.companyWebsite}`,
  ];

  const payload = { content: lines.join("\n") };

  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  form.append(
    "files[0]",
    new Blob([pdfBytesToArrayBuffer(params.pdfBytes)], { type: "application/pdf" }),
    params.pdfFilename
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) {
        throw new DiscordError("Discord rejected the bot token (401). Check it in Settings.");
      }
      if (res.status === 403) {
        throw new DiscordError("Discord bot lacks permission to post in that channel (403).");
      }
      if (res.status === 404) {
        throw new DiscordError("Discord channel ID not found (404). Check it in Settings.");
      }
      throw new DiscordError(`Discord send failed (${res.status}): ${body.slice(0, 300)}`);
    }
  } catch (err) {
    if (err instanceof DiscordError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new DiscordError("Discord request timed out.");
    }
    throw new DiscordError(`Discord send failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

function pdfBytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
