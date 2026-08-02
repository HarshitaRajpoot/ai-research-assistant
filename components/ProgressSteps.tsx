"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import type { ProgressStep } from "@/lib/types";

export default function ProgressSteps({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-2.5">
          {step.status === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
          {step.status === "active" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />}
          {step.status === "pending" && <Circle className="h-4 w-4 shrink-0 text-white/20" />}
          {step.status === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span
            className={
              step.status === "pending"
                ? "text-sm text-white/35"
                : step.status === "error"
                ? "text-sm text-red-300"
                : step.status === "active"
                ? "text-sm text-white/90"
                : "text-sm text-white/60"
            }
          >
            {step.label}
            {step.detail ? <span className="ml-1.5 text-white/40">· {step.detail}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
