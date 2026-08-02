# AI Research Assistant

Company intelligence, distilled in minutes. Enter a company name or website URL and get an AI-generated company summary, products/services, pain points, competitor analysis, and a downloadable PDF report - all through a ChatGPT-style interface.

Built for the "Company Research Assistant" take-home assignment. Single unified Next.js project (frontend + backend API routes), no database, no auth.

**Live demo:** https://company-research-ai-inky.vercel.app
**Repository:** https://github.com/HarshitaRajpoot/ai-research-assistant

## Features

- **Dual input** - accepts a company name (e.g. `Stripe`) or a website URL (e.g. `https://stripe.com`). If given a name, it resolves the official website via Serper.dev first.
- **Website crawler** - discovers and fetches Home, About, Products, Services, Solutions, Pricing and Contact pages, ignores login/cart/account pages and non-HTML assets, dedupes URLs, and respects `robots.txt` (best effort).
- **Serper.dev search integration** - resolves official websites and enriches research with company overview, contact, and competitor search signals.
- **OpenRouter AI integration** - lets you pick *any* OpenRouter model (live-searchable list pulled from OpenRouter's own catalog) to generate the summary, pain points, and competitor suggestions. Output is requested as strict JSON with a defensive parser + one retry, since not every model supports a forced JSON mode.
- **Competitor analysis** - 3-6 competitors with name + website.
- **PDF report** - a professional, branded one-click PDF (generated server-side with `pdfkit`) containing everything above.
- **Discord bonus integration** - a Settings > Discord panel for Bot Token, Channel ID, applicant name/email. After each report is generated, it's automatically posted to the configured channel with the applicant details and the PDF attached.
- **ChatGPT-style UI** - conversation thread with live progress steps (searching -> crawling -> analyzing), report cards inline in the chat, example prompts, responsive/mobile-friendly layout.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Crawling | `cheerio` (HTML parsing) + native `fetch` |
| Search | Serper.dev REST API |
| AI | OpenRouter REST API (OpenAI-compatible chat completions) |
| PDF | `pdfkit` |
| Discord | Discord REST API (raw `fetch`, no SDK needed) |
| Hosting | Vercel (or any Node-compatible host) |

## How API keys work (important)

There is **no server-side `.env` requirement** to run this app. Each visitor pastes their own **Serper.dev** and **OpenRouter** API keys (and, optionally, Discord bot token/channel) into the **Settings** panel in the sidebar. Keys are stored only in the browser's `localStorage` and sent directly to this app's own API routes on each request - they are never logged, written to disk, or persisted server-side.

This means:
- You can deploy the app once, publicly, with no secrets baked in, and every evaluator/tester can use their own keys.
- If you'd rather not paste keys in the UI every time during local development, you can set the same values as environment variables (see `.env.example`) as a fallback - the app itself always prefers the values in Settings when present, this is purely a local convenience and not required.

## Local setup

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **API** in the sidebar, paste your Serper.dev and OpenRouter keys, pick a model, and try a company like `stripe.com`.

### Environment variables (all optional)

Copy `.env.example` to `.env.local` if you want defaults pre-filled instead of pasting keys every time:

| Variable | Required? | Purpose |
|---|---|---|
| `SERPER_API_KEY` | No | Fallback search key (Settings panel value always wins) |
| `OPENROUTER_API_KEY` | No | Fallback AI key (Settings panel value always wins) |
| `DISCORD_BOT_TOKEN` | No | Fallback Discord bot token |
| `DISCORD_CHANNEL_ID` | No | Fallback Discord channel ID |

### Getting API keys

- **Serper.dev**: sign up at https://serper.dev - the free tier includes a batch of search credits. Copy the API key from your dashboard.
- **OpenRouter**: sign up at https://openrouter.ai and create a key under https://openrouter.ai/keys - no payment required. The Settings panel defaults to `openai/gpt-oss-20b:free`, one of several `:free`-suffixed models OpenRouter hosts at no cost (20 requests/min, 50/day on a plain free account). Any paid model slug works too if you'd rather add credit (most cost fractions of a cent per report).
- **Discord bot (optional, bonus feature)**:
  1. Go to https://discord.com/developers/applications -> **New Application**.
  2. Open the **Bot** tab -> **Reset Token** -> copy it (this is your `Bot Token`).
  3. Under **Privileged Gateway Intents** you don't need any extra intents for this feature (it only sends messages, it doesn't read them).
  4. Go to **OAuth2 -> URL Generator**, check scope `bot`, and permissions `Send Messages` + `Attach Files`. Open the generated URL to invite the bot to your server.
  5. In Discord, enable Developer Mode (User Settings -> Advanced), right-click the target channel -> **Copy Channel ID**.
  6. Paste both into the app's Settings > Discord tab along with your name/email, click Save.

