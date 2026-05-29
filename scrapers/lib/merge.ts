import type { TideEvent } from '../../src/lib/tides';

export type StoredDay = { events: TideEvent[] };

export type StoredFile = {
  port: string;
  lastScrapeOk: string;
  days: Record<string, StoredDay>;
};

export type ScrapeResult = {
  days: Record<string, StoredDay>;
  failures: { date: string; reason: string }[];
  lastScrapeOk: string;
};

const RETENTION_DAYS = 365;

const shiftDate = (date: string, days: number): string => {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};

export const mergePortFile = (
  stored: StoredFile,
  scraped: ScrapeResult,
  today: string,
): StoredFile => {
  // Total failure: scrape produced no days at all. Leave the stored file
  // untouched — don't advance lastScrapeOk, don't prune. The UI's
  // source-quiet banner already covers the user-facing side of staleness.
  if (Object.keys(scraped.days).length === 0) return stored;

  const merged: Record<string, StoredDay> = { ...stored.days, ...scraped.days };
  const cutoff = shiftDate(today, -RETENTION_DAYS);
  const pruned: Record<string, StoredDay> = {};
  for (const [date, day] of Object.entries(merged)) {
    if (date >= cutoff) pruned[date] = day;
  }
  return {
    port: stored.port,
    lastScrapeOk: scraped.lastScrapeOk,
    days: pruned,
  };
};
