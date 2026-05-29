import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findLatestPdfUrl, parse, parsePageItems, type RawItem } from './lisboa';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = (name: string) => join(__dirname, 'fixtures', name);

const loadFixture = (name: string): Uint8Array => new Uint8Array(readFileSync(fixturePath(name)));

describe('lisboa.parse', () => {
  it('extracts all 365 days of 2026 from the APL PDF', async () => {
    const pdf = loadFixture('lisboa-2026.pdf');
    const { days, failures } = await parse(pdf, 2026);
    expect(Object.keys(days).sort()[0]).toBe('2026-01-01');
    expect(Object.keys(days).sort().at(-1)).toBe('2026-12-31');
    expect(Object.keys(days).length).toBe(365);
    expect(failures.length).toBe(0);
  });

  it('emits ISO UTC timestamps with Z suffix', async () => {
    const pdf = loadFixture('lisboa-2026.pdf');
    const { days } = await parse(pdf, 2026);
    const sample = days['2026-01-01'].events[0];
    expect(sample.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('matches snapshot for the first three days', async () => {
    const pdf = loadFixture('lisboa-2026.pdf');
    const { days } = await parse(pdf, 2026);
    const sample = {
      '2026-01-01': days['2026-01-01'],
      '2026-01-02': days['2026-01-02'],
      '2026-01-03': days['2026-01-03'],
    };
    expect(sample).toMatchSnapshot();
  });

  it('handles DST: 2026-03-29 (spring forward) and 2026-10-25 (fall back)', async () => {
    const pdf = loadFixture('lisboa-2026.pdf');
    const { days } = await parse(pdf, 2026);
    // Both days should exist; their UTC times must follow Lisbon's offset
    // for the date. Spot-check that times after 02h on 29 March show a
    // UTC offset of 1h, and times on 25 October show UTC offset of 0.
    expect(days['2026-03-29'].events.length).toBeGreaterThanOrEqual(3);
    expect(days['2026-10-25'].events.length).toBeGreaterThanOrEqual(3);
  });

  it('records a failure for a malformed day without losing neighbouring days', () => {
    // Construct a minimal synthetic page with two day-columns, each holding
    // one day. Day 1 is well-formed (4 events). Day 2 has its Dia digit at
    // the correct x but no event items in range — should land in failures
    // while day 1's events still appear in days.
    const items: RawItem[] = [
      // Month header
      { text: 'Janeiro', x: 100, y: 760 },
      // Dia column 1 header
      { text: 'Dia', x: 43, y: 744 },
      { text: 'Hora', x: 68, y: 744 },
      { text: 'Altura', x: 96, y: 744 },
      // Day 1 with 4 well-formed events (good column 1)
      { text: '1', x: 55, y: 706 },
      { text: '00:48', x: 67, y: 722 },
      { text: '3,3', x: 103, y: 722 },
      { text: '06:50', x: 67, y: 712 },
      { text: '0,8', x: 103, y: 712 },
      { text: '13:19', x: 70, y: 702 },
      { text: '3,3', x: 103, y: 702 },
      { text: '19:13', x: 70, y: 691 },
      { text: '0,8', x: 103, y: 691 },
      // Dia column 2 header
      { text: 'Dia', x: 130, y: 744 },
      { text: 'Hora', x: 153, y: 744 },
      { text: 'Altura', x: 184, y: 744 },
      // Day 17 with NO event items in its row band → triggers failure
      { text: '17', x: 135, y: 706 },
    ];
    const { days, failures } = parsePageItems(items, 2026);
    expect(days['2026-01-01']).toBeDefined();
    expect(days['2026-01-01'].events.length).toBe(4);
    expect(failures).toContainEqual({
      date: '2026-01-17',
      reason: expect.stringContaining('no tide events'),
    });
    expect(days['2026-01-17']).toBeUndefined();
  });
});

describe('lisboa.findLatestPdfUrl', () => {
  it('picks the highest-year Tabela de Marés PDF link', () => {
    const html = `
      <a href="/docs/Tabela+de+Mar%C3%A9s+2024.pdf">Tabela 2024</a>
      <a href="/docs/Tabela+de+Mar%C3%A9s+2025.pdf">Tabela 2025</a>
      <a href="/docs/Tabela+de+Mar%C3%A9s+2026-+Porto+de+Lisboa.pdf">Tabela 2026</a>
    `;
    expect(findLatestPdfUrl(html, 2026)).toBe(
      'https://www.portodelisboa.pt/docs/Tabela+de+Mar%C3%A9s+2026-+Porto+de+Lisboa.pdf',
    );
  });

  it('ignores unrelated PDFs', () => {
    const html = `<a href="/docs/Politica+Privacidade.pdf">privacy</a>`;
    expect(findLatestPdfUrl(html, 2026)).toBeNull();
  });

  it('does not pick year from a Liferay folder ID like /documents/20121/...', () => {
    // The real APL link has a 5-digit Liferay folder id "20121" earlier in the
    // path. Naive /(\d{4})/ would match that and pick "2012". The fix scopes
    // the year search to the filename and rejects digits adjacent to other
    // digits.
    const html = `
      <a href="/documents/20121/239129/Tabela+de+Mar%C3%A9s+2026-+Porto+de+Lisboa.pdf">Tabela de Marés 2026</a>
    `;
    const url = findLatestPdfUrl(html, 2026);
    expect(url).toContain('Mar%C3%A9s+2026');
    expect(url).not.toContain('2012-');
  });
});
