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
