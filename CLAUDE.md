# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**MARÉ** — static web app showing tide predictions for the main ports of mainland Portugal. PT-PT only. The product is a one-page-per-port-per-day site (`/[port]/[date]`) with a smooth tide curve, sunrise/sunset markers, and a "% of annual max range" indicator.

Reference layout: see the screenshot the user supplied when initializing the project (a tide-app card with curve, high/low callouts, sunrise/sunset chips, range bar).

## Architecture

The whole site is **prerendered static HTML** served from Vercel. There is no production runtime — no server, no database, no API.

```
┌─────────────────────────┐         ┌──────────────────────┐         ┌───────────────────┐
│ GitHub Actions cron     │ writes  │ data/<port>.json     │ feeds   │ Astro static site │
│ scrapes per-port sites  │────────▶│ committed to repo    │────────▶│ prerenders pages  │
│ nightly                 │         │                      │         │ to Vercel         │
└─────────────────────────┘         └──────────────────────┘         └───────────────────┘
```

- **Acquisition (A4):** one scraper per Portuguese port-authority site, under `scrapers/<port>.ts`, each exporting a `PortScraper` (see `scrapers/types.ts`). Each scraper fetches ~30 days of forward predictions per run.
- **Storage:** plain JSON files in `data/`. Each file holds `{ port, lastScrapeOk, days: { 'YYYY-MM-DD': { events: [...] } } }`. Predictions are deterministic, so a missed scrape day is invisible (yesterday's run already covered today).
- **Build:** Astro statically generates `today ± 365 days × N ports ≈ 8000 pages` from the JSON files. Cloudflare/Vercel rebuilds on every push.
- **Chart:** hand-rolled SVG in a small **Svelte** island (`src/components/TideChart.svelte`). The curve between scraped high/low events is reconstructed with **half-cosine interpolation** — this is intentional and adequate to ≤10 cm accuracy. Do not pull in a charting library.
- **Sunrise/sunset:** computed client-side with `suncalc` from per-port lat/lon in `src/lib/ports.ts`.
- **"% of annual max range" bar:** computed locally from the rolling year of scraped data per port — no external constants.

## Commands

```bash
npm install           # install deps
npm run dev           # dev server on http://localhost:4321
npm run build         # static build → dist/
npm run preview       # serve dist/ locally
npm run scrape:all    # run every scraper (used by the GH Actions cron)
npm run scrape:<port> # run a single port's scraper (e.g. scrape:lisboa)
```

There are no tests yet. When adding them, prefer:
- Unit tests for `src/lib/tides.ts` (cosine interpolation edge cases — empty events, single event, events spanning midnight).
- Snapshot tests for each scraper against a checked-in HTML fixture (so a port-authority redesign produces a failing test, not a silent regression).

## Module layout

- `src/pages/index.astro` — port-picker grid at `/`.
- `src/pages/[port]/[date].astro` — the main tide page. `getStaticPaths` enumerates the port × date matrix from `src/lib/ports.ts` and the data files.
- `src/components/TideChart.svelte` — the chart island. Receives `events: TideEvent[]` and renders the SVG.
- `src/lib/ports.ts` — port registry (slug, name, lat, lon). The only source of truth for which ports exist.
- `src/lib/tides.ts` — `TideEvent` type and cosine `interpolateCurve(events, start, end, samples)`.
- `src/lib/time.ts` — `formatTime` (`06h55`) and PT-PT `formatDate`.
- `src/styles/global.css` — CSS custom properties for the palette (tide-high pink, tide-low blue, etc.) and the `prefers-color-scheme: dark` overrides.
- `scrapers/` — one module per port, plus `scrapers/types.ts`.
- `data/` — JSON files written by scrapers and consumed by Astro at build time.
- `.github/workflows/scrape.yml` — nightly cron that runs scrapers and commits `data/`.

## Locked design decisions

These came out of a grilling session before any code was written. They're load-bearing — don't unwind them without a reason.

- **A4 / per-port scrapers, not IH (Instituto Hidrográfico).** IH's tide widget is JS-rendered (no plain HTTP scrape), and port-authority sites give us scrapeable HTML closer to the actual port data. Trade-off accepted: N scrapers to maintain.
- **Cosine interpolation, not harmonic synthesis.** We don't source harmonic constants. The visual difference on a phone chart is invisible.
- **Static site + GH Actions cron, not a backend.** Tide predictions don't need real-time freshness; daily refresh is plenty.
- **Astro + Svelte chart island.** Astro for SSG and routing; one Svelte component for the interactive chart. No SPA shell.
- **`/[port]/[date]` URLs**, both URL segments are real (no query string, no hash). Sharing the URL shares the exact view. ±365 days rolling.
- **PT-PT only**, no i18n routing. Add EN later as a mechanical refactor if usage justifies.
- **24h time with `h` separator** — `06h55`, not `06:55` and definitely not `6:55 am`. Matches the PT print convention used by IH itself.
- **"% of annual max range" replaces the French coefficient.** Locally computable, more meaningful to PT users.
- **Stale-with-banner failure mode.** Never throw an error at the user when a scraper breaks — show the most recent data we have, with a banner if it's >2 days old.
- **Web Share API + copy-link fallback** for sharing. No image generation in v1.
- **Plain CSS with custom properties**, automatic dark mode via `prefers-color-scheme`. No Tailwind, no PWA, no toggle UI for v1.
- **Vercel hosting**, free tier. GH Actions cron commits to repo; Vercel auto-builds.

## Ports in scope

11 mainland ports, defined in `src/lib/ports.ts`:

Viana do Castelo, Leixões, Aveiro, Figueira da Foz, Peniche, Cascais, Lisboa, Sines, Lagos, Faro, Vila Real de Santo António.

Madeira and Azores are out of scope for v1.

## Out of scope / deferred

- PWA / offline (re-evaluate if usage demands it).
- OG image generation per port-date.
- Madeira / Azores.
- EN translation.
- Observed (real-time) water levels — only predictions for now.
- Harmonic synthesis fallback.
- IH PDF parsing as backup data source.
