"use client";

import { useEffect, useState } from "react";
import { Check, Key, MessageSquare } from "lucide-react";
import { useSettings } from "./SettingsContext";

interface ModelOption {
  id: string;
  name: string;
}

const FALLBACK_MODELS: ModelOption[] = [
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat" },
];

type Tab = "api" | "discord";

export default function SettingsPanel() {
  const { settings, updateSettings } = useSettings();
  const [tab, setTab] = useState<Tab>("api");
  const [models, setModels] = useState<ModelOption[]>(FALLBACK_MODELS);
  const [savedPulse, setSavedPulse] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openrouterKey: settings.openrouterKey }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.models) && data.models.length > 0) {
          setModels(data.models);
        }
      })
      .catch(() => {
        /* keep fallback list */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flashSaved() {
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 1600);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-1">
        <button
          onClick={() => setTab("api")}
          className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
            tab === "api" ? "bg-surface-card text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          <Key className="h-3.5 w-3.5" /> API
        </button>
        <button
          onClick={() => setTab("discord")}
          className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
            tab === "discord" ? "bg-surface-card text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Discord
        </button>
      </div>

      {tab === "api" ? (
        <div className="flex flex-col gap-2.5 rounded-lg border border-surface-border bg-surface p-3">
          <Field
            label="Serper.dev API Key"
            value={settings.serperKey}
            placeholder="Your Serper API key"
            type="password"
            onChange={(v) => updateSettings({ serperKey: v })}
          />
          <Field
            label="OpenRouter API Key"
            value={settings.openrouterKey}
            placeholder="sk-or-..."
            type="password"
            onChange={(v) => updateSettings({ openrouterKey: v })}
          />
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/40">AI Model</label>
            <input
              list="model-options"
              value={settings.model}
              onChange={(e) => updateSettings({ model: e.target.value })}
              placeholder="anthropic/claude-sonnet-4.5"
              className="w-full rounded-md border border-surface-border bg-surface-card px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand/60"
            />
            <datalist id="model-options">
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </datalist>
          </div>
          <button
            onClick={flashSaved}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-md bg-brand py-1.5 text-xs font-semibold text-black transition hover:bg-brand-light"
          >
            {savedPulse ? (
              <>
                <Check className="h-3.5 w-3.5" /> Saved
              </>
            ) : (
              "Save Configuration"
            )}
          </button>
          <p className="text-[10px] leading-relaxed text-white/30">
            Keys are stored only in this browser (localStorage) and sent directly to this app&apos;s server on each
            request. They are never logged or persisted server-side.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-lg border border-surface-border bg-surface p-3">
          <Field
            label="Bot Token"
            value={settings.discordBotToken}
            placeholder="Discord bot token"
            type="password"
            onChange={(v) => updateSettings({ discordBotToken: v })}
          />
          <Field
            label="Channel ID"
            value={settings.discordChannelId}
            placeholder="e.g. 1123456789012345678"
            onChange={(v) => updateSettings({ discordChannelId: v })}
          />
          <Field
            label="Full Name"
            value={settings.applicantName}
            placeholder="Your full name"
            onChange={(v) => updateSettings({ applicantName: v })}
          />
          <Field
            label="Email Address"
            value={settings.applicantEmail}
            placeholder="you@example.com"
            onChange={(v) => updateSettings({ applicantEmail: v })}
          />
          <button
            onClick={flashSaved}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-md bg-brand py-1.5 text-xs font-semibold text-black transition hover:bg-brand-light"
          >
            {savedPulse ? (
              <>
                <Check className="h-3.5 w-3.5" /> Saved
              </>
            ) : (
              "Save Discord Config"
            )}
          </button>
          <p className="text-[10px] leading-relaxed text-white/30">
            After a report is generated, it will be sent automatically to this channel with the applicant details
            and the PDF attached.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/40">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-surface-border bg-surface-card px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand/60"
      />
    </div>
  );
}
