# PRD — Geo-aware entry & 5-day forecast

Status: ready-for-agent
Author: synthesised from /grill-me session, 2026-05-28

## Problem Statement

Users on the Portuguese coast — fishers, surfers, beachgoers, boat owners — open MARÉ when they need to know what the tide is doing *near them right now*. The v0 design gives them an 11-port grid to pick from and one day at a time, forcing two interactions before any tide info is visible (pick a port, then know which date they want), and never tells them which port is actually closest to where they are.

A single day is also a poor window for the real use cases — planning a fishing trip on Saturday, deciding which evening this week has a baixa-mar at sunset, knowing whether tomorrow's tides are spring or neap. All of those need a *week-at-a-glance* view, not "Monday only, then click for Tuesday."

The site additionally has a latent DST bug: the seed data and `TideChart.svelte` hard-code the WEST offset `+01:00`, so any winter date renders an hour off.

## Solution

Two coupled reshaping changes to the v0 plan, executed together.

**A geo-aware entry.** Landing on `/` shows a soft pre-ask explaining that MARÉ uses location to surface the closest port. If the user taps **Localizar-me**, the browser permission prompt fires; on grant the page renders a Leaflet map of mainland Portugal with the user's pin, all 11 port markers, and a floating card naming the nearest port. The user picks a marker. The static 11-port grid is the deny-path / no-JS fallback. Returning users with permission already granted skip the pre-ask via the Permissions API. The map uses CARTO Light or Dark Matter raster tiles depending on `prefers-color-scheme`, with a live system-theme listener.

**A 5-day forecast per port.** Each port URL becomes `/[port]` (no date). The page renders today + next 4 days as a vertical stack of daily cards. Each card has its own tide curve (continuous across midnight via bounding events from adjacent days), high/low pills, an amplitude bar showing that day's range as a percentage of the rolling maximum observed for that port, and dotted sunrise/sunset markers on the curve. The first card is "Hoje" — slightly taller, with a live "now" vertical line. Above the stack, a header callout reads e.g. *Maré a subir · Próxima preia-mar: 14h22 (em 3h 5min)*. Callout and now-line update every 60 seconds and on `visibilitychange`. A share button in the page header invokes the Web Share API with the canonical URL, falling back to clipboard copy with a `Link copiado ✓` toast.

The whole site stays 100% prerendered static HTML. Only the location gate, the map, the forecast island, and the (inline) share handler hydrate on the client.

## User Stories

