import type { TideEvent } from './tides';

export type PortDayFile = {
  events: TideEvent[];
};

export type PortDataFile = {
  port: string;
  lastScrapeOk: string;
  days: Record<string, PortDayFile>;
};

const dataModules = import.meta.glob<PortDataFile>('../../data/*.json', {
  eager: true,
  import: 'default',
});

export const portData: Record<string, PortDataFile> = {};
for (const [path, mod] of Object.entries(dataModules)) {
  const slug = path.split('/').pop()!.replace(/\.json$/, '');
  portData[slug] = mod;
}

export const getDay = (
  portSlug: string,
  date: string,
): { events: TideEvent[]; lastScrapeOk: string } | null => {
  const file = portData[portSlug];
  if (!file) return null;
  const day = file.days[date];
  if (!day) return null;
  return { events: day.events, lastScrapeOk: file.lastScrapeOk };
};

export const availableDates = (portSlug: string): string[] => {
  const file = portData[portSlug];
  if (!file) return [];
  return Object.keys(file.days).sort();
};

const shiftDate = (date: string, days: number): string => {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};

export const getDayWindow = (data: PortDataFile, date: string): TideEvent[] => {
  const dates = [shiftDate(date, -1), date, shiftDate(date, 1)];
  return dates
    .flatMap((d) => data.days[d]?.events ?? [])
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
};

export const getPortDayWindow = (portSlug: string, date: string): TideEvent[] => {
  const file = portData[portSlug];
  if (!file) return [];
  return getDayWindow(file, date);
};
