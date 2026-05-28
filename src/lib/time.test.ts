import { describe, it, expect } from 'vitest';
import { lisbonMidnight, next5Days } from './time';

describe('lisbonMidnight', () => {
  it('returns 00:00 UTC for a winter date (Lisbon = UTC+00)', () => {
    expect(lisbonMidnight('2026-01-15').toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('returns 23:00 UTC of the previous day for a summer date (Lisbon = UTC+01)', () => {
    expect(lisbonMidnight('2026-07-15').toISOString()).toBe('2026-07-14T23:00:00.000Z');
  });
});

describe('next5Days', () => {
  it('returns 5 consecutive ISO dates starting from today, rolling across month boundaries', () => {
    expect(next5Days('2026-05-30')).toEqual([
      '2026-05-30',
      '2026-05-31',
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ]);
  });

  it('rolls correctly across the year boundary', () => {
    expect(next5Days('2026-12-30')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });
});
