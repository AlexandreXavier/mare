import { describe, it, expect } from 'vitest';
import { interpolateCurve, nextEvent, type TideEvent } from './tides';
import { getDayWindow, type PortDataFile } from './data';
import { lisbonMidnight } from './time';

describe('cross-midnight curve continuity', () => {
  it('produces a curve reaching both 00h and 24h when adjacent days bracket the day window', () => {
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-07-15T03:00:00Z',
      days: {
        '2026-07-14': {
          events: [
            { time: '2026-07-14T20:00:00Z', height: 3.5, type: 'high' },
          ],
        },
        '2026-07-15': {
          events: [
            { time: '2026-07-15T02:00:00Z', height: 0.4, type: 'low' },
            { time: '2026-07-15T08:00:00Z', height: 3.6, type: 'high' },
            { time: '2026-07-15T14:00:00Z', height: 0.5, type: 'low' },
            { time: '2026-07-15T20:00:00Z', height: 3.7, type: 'high' },
          ],
        },
        '2026-07-16': {
          events: [
            { time: '2026-07-16T02:00:00Z', height: 0.4, type: 'low' },
          ],
        },
      },
    };

    const window = getDayWindow(data, '2026-07-15');
    const dayStart = lisbonMidnight('2026-07-15');
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const curve = interpolateCurve(window, dayStart, dayEnd, 144);

    expect(curve.length).toBe(145);
    expect(curve[0].t.getTime()).toBe(dayStart.getTime());
    expect(curve[curve.length - 1].t.getTime()).toBe(dayEnd.getTime());
    expect(curve.every((p) => Number.isFinite(p.h))).toBe(true);
  });
});

describe('nextEvent', () => {
  it('returns the first event after now from a sorted list', () => {
    const events: TideEvent[] = [
      { time: '2026-07-15T02:00:00Z', height: 0.4, type: 'low' },
      { time: '2026-07-15T08:00:00Z', height: 3.6, type: 'high' },
      { time: '2026-07-15T14:00:00Z', height: 0.5, type: 'low' },
    ];
    const now = new Date('2026-07-15T10:00:00Z');

    expect(nextEvent(now, events)).toEqual({
      time: '2026-07-15T14:00:00Z',
      height: 0.5,
      type: 'low',
    });
  });

  it('returns null when all events are in the past', () => {
    const events: TideEvent[] = [
      { time: '2026-07-15T02:00:00Z', height: 0.4, type: 'low' },
    ];
    const now = new Date('2026-07-16T00:00:00Z');

    expect(nextEvent(now, events)).toBeNull();
  });
});
