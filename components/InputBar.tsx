"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export default function InputBar({
  onSubmit,
  disabled,
}: {
  onSubmit: (value: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-card p-2 shadow-glow">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
        placeholder="Enter a company name (e.g. Stripe) or website URL, e.g. https://stripe.com..."
        className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-50"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Research <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