1. As a surfer in Cascais, I want the site to tell me which port's tide schedule applies to where I am, so that I don't have to know that Cascais is in fact closer to me than Lisboa.
2. As a fisher in Peniche, I want to grant location permission once and have subsequent visits skip the explainer screen, so that the second visit is faster than the first.
3. As a desktop user with location off, I want to see the list of 11 ports immediately when I deny or have no GPS, so that I am not blocked.
4. As a privacy-conscious user, I want a written assurance that my coordinates never leave the device before the browser prompt fires, so that I can make an informed decision about granting.
5. As a user near the border between two port zones (e.g. Setúbal, between Lisboa and Sines), I want to see the full map with all markers before being routed anywhere, so that I can pick deliberately rather than be auto-routed to one or the other.
6. As a returning user, I want a "Ver todos os portos" link visible from the map view, so that I can override the geolocation suggestion at any time without revoking my permission.
7. As a dark-mode device user, I want the map's basemap to match my system theme automatically, so that the map doesn't sit in a bright rectangle against a dark page.
8. As a user who toggles dark mode while the map is open, I want the basemap to swap without a full reload, so that the change feels seamless.
9. As a port-page user, I want to see five days of tides on a single page, so that I can plan a week ahead without clicking through dates.
10. As a port-page user, I want each daily card to label itself clearly (today emphasised, the rest by weekday + date), so that I know which day I'm reading without counting cards.
11. As a port-page user, I want the most useful single fact — when the next high or low tide is, and how long until it — surfaced above the chart, so that I don't have to scan the cards to find it.
12. As a port-page user, I want the next-tide countdown and the "now" line on today's card to stay current if I leave the tab open for hours or come back from a locked phone, so that the page never lies to me about the present moment.
13. As a port-page user, I want each daily curve to extend across the full 24h of the day even when the day's first tide event is at 04h, so that the chart doesn't visually truncate.
14. As a fisher, I want each card to show how big that day's tidal range is relative to the biggest observed for this port, so that I can spot spring tides at a glance across the week.
15. As a beachgoer, I want sunrise and sunset rendered as vertical markers on each curve, so that I can immediately see which tide events fall in daylight versus darkness.
16. As a port-page user, I want to share the page I'm on with one tap, so that I can send "look at the tides at Lagos this week" to a friend without copying anything manually.
17. As a port-page user on desktop where Web Share isn't supported, I want the share button to copy the URL to my clipboard and give me a quick visual confirmation, so that I have a fallback that doesn't fail silently.
18. As a port-page user, I want the page title and link-preview metadata (`og:title`, `og:description`) to read sensibly when the URL is shared into WhatsApp / Mensagens, so that the recipient sees what the link is about before clicking.
19. As a user, I want a banner to warn me when the 5-day forecast on the page I'm reading is missing days, so that I don't trust an incomplete week silently.
20. As a user, I want a different banner to warn me when the data source itself has been quiet for more than a week, so that I know to come back later rather than rely on data that may soon become stale.
21. As an operator, I want a nightly cron to scrape ~30 days of forward predictions per port and commit them to the repo, so that the static rebuild always has fresh data without a runtime.
22. As an operator, I want a per-port scrape failure to not affect the other ports' data, so that one port-authority redesign doesn't take down the whole site.
23. As an operator, I want partial-day parse failures inside a single port to save the days that *did* parse, so that 28-of-30 days is not silently treated the same as zero.
24. As an operator, I want the failed dates logged with the port name and reason in CI stdout, so that I can find regressions when reviewing the nightly workflow output.
25. As an operator, I want stored data older than 365 days to be pruned automatically each scrape run, so that the JSON files stay bounded forever.
26. As an operator, I want fresh scrape results for the same date to overwrite the stored prediction for that date by key, so that updated predictions replace older ones cleanly without duplicate events.
27. As a developer maintaining a scraper, I want the parse step to be a pure function `parse(html) → { days, failures }` separate from the HTTP step, so that I can write a fixture-based snapshot test that fails loudly when a port-authority site redesigns.
28. As a developer, I want all stored tide timestamps to be UTC with `Z` suffix, so that the DST switch days are never a special case in any downstream code.
29. As a developer, I want the chart and date-bucketing logic to derive "what Lisbon day is this UTC instant on" via `Intl.DateTimeFormat({ timeZone: 'Europe/Lisbon' })` rather than hard-coded offsets, so that summer and winter behave identically.
30. As a developer, I want pure math (interpolation, amplitude, sun, next-tide, geo distance) extracted into testable modules under `src/lib/`, so that the chart's correctness can be verified without rendering anything.
31. As a developer, I want each port's scraper parser to have a checked-in HTML fixture and a snapshot test, so that any change in the port-authority's HTML is detected before the next nightly run silently loses data.

## Implementation Decisions

### Routing & build
- One URL per port: `/[port]`. The `[port]/[date]` route is removed.
- Build matrix collapses from ~8000 to 11 static pages (one per port in `src/lib/ports.ts`).
- Each build computes the 5-day window relative to the build date. The nightly cron commit triggers a Vercel rebuild, so the window rolls forward daily.
- Server-side date math goes through `Intl.DateTimeFormat({ timeZone: 'Europe/Lisbon' })`; no hard-coded offsets anywhere.

### Data contract
- All `time` fields in `data/<port>.json` are UTC ISO 8601 with `Z` suffix. Scrapers convert from Lisbon civil time to UTC at parse time.
- The day-key in `days[...]` is the Lisbon civil day the event belongs to, not the UTC day. This is what makes the day-bucketing stable across DST.
- Per-port file shape stays `{ port, lastScrapeOk, days: { 'YYYY-MM-DD': { events: TideEvent[] } } }`. `lastScrapeOk` is a UTC ISO timestamp.

### Acquisition pipeline
- Each scraper module exports two functions:
  - `scrape(fromDate, days): Promise<{ days, failures }>` — does HTTP, calls `parse`, returns parse result.
  - `parse(html): { days, failures }` — pure, no I/O, used by fixture tests.
- HTML fetching uses native `fetch`. HTML parsing uses `cheerio`. No headless browser.
- Inside `parse()`, each day's parse is wrapped in a try/catch. Failures accumulate in the returned `failures` array as `{ date, reason }`; the rest of the days proceed normally.
- The runner merges scrape output into the stored JSON by date-key:
  `data.days[day.date] = { events: day.events }`.
  Past days are never overwritten because scrapers never return them.
