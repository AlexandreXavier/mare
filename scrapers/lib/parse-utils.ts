const PT_MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const stripAccents = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const parsePtMonth = (name: string): number => {
  const key = stripAccents(name.trim());
  const month = PT_MONTHS[key];
  if (!month) throw new Error(`unknown PT month: ${name}`);
  return month;
};

export const parseDecimalComma = (s: string): number => {
  const n = Number(s.trim().replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error(`not a number: ${s}`);
  return n;
};

const LISBON_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const lisbonWallAt = (instant: Date): { h: number; m: number } => {
  const parts = LISBON_FMT.formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  let h = get('hour');
  if (h === 24) h = 0;
  return { h, m: get('minute') };
};

export const lisbonCivilToUtc = (date: string, time: string): string => {
  const [hh, mm] = time.split(':').map(Number);
  const naiveUtc = new Date(`${date}T${time}:00Z`);
  const wall = lisbonWallAt(naiveUtc);
  const offsetMinutes =
    (wall.h - hh) * 60 + (wall.m - mm);
  const adjusted = new Date(naiveUtc.getTime() - offsetMinutes * 60_000);
  return adjusted.toISOString().replace(/\.000Z$/, 'Z');
};
