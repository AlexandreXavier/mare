import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrape as scrapeLisboa } from './lisboa';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const scrapers: Record<string, () => Promise<unknown>> = {
  lisboa: scrapeLisboa,
};

const main = async () => {
  const slug = process.argv[2];
  if (!slug || !scrapers[slug]) {
    console.error(`Usage: run-port <slug>. Known: ${Object.keys(scrapers).join(', ')}`);
    process.exit(2);
  }
  mkdirSync(DATA_DIR, { recursive: true });
  const t0 = Date.now();
  const result = (await scrapers[slug]()) as {
    days: Record<string, { events: unknown[] }>;
    failures: { date: string; reason: string }[];
    lastScrapeOk: string;
  };
  const file = { port: slug, lastScrapeOk: result.lastScrapeOk, days: result.days };
  const outPath = join(DATA_DIR, `${slug}.json`);
  writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
  const dayCount = Object.keys(result.days).length;
  console.log(
    `[${slug}] parsed ${dayCount} days, ${result.failures.length} failures, ${Date.now() - t0}ms → ${outPath}`,
  );
  for (const f of result.failures) {
    console.log(`  fail ${f.date}: ${f.reason}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
