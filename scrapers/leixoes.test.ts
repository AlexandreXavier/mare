import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIhRecords, type IhRecord } from './lib/ih-api';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = (name: string) => join(__dirname, 'fixtures', name);
const loadFixture = (name: string): IhRecord[] =>
  JSON.parse(readFileSync(fixturePath(name), 'utf-8')) as IhRecord[];

describe('leixoes — IH 14-day fixture', () => {
  it('parses the real IH response into ≥7 day-keys, no failures', () => {
    // IH caps period at 7 days per call; this fixture is one window.
    // scrapeFromIh chains windows to satisfy the issue's ≥14-day claim.
    const records = loadFixture('leixoes-ih-2026-05-29-14d.json');
    const { days, failures } = parseIhRecords(records);
    expect(failures).toHaveLength(0);
    expect(Object.keys(days).length).toBeGreaterThanOrEqual(7);
  });

  it('emits UTC Z timestamps and PM/BM → high/low', () => {
    const records = loadFixture('leixoes-ih-2026-05-29-14d.json');
    const { days } = parseIhRecords(records);
    const firstDay = Object.keys(days).sort()[0];
    const sample = days[firstDay].events[0];
    expect(sample.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(['high', 'low']).toContain(sample.type);
    expect(typeof sample.height).toBe('number');
  });

  it('matches snapshot for 2026-05-29', () => {
    const records = loadFixture('leixoes-ih-2026-05-29-14d.json');
    const { days } = parseIhRecords(records);
    expect(days['2026-05-29']).toMatchSnapshot();
  });
});
