"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface SettingsState {
  serperKey: string;
  openrouterKey: string;
  model: string;
  discordBotToken: string;
  discordChannelId: string;
  applicantName: string;
  applicantEmail: string;
}

const DEFAULT_SETTINGS: SettingsState = {
  serperKey: "",
  openrouterKey: "",
  model: "openai/gpt-oss-20b:free",
  discordBotToken: "",
  discordChannelId: "",
  applicantName: "",
  applicantEmail: "",
};

const STORAGE_KEY = "company-research-ai:settings:v1";

interface SettingsContextValue {
  settings: SettingsState;
  updateSettings: (patch: Partial<SettingsState>) => void;
  hydrated: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore corrupt localStorage
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota errors
    }
  }, [settings, hydrated]);

  const updateSettings = (patch: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const value = useMemo(() => ({ settings, updateSettings, hydrated }), [settings, hydrated]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
