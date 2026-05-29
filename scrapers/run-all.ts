import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrape as scrapeLeixoes } from './leixoes';
import { scrape as scrapeLisboa } from './lisboa';
import { mergePortFile, type ScrapeResult, type StoredFile } from './lib/merge';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

type PortScraper = {
  slug: string;
  scrape: () => Promise<ScrapeResult>;
};

export const scrapers: PortScraper[] = [
  { slug: 'lisboa', scrape: scrapeLisboa },
  { slug: 'leixoes', scrape: scrapeLeixoes },
];

const lisbonCivilToday = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const loadStored = (slug: string): StoredFile => {
  const path = join(DATA_DIR, `${slug}.json`);
  if (!existsSync(path)) {
    return { port: slug, lastScrapeOk: '1970-01-01T00:00:00Z', days: {} };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as StoredFile;
  } catch (err) {
    throw new Error(
      `failed to read ${path}: ${err instanceof Error ? err.message : err}`,
    );
  }
};

const atomicWrite = (path: string, body: string): void => {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, body);
  renameSync(tmp, path);
};

const formatMissing = (failures: { date: string }[]): string => {
  if (!failures.length) return 'none';
  return failures.map((f) => f.date).join(', ');
};

export const runOne = async (s: PortScraper, today: string): Promise<boolean> => {
  try {
    const scraped = await s.scrape();
    const stored = loadStored(s.slug);
    const merged = mergePortFile(stored, scraped, today);
    const requested =
      Object.keys(scraped.days).length + scraped.failures.length;
    const ok = Object.keys(scraped.days).length;
    const outPath = join(DATA_DIR, `${s.slug}.json`);
    atomicWrite(outPath, `${JSON.stringify(merged, null, 2)}\n`);
    console.log(
      `[${s.slug}] parsed ${ok}/${requested}, missing: ${formatMissing(scraped.failures)}`,
    );
    return true;
  } catch (err) {
    console.error(
      `[${s.slug}] FAILED: ${err instanceof Error ? err.message : err}`,
    );
    return false;
  }
};

const main = async () => {
  mkdirSync(DATA_DIR, { recursive: true });
  const today = lisbonCivilToday();
  let anyFailed = false;
  for (const s of scrapers) {
    const ok = await runOne(s, today);
    if (!ok) anyFailed = true;
  }
  process.exit(anyFailed ? 1 : 0);
};

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