- The runner updates `lastScrapeOk` if and only if the scrape returned at least one successfully-parsed day for that port.
- The runner prunes any day-key older than `today - 365` (Lisbon civil days) at the end of each run.
- The runner logs `[port] parsed K/N, missing: ...` to stdout per port. Errors from one port do not affect others.
- First concrete scraper: Lisboa (APL). Subsequent ports land one PR per port.

### Stale signals
The port page evaluates two named conditions at build time and renders different banner copy for each. Both can fire; render both as separate banners stacked above the cards.
- **window-incomplete** — any of the 5 rendered days is missing from `days`.
  Copy: *"Sem dados completos para esta semana — fonte temporariamente indisponível."*
- **source-quiet** — `now - lastScrapeOk > 7 days`.
  Copy: *"Fonte sem atualizações há N dias — dados podem desatualizar em breve."*

### Entry flow (`/`)
The page server-renders both the static port-grid (as fallback content) and a small `<script>` block. On load, the script calls `navigator.permissions.query({ name: 'geolocation' })` and branches:
- `granted` → hide grid, hydrate `MapPicker`, auto-fire `getCurrentPosition`, render map immediately.
- `prompt` → hide grid, hydrate `LocationGate` showing the soft pre-ask.
- `denied` → leave grid visible.
- Permissions API unavailable (or `query` rejects) → leave grid visible *and* show a "Localizar-me" button that triggers the pre-ask gesture.

`LocationGate` exposes two buttons:
- **Localizar-me** — primary. Triggers native prompt; on grant, mounts `MapPicker`.
- **Ver lista de portos** — secondary. Hides the gate, reveals the grid.

`MapPicker` is a Svelte island that dynamically imports Leaflet + CSS only after mount. Tile-layer URL chosen from `window.matchMedia('(prefers-color-scheme: dark)').matches`:
- light → `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`
- dark  → `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`

A `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` calls `tileLayer.setUrl(...)` to swap mid-session. Attribution: `© OpenStreetMap · © CARTO`.

`MapPicker` plots 11 port markers from `src/lib/ports.ts` plus a user pin at the GPS fix. The nearest port is computed via `nearestPort(fix, ports)` (haversine) and surfaced in a floating bottom card: `Porto mais próximo: {name} (~{km} km) →`, which links to `/[slug]`. A persistent "Ver todos os portos →" link is rendered in a corner regardless of permission state.

### Port page (`/[port]`)
**Build-time:**
- Compute `today` as Lisbon civil date.
- For each `d` in `[today, today+1, ..., today+4]`, call `getDayWindow(slug, d)` returning events from `data.days[d-1] ∪ data.days[d] ∪ data.days[d+1]`, concatenated and sorted by time.
- Evaluate `coverageStatus(slug, [today..today+4])`, render the appropriate banners.
- Render the share button in the header (static `<button>` with inline `<script>` handler).
- Mount the `Forecast` Svelte island with the full 5-day window data.

**Client (single hydration boundary — `Forecast`):**
- Renders the header callout: `{Maré a subir|a descer} · Próxima {preia-mar|baixa-mar}: {HHhMM} (em {Xh Ymin})`.
- Renders 5 `DailyCard` instances as sub-components (no separate hydration). First card emphasised: taller (~180 px vs ~120 px), `Hoje` chip, vertical now-line.
- `setInterval(_, 60_000)` re-evaluates the callout and shifts the now-line.
- `visibilitychange` listener triggers an immediate re-evaluation when the tab regains focus.
- `nextTide(events, now)` and `stateAt(events, now)` come from `src/lib/tides.ts`; countdown formatting comes from `src/lib/now.ts`.

**`DailyCard` content per day:**
- SVG curve from `interpolateCurve(window_events, dayStart, dayEnd, 144)`. `dayStart`/`dayEnd` derived via Intl in `Europe/Lisbon` — no hard-coded offsets.
- High/low pills *only* for events whose `time` falls within `[dayStart, dayEnd]`.
- Dotted vertical markers at sunrise/sunset (from `getSunTimes(date, port)`), each with small glyph + `HHhMM` label.
- Amplitude bar at the bottom. Computation: `amplitudePercent(day, allDays)` where `allDays` is the full rolling history from `portData[slug].days`. Label: `Amplitude: NN% do máximo registado` until history covers ≥365 days, then `máximo anual` (label switch is silent).
- Today's variant adds a vertical "now" line at the current Lisbon time.

