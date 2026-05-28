import { describe, it, expect } from 'vitest';
import { lisbonMidnight } from './time';

describe('lisbonMidnight', () => {
  it('returns 00:00 UTC for a winter date (Lisbon = UTC+00)', () => {
    expect(lisbonMidnight('2026-01-15').toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('returns 23:00 UTC of the previous day for a summer date (Lisbon = UTC+01)', () => {
    expect(lisbonMidnight('2026-07-15').toISOString()).toBe('2026-07-14T23:00:00.000Z');
  });
});
