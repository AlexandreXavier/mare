import type { TideEvent } from '../../src/lib/tides';
import { lisbonCivilToUtc } from './parse-utils';
import type { ScrapeResult, StoredDay } from './merge';

const IH_BASE = 'https://www.hidrografico.pt/hmapi';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) mare-scraper/1.0';

export type IhRecord = {
  date: string;
  height: number | null;
  marId: number | null;
  portCode: number | null;
  tide: 'PM' | 'BM' | null;
  moon: string;
  event: string;
};

export const parseIhRecords = (records: IhRecord[]): ScrapeResult => {
  const days: Record<string, StoredDay> = {};
  for (const r of records) {
    if (r.tide !== 'PM' && r.tide !== 'BM') continue;
    if (r.height === null) continue;
    const [dateStr, timeStr] = r.date.split(' ');
    const hhmm = timeStr.slice(0, 5);
    const utc = lisbonCivilToUtc(dateStr, hhmm);
    const event: TideEvent = {
      time: utc,
      height: r.height,
      type: r.tide === 'PM' ? 'high' : 'low',
    };
    if (!days[dateStr]) days[dateStr] = { events: [] };
    days[dateStr].events.push(event);
  }
  return { days, failures: [], lastScrapeOk: new Date().toISOString() };
};

const IH_MAX_PERIOD = 7;

const shiftDate = (date: string, days: number): string => {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};

const fetchIhWindow = async (
  portID: number,
  startDate: string,
  period: number,
): Promise<IhRecord[]> => {
  const url = `${IH_BASE}/tidestation/?portID=${portID}&startDate=${startDate}&period=${period}`;
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error(`IH /hmapi fetch failed: ${resp.status}`);
  return (await resp.json()) as IhRecord[];
};

export const scrapeFromIh = async (
  portID: number,
  days = 30,
): Promise<ScrapeResult> => {
  // IH's /tidestation endpoint caps period at 7. For longer windows we
  // chain calls at 7-day offsets and merge the records.
  const today = new Date().toISOString().slice(0, 10);
  const allRecords: IhRecord[] = [];
  for (let offset = 0; offset < days; offset += IH_MAX_PERIOD) {
    const windowDays = Math.min(IH_MAX_PERIOD, days - offset);
    const startDate = shiftDate(today, offset);
    const records = await fetchIhWindow(portID, startDate, windowDays);
    allRecords.push(...records);
  }
  const result = parseIhRecords(allRecords);
  return { ...result, lastScrapeOk: new Date().toISOString() };
};
