import { describe, it, expect } from 'vitest';
import { mergePortFile, type StoredFile, type ScrapeResult } from './merge';

const today = '2026-05-29';
const emptyStored: StoredFile = {
  port: 'lisboa',
  lastScrapeOk: '2026-05-01T03:00:00Z',
  days: {},
};

const dayKey = (offset: number) => {
  const t = new Date(`${today}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + offset);
  return t.toISOString().slice(0, 10);
};

const stubEvent = (date: string) => ({
  events: [{ time: `${date}T00:48:00Z`, height: 3.3, type: 'high' as const }],
});

describe('mergePortFile', () => {
  it('writes the 5 scraped days and advances lastScrapeOk when stored is empty', () => {
    const scraped: ScrapeResult = {
      days: Object.fromEntries(
        Array.from({ length: 5 }, (_, i) => [dayKey(i), stubEvent(dayKey(i))]),
      ),
      failures: [],
      lastScrapeOk: '2026-05-29T03:00:00Z',
    };
    const result = mergePortFile(emptyStored, scraped, today);
    expect(Object.keys(result.days).sort()).toEqual([
      dayKey(0),
      dayKey(1),
      dayKey(2),
      dayKey(3),
      dayKey(4),
    ]);
    expect(result.lastScrapeOk).toBe('2026-05-29T03:00:00Z');
    expect(result.port).toBe('lisboa');
  });

  it('overwrites overlapping day-keys without duplicating events', () => {
    const overlappingKey = dayKey(0);
    const stored: StoredFile = {
      port: 'lisboa',
      lastScrapeOk: '2026-05-01T03:00:00Z',
      days: {
        [overlappingKey]: {
          events: [
            { time: `${overlappingKey}T00:48:00Z`, height: 3.3, type: 'high' },
            { time: `${overlappingKey}T06:50:00Z`, height: 0.8, type: 'low' },
          ],
        },
      },
    };
    const scraped: ScrapeResult = {
      days: {
        [overlappingKey]: {
          events: [
            { time: `${overlappingKey}T00:50:00Z`, height: 3.4, type: 'high' },
            { time: `${overlappingKey}T06:55:00Z`, height: 0.7, type: 'low' },
          ],
        },
      },
      failures: [],
      lastScrapeOk: '2026-05-29T03:00:00Z',
    };
    const result = mergePortFile(stored, scraped, today);
    expect(result.days[overlappingKey].events).toHaveLength(2);
    expect(result.days[overlappingKey].events[0].height).toBe(3.4);
    expect(result.days[overlappingKey].events[0].time).toBe(`${overlappingKey}T00:50:00Z`);
  });

  it('prunes day-keys older than 365 days while keeping in-range stored days', () => {
    const ancientKey = dayKey(-400); // 400 days before today → must prune
    const recentKey = dayKey(-100); // 100 days before today → must keep
    const scrapedKey = dayKey(0);
    const stored: StoredFile = {
      port: 'lisboa',
      lastScrapeOk: '2026-05-01T03:00:00Z',
      days: {
        [ancientKey]: stubEvent(ancientKey),
        [recentKey]: stubEvent(recentKey),
      },
    };
    const scraped: ScrapeResult = {
      days: { [scrapedKey]: stubEvent(scrapedKey) },
      failures: [],
      lastScrapeOk: '2026-05-29T03:00:00Z',
    };
    const result = mergePortFile(stored, scraped, today);
    expect(result.days[ancientKey]).toBeUndefined();
    expect(result.days[recentKey]).toBeDefined();
    expect(result.days[scrapedKey]).toBeDefined();
  });

  it('returns the stored file untouched when scrape returns zero days', () => {
    const ancientKey = dayKey(-400);
    const stored: StoredFile = {
      port: 'lisboa',
      lastScrapeOk: '2026-05-01T03:00:00Z',
      days: {
        [dayKey(-1)]: stubEvent(dayKey(-1)),
        [ancientKey]: stubEvent(ancientKey), // still here — no pruning on total failure
      },
    };
    const scraped: ScrapeResult = {
      days: {},
      failures: [{ date: dayKey(0), reason: 'fetch failed' }],
      lastScrapeOk: '2026-05-29T03:00:00Z',
    };
    const result = mergePortFile(stored, scraped, today);
    expect(result).toEqual(stored);
  });

  it('still advances lastScrapeOk when scrape returns days alongside failures', () => {
    const stored: StoredFile = {
      port: 'lisboa',
      lastScrapeOk: '2026-05-01T03:00:00Z',
      days: {},
    };
    const scraped: ScrapeResult = {
      days: {
        [dayKey(0)]: stubEvent(dayKey(0)),
        [dayKey(1)]: stubEvent(dayKey(1)),
        [dayKey(2)]: stubEvent(dayKey(2)),
      },
      failures: [{ date: dayKey(3), reason: 'malformed row' }],
      lastScrapeOk: '2026-05-29T03:00:00Z',
    };
    const result = mergePortFile(stored, scraped, today);
    expect(Object.keys(result.days)).toHaveLength(3);
    expect(result.lastScrapeOk).toBe('2026-05-29T03:00:00Z');
  });
});
