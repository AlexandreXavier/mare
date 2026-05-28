export type TideEventType = 'high' | 'low';

export type TideEvent = {
  time: string;
  height: number;
  type: TideEventType;
};

export type CurvePoint = { t: Date; h: number };

export const interpolateCurve = (
  events: TideEvent[],
  start: Date,
  end: Date,
  samples = 144,
): CurvePoint[] => {
  if (events.length < 2) return [];

  const sorted = [...events].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
  const out: CurvePoint[] = [];
  const total = end.getTime() - start.getTime();
  const step = total / samples;

  for (let i = 0; i <= samples; i++) {
    const t = new Date(start.getTime() + i * step);
    const h = heightAt(t, sorted);
    if (h !== null) out.push({ t, h });
  }
  return out;
};

const heightAt = (t: Date, events: TideEvent[]): number | null => {
  const ts = t.getTime();
  for (let i = 0; i < events.length - 1; i++) {
    const a = new Date(events[i].time).getTime();
    const b = new Date(events[i + 1].time).getTime();
    if (ts >= a && ts <= b) {
      const ha = events[i].height;
      const hb = events[i + 1].height;
      const phase = (ts - a) / (b - a);
      return ha + ((hb - ha) * (1 - Math.cos(Math.PI * phase))) / 2;
    }
  }
  return null;
};

export const nextEvent = (now: Date, events: TideEvent[]): TideEvent | null => {
  const ts = now.getTime();
  const sorted = [...events].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
  return sorted.find((e) => new Date(e.time).getTime() > ts) ?? null;
};

export type TideState = 'rising' | 'falling';

export const stateAt = (t: Date, events: TideEvent[]): TideState | null => {
  const ts = t.getTime();
  const sorted = [...events].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = new Date(sorted[i].time).getTime();
    const b = new Date(sorted[i + 1].time).getTime();
    if (ts >= a && ts <= b) {
      return sorted[i + 1].type === 'high' ? 'rising' : 'falling';
    }
  }
  return null;
};