## Deploying to Vercel

### Option A - Vercel dashboard (no CLI needed)

1. Push this folder to a new GitHub repository.
2. Go to https://vercel.com/new, import the repository.
3. Framework preset auto-detects "Next.js" - leave build settings as default (`npm run build`).
4. You do **not** need to set any environment variables for the app to work (see "How API keys work" above). Optionally add `SERPER_API_KEY` / `OPENROUTER_API_KEY` / `DISCORD_BOT_TOKEN` / `DISCORD_CHANNEL_ID` if you want server-side fallback defaults.
5. Click **Deploy**. You'll get a public `*.vercel.app` URL.

### Option B - Vercel CLI

```bash
npm i -g vercel
cd company-research-ai
vercel login
vercel --prod
```

Follow the prompts (link to a new project, keep default settings). The CLI prints your public production URL when it finishes.

### Deploying elsewhere

Any Node 20+ host that supports Next.js API routes works (Netlify, Cloudflare via `@cloudflare/next-on-pages`, Render, Railway, a plain VM with `npm run build && npm run start`). No database or persistent volume is required.

## Project structure

```
app/
  page.tsx                 Main chat UI (client component, orchestrates the pipeline)
  layout.tsx                Root layout, wraps app in SettingsProvider
  globals.css                Tailwind base + small custom styles
  api/
    resolve/route.ts         Company name/URL -> official website (Serper + heuristics)
    crawl/route.ts            Website -> crawled pages, phone, emails
    research/route.ts         Crawled content + search snippets -> AI JSON report
    models/route.ts            Live OpenRouter model catalog
    pdf/route.ts                Research JSON -> downloadable PDF
    discord/route.ts            Research JSON -> Discord message + PDF attachment
lib/
  types.ts                  Shared TypeScript types
  serper.ts                   Serper.dev client + official-website resolution heuristics
  crawler.ts                    Website crawler (discovery, skip rules, text extraction)
  openrouter.ts                  OpenRouter client + defensive JSON parsing
  pdf.ts                          PDF report generation (pdfkit)
  discord.ts                       Discord REST API sender
components/
  SettingsContext.tsx        localStorage-backed settings (API keys, model, Discord config)
  Sidebar.tsx / SettingsPanel.tsx  Sidebar with New Research + API/Discord settings tabs
  ChatPanel.tsx / ProgressSteps.tsx / ReportCard.tsx / InputBar.tsx   Chat UI pieces
```

## Design notes / known limitations

- **Crawling** is best-effort: some sites (Cloudflare/Akamai-protected, JS-only SPAs) will block or return little content from a plain server-side fetch. The app fails gracefully with a clear error message rather than hanging or crashing, and search snippets from Serper still get used for the AI analysis even if crawling comes back thin.
- **Any OpenRouter model** can be selected, so the AI call cannot rely on provider-specific "JSON mode" - instead the prompt requests strict JSON and the response is parsed defensively with one automatic retry if the model's first reply isn't valid JSON.
- Chat history and settings are kept only in the browser (React state + `localStorage`) - refreshing the page starts a new conversation, per the "no database, no report history required" spec.
