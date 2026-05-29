import * as cheerio from 'cheerio';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TideEvent } from '../src/lib/tides';
import { lisbonCivilToUtc, parseDecimalComma, parsePtMonth } from './lib/parse-utils';

const APL_TIDES_URL = 'https://www.portodelisboa.pt/mares';
const APL_BASE = 'https://www.portodelisboa.pt';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) mare-scraper/1.0';

export type Failure = { date: string; reason: string };

export type ParseResult = {
  days: Record<string, { events: TideEvent[] }>;
  failures: Failure[];
};

export type RawItem = { text: string; x: number; y: number };

const DAY_RE = /^\d{1,2}$/;
const TIME_RE = /^\d{1,2}[:.]\d{2}$/;
const HEIGHT_RE = /^\d+(?:[.,]\d+)?$/;
const MONTH_RE =
  /^(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)$/i;

const COLUMN_PITCH = 89; // x distance between adjacent column anchors
const COLUMN_INNER_SPAN = 75; // x distance from a column's anchor to its rightmost item (Altura)
const EVENT_VERTICAL_RADIUS = 22;

const sortItemsByY = (a: RawItem, b: RawItem) => b.y - a.y;

const findMonthsOnPage = (items: RawItem[]): { name: string; centerX: number }[] => {
  return items
    .filter((it) => MONTH_RE.test(it.text.trim()))
    .map((it) => ({ name: it.text.trim(), centerX: it.x }))
    .sort((a, b) => a.centerX - b.centerX);
};

const groupColumns = (items: RawItem[]): { columns: RawItem[][]; colXs: number[] } => {
  // Anchor columns on the literal "Dia" header items so we don't accidentally
  // anchor on integer tide heights (which also match /^\d{1,2}$/).
  const diaHeaders = items
    .filter((it) => it.text.trim() === 'Dia')
    .map((it) => it.x)
    .sort((a, b) => a - b);
  if (!diaHeaders.length) return { columns: [], colXs: [] };
  const colXs: number[] = [];
  for (const x of diaHeaders) {
    if (!colXs.length || x - colXs[colXs.length - 1] > COLUMN_PITCH / 2) {
      colXs.push(x);
    }
  }
  const columns: RawItem[][] = Array.from({ length: colXs.length }, () => []);
  for (const it of items) {
    for (let i = 0; i < colXs.length; i++) {
      const dx = it.x - colXs[i];
      if (dx >= -8 && dx <= COLUMN_INNER_SPAN) {
        columns[i].push(it);
        break;
      }
    }
  }
  return { columns, colXs };
};

