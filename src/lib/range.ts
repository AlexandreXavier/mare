import type { TideEvent } from './tides';

type DayEvents = { events: TideEvent[] };

export const dayAmplitude = (events: TideEvent[]): number => {
  if (events.length === 0) return 0;
  const heights = events.map((e) => e.height);
  return Math.max(...heights) - Math.min(...heights);
};

export const rollingMaxAmplitude = (allDays: Record<string, DayEvents>): number => {
  const days = Object.values(allDays);
  if (days.length === 0) return 0;
  return Math.max(...days.map((d) => dayAmplitude(d.events)));
};

export const amplitudePercent = (
  events: TideEvent[],
  allDays: Record<string, DayEvents>,
): number => {
  const max = rollingMaxAmplitude(allDays);
  if (max === 0) return 0;
  return (dayAmplitude(events) / max) * 100;
};
