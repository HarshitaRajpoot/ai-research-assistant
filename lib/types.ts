export interface CrawledPage {
  url: string;
  title: string;
  category: string;
  text: string;
}

export interface CrawlResult {
  website: string;
  pages: CrawledPage[];
  phone?: string;
  address?: string;
  emails?: string[];
  skipped: string[];
  robotsDisallowed: string[];
}

export interface SearchSnippet {
  title: string;
  link: string;
  snippet: string;
}

export interface Competitor {
  name: string;
  website: string;
}

export interface ResearchResult {
  companyName: string;
  website: string;
  phone: string;
  address: string;
  summary: string;
  products: string[];
  painPoints: string[];
  competitors: Competitor[];
  model: string;
  generatedAt: string;
  sources: SearchSnippet[];
}

export interface ApiKeys {
  serperKey?: string;
  openrouterKey?: string;
  model?: string;
}

export interface DiscordConfig {
  botToken?: string;
  channelId?: string;
  applicantName?: string;
  applicantEmail?: string;
}

export type ProgressStepStatus = "pending" | "active" | "done" | "error";

export interface ProgressStep {
  id: string;
  label: string;
  status: ProgressStepStatus;
  detail?: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  kind: "text" | "progress" | "report" | "error";
  text?: string;
  steps?: ProgressStep[];
  report?: ResearchResult;
  discordAutoStatus?: "sent" | "failed" | "skipped" | null;
  errorMessage?: string;
  createdAt: number;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}
