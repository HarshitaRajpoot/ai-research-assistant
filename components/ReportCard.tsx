"use client";

import { useState } from "react";
import {
  Building2,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Users,
} from "lucide-react";
import type { ResearchResult } from "@/lib/types";
import { useSettings } from "./SettingsContext";

type ActionStatus = "idle" | "loading" | "success" | "error";

export default function ReportCard({
  report,
  discordAutoStatus,
}: {
  report: ResearchResult;
  discordAutoStatus?: "sent" | "failed" | "skipped" | null;
}) {
  const { settings } = useSettings();
  const [pdfStatus, setPdfStatus] = useState<ActionStatus>("idle");
  const [discordStatus, setDiscordStatus] = useState<ActionStatus>(
    discordAutoStatus === "sent" ? "success" : discordAutoStatus === "failed" ? "error" : "idle"
  );
  const [discordMessage, setDiscordMessage] = useState<string>(
    discordAutoStatus === "sent" ? "Sent to Discord automatically" : ""
  );
  const [showSources, setShowSources] = useState(false);

  const discordConfigured = Boolean(settings.discordBotToken && settings.discordChannelId);

  async function handleDownloadPdf() {
    setPdfStatus("loading");
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.companyName.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-research-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPdfStatus("success");
      setTimeout(() => setPdfStatus("idle"), 2500);
    } catch {
      setPdfStatus("error");
      setTimeout(() => setPdfStatus("idle"), 3000);
    }
  }

  async function handleSendDiscord() {
    setDiscordStatus("loading");
    try {
      const res = await fetch("/api/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          research: report,
          botToken: settings.discordBotToken,
          channelId: settings.discordChannelId,
          applicantName: settings.applicantName,
          applicantEmail: settings.applicantEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send to Discord");
      setDiscordStatus("success");
      setDiscordMessage("Sent to Discord");
    } catch (err) {
      setDiscordStatus("error");
      setDiscordMessage((err as Error).message);
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-surface-border bg-surface-card p-5 shadow-glow animate-fade-in sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand" />
            <h3 className="text-lg font-semibold text-white">{report.companyName}</h3>
          </div>
          <a
            href={report.website}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-brand-light hover:underline"
          >
            {report.website}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Research Complete
        </span>
      </div>

      {report.summary ? <p className="mt-4 text-sm leading-relaxed text-white/70">{report.summary}</p> : null}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/40">
            <Phone className="h-3.5 w-3.5" /> Phone
          </div>
          <p className="mt-1 text-sm text-white/85">{report.phone || "Not publicly listed"}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/40">
            <MapPin className="h-3.5 w-3.5" /> Address
          </div>
          <p className="mt-1 text-sm text-white/85">{report.address || "Not publicly listed"}</p>
        </div>
      </div>

      {report.products.length > 0 && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wide text-white/40">Products &amp; Services</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.products.map((p, i) => (
              <span
                key={i}
                className="rounded-full border border-surface-border bg-surface px-3 py-1 text-xs text-white/80"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {report.painPoints.length > 0 && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wide text-brand-light">AI-Generated Pain Points</div>
          <ul className="mt-2 space-y-1.5">
            {report.painPoints.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/75">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.competitors.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/40">
            <Users className="h-3.5 w-3.5" /> Competitors
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {report.competitors.map((c, i) => (
              <a
                key={i}
                href={/^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm hover:border-brand/50"
              >
                <div className="font-medium text-white/85">{c.name}</div>
                {c.website ? <div className="truncate text-xs text-white/40">{c.website}</div> : null}
              </a>
            ))}
          </div>
        </div>
      )}

      {report.sources?.length > 0 && (
        <div className="mt-5 border-t border-surface-border pt-3">
          <button
            onClick={() => setShowSources((s) => !s)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSources ? "rotate-180" : ""}`} />
            {showSources ? "Hide" : "Show"} {report.sources.length} source{report.sources.length === 1 ? "" : "s"}
          </button>
          {showSources && (
            <ul className="mt-2 space-y-1">
              {report.sources.map((s, i) => (
                <li key={i} className="truncate text-xs text-white/40">
                  <a href={s.link} target="_blank" rel="noreferrer" className="hover:text-brand-light hover:underline">
                    {s.title || s.link}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={handleDownloadPdf}
          disabled={pdfStatus === "loading"}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-light disabled:opacity-60"
        >
          {pdfStatus === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : pdfStatus === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {pdfStatus === "success" ? "Downloaded" : "Download PDF Report"}
        </button>

        {discordConfigured && (
          <button
            onClick={handleSendDiscord}
            disabled={discordStatus === "loading"}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-white/85 transition hover:border-brand/50 disabled:opacity-60"
          >
            {discordStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : discordStatus === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : discordStatus === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-400" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {discordStatus === "success" ? "Sent to Discord" : "Send to Discord"}
          </button>
        )}
        {discordStatus === "error" && discordMessage ? (
          <span className="text-xs text-red-400">{discordMessage}</span>
        ) : null}
      </div>
    </div>
  );
}
