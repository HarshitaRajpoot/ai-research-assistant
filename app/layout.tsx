import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/components/SettingsContext";

export const metadata: Metadata = {
  title: "AI Research Assistant",
  description:
    "Company intelligence, distilled in minutes - AI-powered company research, competitor analysis, and PDF reports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-white antialiased">
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