### Share affordance
- Icon button in the port-page header (outbox-arrow SVG), right of the port name.
- Click handler is a tiny inline `<script>` block on the static page (no extra Svelte island).
- Tries `navigator.share({ url: canonicalUrl })`. On `TypeError` (API unsupported) or graceful absence, falls back to `navigator.clipboard.writeText(canonicalUrl)`. Shows an inline toast `Link copiado ✓` for 2s using `var(--accent)`.
- Static page metadata per port:
  `<meta property="og:title" content="Marés em {port.name}">`
  `<meta property="og:description" content="Previsões de marés nos próximos 5 dias em {port.name}, Portugal.">`
  No `og:image` in v1.

### Module structure

**Pure libs under `src/lib/` (deep, testable in isolation):**
- `tides.ts` *(extend existing)* — keep `interpolateCurve`, `stateAt`; add `nextEvent(now, events)` returning next high/low after `now`.
- `range.ts` *(new)* — `dayAmplitude(events)`, `rollingMaxAmplitude(allDays)`, `amplitudePercent(day, allDays)`.
- `sun.ts` *(new)* — thin wrapper around suncalc; `getSunTimes(date, port)` returns `{ sunrise, sunset }` as UTC instants.
- `now.ts` *(new)* — `nextTide(events, now)`, `nowOffsetPct(date, now)`, `countdownText(from, to)` returning strings like `em 3h 5min`, `em 12min`, `em menos de 1min`.
- `geolocation.ts` *(new)* — `permissionState()`, `getCurrentPosition()` Promise wrapper, `nearestPort(fix, ports)` via haversine. Mockable `navigator` for tests.
- `data.ts` *(extend existing)* — replace `getDay` with `getDayWindow(slug, date)`; add `forecastWindow(slug, today)` returning the 5-day spec the port page needs; add `coverageStatus(slug, days)` returning `{ windowIncomplete: boolean; sourceQuiet: boolean; ageDays: number; missingDates: string[] }`.

**Svelte islands (only what needs hydration):**
- `LocationGate.svelte` — pre-ask UI.
- `MapPicker.svelte` — Leaflet island; tile-URL swap by theme; markers + user pin + nearest card.
- `Forecast.svelte` — single hydration boundary for the whole port page; owns the 60s tick + visibilitychange handler; renders 5 `DailyCard` sub-components.
- `DailyCard.svelte` — sub-component of `Forecast`, **not** separately hydrated.

**Inline (not Svelte):**
- `ShareButton` is a static `<button>` with a small inline `<script>` block. No island.

**Astro pages:**
- `src/pages/index.astro` *(rewrite)* — port-grid fallback + LocationGate/MapPicker mount logic.
- `src/pages/[port].astro` *(new, replaces `[port]/[date].astro`)* — 5-day build, mounts `Forecast`, renders share button, renders banners.

**Scrapers:**
- `scrapers/types.ts` *(extend)* — `parse(html) → { days, failures }`; `failures: { date: string; reason: string }[]`.
- `scrapers/lib/parse-utils.ts` *(new)* — PT date parsing, decimal-comma height parsing, Lisbon-civil → UTC conversion.
- `scrapers/lib/merge.ts` *(new)* — pure by-key merge, retention pruning, lastScrapeOk policy. Inputs and outputs are plain objects so it's trivially testable.
- `scrapers/run-all.ts` *(rewrite)* — orchestrates fetch + parse + merge per port; writes JSON atomically per port; logs failures.
- `scrapers/lisboa.ts` *(new)* — first concrete port scraper.
- `scrapers/fixtures/<slug>.html` — checked-in HTML for tests, one per implemented port.

## Testing Decisions

Two test surfaces in scope for v1, both via Vitest with a shared Vite config so tests resolve the `~/*` path alias from `tsconfig.json`.

**Surface 1 — pure math libs.** Tests live colocated with source under `src/lib/*.test.ts`. Assert external behaviour only (given inputs, expect outputs); never test which intermediate functions are called.