const parseColumn = (
  columnItems: RawItem[],
  colAnchorX: number,
  year: number,
  month: number,
  result: ParseResult,
): void => {
  // A Dia digit lives in the leftmost ~16 px of the column. Tide-height
  // values like "1", "3" sit ~58 px right (Altura column) — much further
  // than a Dia digit ever does — so an x-gate cleanly disambiguates.
  // Single-digit "1" kicks the right edge of this range (dx ~12 px) because
  // pdfjs reports the glyph's left edge and "1" has visual padding to its
  // left.
  const DIA_MAX_DX = 16;
  const dayDigits = columnItems
    .filter(
      (it) =>
        DAY_RE.test(it.text.trim()) && it.x - colAnchorX <= DIA_MAX_DX,
    )
    .sort(sortItemsByY);

  for (const dayItem of dayDigits) {
    const day = Number(dayItem.text.trim());
    if (day < 1 || day > 31) continue;
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    try {
      // Find tide events within ±radius of this Dia digit's y position.
      const near = columnItems
        .filter(
          (it) =>
            Math.abs(it.y - dayItem.y) <= EVENT_VERTICAL_RADIUS &&
            it !== dayItem,
        )
        .sort(sortItemsByY);

      // Each event row in the PDF is a (Hora, Altura) pair at the same y.
      const byRow = new Map<number, { time?: string; height?: number }>();
      for (const it of near) {
        const text = it.text.trim();
        if (!TIME_RE.test(text) && !HEIGHT_RE.test(text)) continue;
        // Group items by y rounded to nearest pixel (the pair is at the same y).
        const yKey = Math.round(it.y);
        // Allow ±1 px jitter when joining a height to its time.
        let target = byRow.get(yKey);
        if (!target) {
          for (const [k, v] of byRow) {
            if (Math.abs(k - yKey) <= 1) {
              target = v;
              break;
            }
          }
        }
        if (!target) {
          target = {};
          byRow.set(yKey, target);
        }
        if (TIME_RE.test(text)) target.time = text.replace('.', ':');
        else target.height = parseDecimalComma(text);
      }

      const rows = Array.from(byRow.values())
        .filter((r): r is { time: string; height: number } =>
          typeof r.time === 'string' && typeof r.height === 'number',
        );

      if (rows.length === 0) {
        throw new Error('no tide events found for day');
      }

      // Sort by time within the day.
      rows.sort((a, b) => a.time.localeCompare(b.time));

      // Tag high/low: tide events alternate. Compare neighbouring heights to
      // decide whether row[0] is a high or a low.
      const types: ('high' | 'low')[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (i === 0) {
          const next = rows[1];
          types.push(next && rows[0].height > next.height ? 'high' : 'low');
        } else {
          types.push(types[i - 1] === 'high' ? 'low' : 'high');
        }
      }

      const events: TideEvent[] = rows.map((row, i) => ({
        time: lisbonCivilToUtc(dateKey, row.time),
        height: row.height,
        type: types[i],
      }));

      result.days[dateKey] = { events };
    } catch (err) {
      result.failures.push({
        date: dateKey,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
};

const parsePage = (items: RawItem[], year: number, result: ParseResult): void => {
  const months = findMonthsOnPage(items);
  if (months.length === 0) return;
  const { columns, colXs } = groupColumns(items);
  if (columns.length === 0) return;

  // 6 columns map to 3 months × (first half, second half). Determine the
  // month for each column by which month header is closest in x.
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (col.length === 0) continue;
    const anchorX = colXs[i];
    let bestMonthIdx = 0;
    let bestDist = Infinity;
    for (let m = 0; m < months.length; m++) {
      const d = Math.abs(anchorX - months[m].centerX);
      if (d < bestDist) {
        bestDist = d;
        bestMonthIdx = m;
      }
    }
    const monthNum = parsePtMonth(months[bestMonthIdx].name);
    parseColumn(col, anchorX, year, monthNum, result);
  }
};

export const parsePageItems = (items: RawItem[], year: number): ParseResult => {
  const result: ParseResult = { days: {}, failures: [] };
  parsePage(items, year, result);
  return result;
};

const extractTideYear = (s: string): number | null => {
  // Look for a 4-digit year between 2000 and 2099 — Liferay folder IDs like
  // "20121" appear as 5+-digit sequences and must not be mistaken for a year.
  for (const m of s.matchAll(/(?<!\d)(20\d{2})(?!\d)/g)) {
    const y = Number(m[1]);
    if (y >= 2020 && y <= 2099) return y;
  }
  return null;
};

export const findLatestPdfUrl = (html: string, currentYear: number): string | null => {
  const $ = cheerio.load(html);
  let best: { year: number; href: string } | null = null;
  for (const link of $('a[href*=".pdf"]').toArray()) {
    const href = $(link).attr('href') ?? '';
    const hrefDecoded = decodeURIComponent(href);
    const text = $(link).text();
    if (!/(Tabela|Mar[eé]s)/i.test(hrefDecoded) && !/(Tabela|Mar[eé]s)/i.test(text)) continue;
    // Prefer the year embedded in the filename portion, then the link text.
    const filename = hrefDecoded.split('/').pop() ?? '';
    const year = extractTideYear(filename) ?? extractTideYear(text);
    if (year === null) continue;
    if (year > currentYear + 1) continue;
    if (!best || year > best.year) best = { year, href };
  }
  if (!best) return null;
  return best.href.startsWith('http') ? best.href : `${APL_BASE}${best.href}`;
};

export const scrape = async (): Promise<{
  days: ParseResult['days'];
  failures: ParseResult['failures'];
  lastScrapeOk: string;
}> => {
  const indexResp = await fetch(APL_TIDES_URL, { headers: { 'User-Agent': UA } });
  if (!indexResp.ok) {
    throw new Error(`APL /mares fetch failed: ${indexResp.status}`);
  }
  const html = await indexResp.text();
  const currentYear = new Date().getUTCFullYear();
  const pdfUrl = findLatestPdfUrl(html, currentYear);
  if (!pdfUrl) throw new Error('APL /mares: no Tabela de Marés PDF link found');
  const pdfYear =
    extractTideYear(decodeURIComponent(pdfUrl.split('/').pop() ?? '')) ?? currentYear;

  const pdfResp = await fetch(pdfUrl, { headers: { 'User-Agent': UA } });
  if (!pdfResp.ok) throw new Error(`APL PDF fetch failed: ${pdfResp.status}`);
  const pdfBuffer = new Uint8Array(await pdfResp.arrayBuffer());

  const { days, failures } = await parse(pdfBuffer, pdfYear);
  return { days, failures, lastScrapeOk: new Date().toISOString() };
};

export const parse = async (
  pdfBuffer: Uint8Array,
  year: number,
): Promise<ParseResult> => {
  const result: ParseResult = { days: {}, failures: [] };
  const doc = await getDocument({ data: pdfBuffer }).promise;
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: RawItem[] = content.items
      .map((it: any) => ({
        text: String(it.str ?? ''),
        x: Number(it.transform?.[4] ?? 0),
        y: Number(it.transform?.[5] ?? 0),
      }))
      .filter((it: RawItem) => it.text.trim());
    if (items.length < 50) continue; // skip cover / credits pages
    parsePage(items, year, result);
  }
  return result;
};
