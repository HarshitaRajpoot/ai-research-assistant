"use client";

import { Plus, Radar } from "lucide-react";
import SettingsPanel from "./SettingsPanel";

const STEPS = [
  "Enter a company name or URL",
  "Serper.dev searches and we crawl the site",
  "OpenRouter AI generates insights",
  "Download a professional PDF report",
];

export default function Sidebar({ onNewResearch }: { onNewResearch: () => void }) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-4 border-r border-surface-border bg-surface-raised p-4 overflow-y-auto">
      <div className="flex items-center gap-2 px-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/15 text-brand">
          <Radar className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-white">AI Research Assistant</span>
      </div>

      <button
        onClick={onNewResearch}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-medium text-white/85 transition hover:border-brand/50 hover:text-white"
      >
        <Plus className="h-4 w-4" /> New Research
      </button>

      <SettingsPanel />

      <div className="mt-auto rounded-lg border border-surface-border bg-surface p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">How it works</div>
        <ol className="space-y-1.5">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-2 text-xs text-white/50">
              <span className="text-brand">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
