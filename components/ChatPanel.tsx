"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Radar } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import ProgressSteps from "./ProgressSteps";
import ReportCard from "./ReportCard";

const EXAMPLES = ["stripe.com", "Tesla", "Microsoft", "OpenAI"];

export default function ChatPanel({
  messages,
  onExampleClick,
}: {
  messages: ChatMessage[];
  onExampleClick: (value: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, messages[messages.length - 1]?.steps, messages[messages.length - 1]?.report]);

  if (messages.length === 0) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-3xl"
        />
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] uppercase tracking-wide text-brand-light">
            <Radar className="h-3 w-3" /> AI-Powered Intelligence
          </div>
          <h1 className="max-w-xl text-3xl font-semibold text-white sm:text-4xl">
            Company intelligence, <br className="hidden sm:block" /> distilled in minutes.
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/50">
            Enter a company name or website URL to get AI-powered insights, competitor analysis, pain points, and a
            professional PDF report.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => onExampleClick(ex)}
                className="rounded-full border border-surface-border bg-surface-card px-3 py-1.5 text-xs text-white/60 transition hover:border-brand/40 hover:text-white"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-8">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.kind === "text" && (
            <div
              className={
                msg.role === "user"
                  ? "max-w-lg rounded-2xl bg-brand px-4 py-2.5 text-sm font-medium text-black"
                  : "max-w-lg rounded-2xl border border-surface-border bg-surface-card px-4 py-2.5 text-sm text-white/85"
              }
            >
              {msg.text}
            </div>
          )}

          {msg.kind === "progress" && msg.steps && (
            <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card px-4 py-4">
              <ProgressSteps steps={msg.steps} />
            </div>
          )}

          {msg.kind === "report" && msg.report && (
            <ReportCard report={msg.report} discordAutoStatus={msg.discordAutoStatus} />
          )}

          {msg.kind === "error" && (
            <div className="flex max-w-lg items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{msg.errorMessage}</span>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
