import { describe, it, expect } from 'vitest';
import { dayAmplitude, rollingMaxAmplitude, amplitudePercent } from './range';
import type { TideEvent } from './tides';

describe('dayAmplitude', () => {
  it('returns the difference between the day\'s highest high and lowest low', () => {
    const events: TideEvent[] = [
      { time: '2026-07-15T02:00:00Z', height: 0.4, type: 'low' },
      { time: '2026-07-15T08:00:00Z', height: 3.6, type: 'high' },
      { time: '2026-07-15T14:00:00Z', height: 0.5, type: 'low' },
      { time: '2026-07-15T20:00:00Z', height: 3.7, type: 'high' },
    ];
    expect(dayAmplitude(events)).toBeCloseTo(3.3, 10);
  });
});

describe('rollingMaxAmplitude', () => {
  it('returns the largest single-day amplitude across the stored history', () => {
    const allDays = {
      '2026-07-14': {
        events: [
          { time: '2026-07-14T02:00:00Z', height: 1.0, type: 'low' as const },
          { time: '2026-07-14T08:00:00Z', height: 3.0, type: 'high' as const },
        ],
      },
      '2026-07-15': {
        events: [
          { time: '2026-07-15T02:00:00Z', height: 0.4, type: 'low' as const },
          { time: '2026-07-15T08:00:00Z', height: 3.7, type: 'high' as const },
        ],
      },
      '2026-07-16': {
        events: [
          { time: '2026-07-16T02:00:00Z', height: 1.5, type: 'low' as const },
          { time: '2026-07-16T08:00:00Z', height: 2.5, type: 'high' as const },
        ],
      },
    };
    expect(rollingMaxAmplitude(allDays)).toBeCloseTo(3.3, 10);
  });
});

describe('amplitudePercent', () => {
  it('returns the day\'s amplitude as a percentage of the rolling maximum', () => {
    const allDays = {
      '2026-07-14': {
        events: [
          { time: '2026-07-14T02:00:00Z', height: 0.0, type: 'low' as const },
          { time: '2026-07-14T08:00:00Z', height: 4.0, type: 'high' as const },
        ],
      },
      '2026-07-15': {
        events: [
          { time: '2026-07-15T02:00:00Z', height: 1.0, type: 'low' as const },
          { time: '2026-07-15T08:00:00Z', height: 3.0, type: 'high' as const },
        ],
      },
    };
    expect(amplitudePercent(allDays['2026-07-15'].events, allDays)).toBe(50);
  });

  it('returns 100 when the day is the rolling-max day (bootstrap case)', () => {
    const allDays = {
      '2026-07-14': {
        events: [
          { time: '2026-07-14T02:00:00Z', height: 1.0, type: 'low' as const },
          { time: '2026-07-14T08:00:00Z', height: 2.0, type: 'high' as const },
        ],
      },
      '2026-07-15': {
        events: [
          { time: '2026-07-15T02:00:00Z', height: 0.0, type: 'low' as const },
          { time: '2026-07-15T08:00:00Z', height: 5.0, type: 'high' as const },
        ],
      },
    };
    expect(amplitudePercent(allDays['2026-07-15'].events, allDays)).toBe(100);
  });
});
