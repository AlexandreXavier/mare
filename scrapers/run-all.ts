import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrape as scrapeLisboa } from './lisboa';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

type PortScraper = {
  slug: string;
  scrape: () => Promise<{
    days: Record<string, { events: unknown[] }>;
    failures: { date: string; reason: string }[];
    lastScrapeOk: string;
  }>;
};

const scrapers: PortScraper[] = [
  { slug: 'lisboa', scrape: scrapeLisboa },
];

const main = async () => {
  mkdirSync(DATA_DIR, { recursive: true });
  let anyFailed = false;
  for (const s of scrapers) {
    const t0 = Date.now();
    try {
      const { days, failures, lastScrapeOk } = await s.scrape();
      const file = {
        port: s.slug,
        lastScrapeOk,
        days,
      };
      const outPath = join(DATA_DIR, `${s.slug}.json`);
      writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
      const dayCount = Object.keys(days).length;
      console.log(
        `[${s.slug}] parsed ${dayCount} days, ${failures.length} failures, ${Date.now() - t0}ms → ${outPath}`,
      );
      for (const f of failures) {
        console.log(`  fail ${f.date}: ${f.reason}`);
      }
    } catch (err) {
      anyFailed = true;
      console.error(`[${s.slug}] ERROR:`, err instanceof Error ? err.message : err);
    }
  }
  process.exit(anyFailed ? 1 : 0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