- `tides.test.ts` — `interpolateCurve` edge cases (single event, two events spanning midnight, empty events array, events whose timestamps don't bracket the requested window); `nextEvent` correctness across event-list boundaries; `stateAt` rising/falling determination at exact event times.
- `range.test.ts` — `dayAmplitude` for synthetic event sets; `rollingMaxAmplitude` over a multi-month synthetic history including the case where the current day *is* the new max; `amplitudePercent` returning sensible values in the bootstrap state (history < 365 days) and the saturated state.
- `sun.test.ts` — `getSunTimes` returns UTC instants consistent with a known reference date for Lisboa (cross-check against a published civil sunrise time, allow ±2 minutes for refraction-model differences).
- `now.test.ts` — `nextTide` skipping past events; `countdownText` formatting (`em 3h 5min` / `em 12min` / `em menos de 1min`); `nowOffsetPct` boundary behaviour at 00h00 and 23h59 (Lisbon).

**Surface 2 — scraper parsers.** Tests live colocated with the scraper under `scrapers/<slug>.test.ts`, with checked-in HTML under `scrapers/fixtures/<slug>.html`. The pattern is:

```ts
import { parse } from './lisboa';
import { readFileSync } from 'node:fs';
const html = readFileSync('scrapers/fixtures/lisboa.html', 'utf-8');

test('lisboa parse — happy path', () => {
  expect(parse(html)).toMatchSnapshot();
});
```

The snapshot file *is* the regression test. When a port-authority redesigns its page, the snapshot diff names the regression. Additional cases in the same file feed deliberately-malformed fixtures (`fixtures/lisboa-missing-row.html`, `fixtures/lisboa-bad-decimal.html`) and assert that the corresponding `failures` array contains the expected `{ date, reason }` entries while good days still appear in `days`.

**What makes a good test here:** asserts on *what the function returns*, not on how it gets there. Snapshot tests are reviewed *for the diff* — not maintained as living spec. No mocking of `fetch` — `parse()` is pure, fixtures replace the network.

**Prior art:** none in this codebase yet. Patterns above are typical of Vitest + cheerio scraper setups.

**Not tested in v1:** runner merge/retention logic, geolocation utilities, Svelte component behaviour, end-to-end build. These have higher setup cost relative to bugs they'd catch; add later if a regression motivates them.

## Out of Scope

- PWA / offline support. Re-evaluate if traffic patterns demand it.
- OG image generation per port (`og:image`).
- Madeira and Açores ports.
- English (or any non-PT-PT) translation. Add later as a mechanical refactor if usage justifies.
- Observed (real-time) water-level data — predictions only.
- Harmonic synthesis as a fallback for missing scrapes.
- IH (Instituto Hidrográfico) PDF parsing as a backup data source.
- localStorage-based "remember last port". The user-controlled equivalent is bookmarking `/[port]`.
- Tile-provider failover or self-hosted basemaps.
- Auto-routing to the nearest port. The map is the destination; the user picks.
- Driving / walking distance. The "Porto mais próximo" card uses straight-line km only.
- Runner integration tests, geolocation unit tests, Svelte component tests.
- Multi-port scrapers in the first PR; ports land one at a time after Lisboa.
- Search/filter on the port-grid fallback. With 11 ports a list is enough.

## Further Notes

- The current seed `data/lisboa.json` uses `+01:00` offsets and should be either (a) one-off normalised to UTC `Z` before the new code paths merge, or (b) regenerated by the real Lisboa scraper as soon as that lands. The build will work either way — `new Date(...)` accepts both — but the implementation contract says all stored times are UTC, so the normalisation is recommended for consistency.
- `src/lib/tides.ts` already contains a `stateAt` function used nowhere yet — the live header callout in `Forecast` is the planned consumer.
- The `~/*` path alias is set in `tsconfig.json`. Vitest config needs `vite-tsconfig-paths` (or equivalent) so colocated tests resolve `~/lib/...` imports the same way Astro pages do.
- The existing 03:00 UTC nightly cron in `.github/workflows/scrape.yml` stays. 03:00 UTC is ~04:00 Lisbon in summer / 03:00 in winter — safely outside user-active hours.
- The CLAUDE.md `Vercel` vs `Cloudflare` ambiguity (the ASCII diagram says Cloudflare, the prose says Vercel) is left unresolved by this PRD; no code in scope depends on which one. Recommend pinning to one (Vercel, per the prose) when convenient.
- This PRD's resolutions came from a /grill-me interview. Decisions Q1–Q19 from that session are captured here; if a future PRD revisits any of them, it should reference the question number for traceability.
