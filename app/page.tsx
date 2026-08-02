"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import InputBar from "@/components/InputBar";
import { useSettings } from "@/components/SettingsContext";
import type { ChatMessage, CrawledPage, ProgressStep, ResearchResult } from "@/lib/types";

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request to ${url} failed (${res.status}).`);
  }
  return data as T;
}

const INITIAL_STEPS: ProgressStep[] = [
  { id: "resolve", label: "Identifying official website", status: "active" },
  { id: "crawl", label: "Crawling website for key pages", status: "pending" },
  { id: "analyze", label: "Searching the web and generating AI insights", status: "pending" },
];

export default function Home() {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function addMessage(msg: ChatMessage) {
    setMessages((prev) => [...prev, msg]);
  }

  function patchMessage(id: string, patch: Partial<ChatMessage>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function patchStep(progressId: string, stepId: string, patch: Partial<ProgressStep>) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== progressId || !m.steps) return m;
        return { ...m, steps: m.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) };
      })
    );
  }

  function handleNewResearch() {
    setMessages([]);
    setMobileNavOpen(false);
  }

  async function handleSubmit(input: string) {
    if (isBusy) return;
    setIsBusy(true);

    addMessage({ id: genId(), role: "user", kind: "text", text: input, createdAt: Date.now() });

    const progressId = genId();
    addMessage({
      id: progressId,
      role: "assistant",
      kind: "progress",
      steps: INITIAL_STEPS.map((s) => ({ ...s })),
      createdAt: Date.now(),
    });

    try {
      const resolved = await postJson<{ website: string; companyName: string }>("/api/resolve", {
        input,
        serperKey: settings.serperKey,
      });
      patchStep(progressId, "resolve", { status: "done", detail: resolved.website });
      patchStep(progressId, "crawl", { status: "active" });

      const crawled = await postJson<{ pages: CrawledPage[]; phone?: string }>("/api/crawl", {
        website: resolved.website,
      });
      patchStep(progressId, "crawl", { status: "done", detail: `${crawled.pages.length} pages found` });
      patchStep(progressId, "analyze", { status: "active" });

      const report = await postJson<ResearchResult>("/api/research", {
        website: resolved.website,
        companyName: resolved.companyName,
        pages: crawled.pages,
        phone: crawled.phone,
        serperKey: settings.serperKey,
        openrouterKey: settings.openrouterKey,
        model: settings.model,
      });
      patchStep(progressId, "analyze", { status: "done" });

      patchMessage(progressId, {
        kind: "report",
        report,
        discordAutoStatus: null,
      });

      const discordConfigured = Boolean(settings.discordBotToken && settings.discordChannelId);
      if (discordConfigured) {
        postJson("/api/discord", {
          research: report,
          botToken: settings.discordBotToken,
          channelId: settings.discordChannelId,
          applicantName: settings.applicantName,
          applicantEmail: settings.applicantEmail,
        })
          .then(() => patchMessage(progressId, { discordAutoStatus: "sent" }))
          .catch(() => patchMessage(progressId, { discordAutoStatus: "failed" }));
      }
    } catch (err) {
      const message = (err as Error).message || "Something went wrong.";
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== progressId || !m.steps) return m;
          const steps = [...m.steps];
          const activeIdx = steps.findIndex((s) => s.status === "active");
          if (activeIdx !== -1) steps[activeIdx] = { ...steps[activeIdx], status: "error", detail: message };
          return { ...m, steps };
        })
      );
      addMessage({
        id: genId(),
        role: "assistant",
        kind: "error",
        errorMessage: message,
        createdAt: Date.now(),
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      <div className="hidden md:block">
        <Sidebar onNewResearch={handleNewResearch} />
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-50">
            <Sidebar onNewResearch={handleNewResearch} />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-surface-border px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="rounded-md p-1.5 text-white/60 hover:bg-surface-card hover:text-white md:hidden"
              aria-label="Toggle menu"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <span className="text-sm font-medium text-white/70">Company Research</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
          </span>
        </header>

        <ChatPanel messages={messages} onExampleClick={handleSubmit} />

        <div className="border-t border-surface-border px-4 py-4 sm:px-8">
          <InputBar onSubmit={handleSubmit} disabled={isBusy} />
          <p className="mt-2 text-center text-[11px] text-white/25">
            AI Research Assistant can make mistakes. Verify important details before relying on this report.
          </p>
        </div>
      </main>
    </div>
  );
}
