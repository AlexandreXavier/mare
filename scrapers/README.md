# scrapers

One module per Portuguese port-authority site. Each module implements `PortScraper` from `./types.ts` and is wired into `run-all.ts`.

Output contract: a scraper returns an array of `ScrapedDay` objects. The runner merges them into `data/<port>.json`, preserving older days that are still in range. The runner also stamps `lastScrapeOk` on success.

When adding a port:

1. Identify the port-authority tide page (e.g. APL for Lisboa, APDL for Leixões, APS for Sines).
2. Create `scrapers/<slug>.ts` exporting a default `PortScraper`.
3. Save a representative HTML fixture under `scrapers/fixtures/<slug>.html` and add a parse test.
4. Add the module to `run-all.ts`'s scraper list.
5. Add an npm script `scrape:<slug>` to `package.json`.

Failure modes:
- Network or parse error → throw. The runner logs and continues with other ports.
- Per-port JSON keeps its previous content; `lastScrapeOk` is not updated.
- The UI surfaces stale data with a banner once `lastScrapeOk` is >2 days old.
