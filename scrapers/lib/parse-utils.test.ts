import { describe, it, expect } from 'vitest';
import { lisbonCivilToUtc, parseDecimalComma, parsePtMonth } from './parse-utils';

describe('parsePtMonth', () => {
  it('maps PT month names to 1-indexed numbers', () => {
    expect(parsePtMonth('Janeiro')).toBe(1);
    expect(parsePtMonth('Dezembro')).toBe(12);
  });

  it('tolerates accents (Março) and case', () => {
    expect(parsePtMonth('Março')).toBe(3);
    expect(parsePtMonth('março')).toBe(3);
    expect(parsePtMonth('MARÇO')).toBe(3);
  });
});

describe('parseDecimalComma', () => {
  it('parses "3,15" as 3.15', () => {
    expect(parseDecimalComma('3,15')).toBe(3.15);
  });

  it('parses integer-like "1" as 1', () => {
    expect(parseDecimalComma('1')).toBe(1);
  });

  it('throws on non-numeric input', () => {
    expect(() => parseDecimalComma('abc')).toThrow();
  });
});

describe('lisbonCivilToUtc', () => {
  it('returns the same UTC instant in winter (Lisbon = UTC)', () => {
    expect(lisbonCivilToUtc('2026-01-15', '14:00')).toBe('2026-01-15T14:00:00Z');
  });

  it('subtracts an hour for summer civil time (Lisbon = UTC+1)', () => {
    expect(lisbonCivilToUtc('2026-06-15', '14:00')).toBe('2026-06-15T13:00:00Z');
  });

  it('handles the spring-forward day', () => {
    // DST 2026: clocks jump from 01:00 → 02:00 on 29 March. A civil time
    // of 14:00 on 29 March is summer (UTC+1) → 13:00 UTC.
    expect(lisbonCivilToUtc('2026-03-29', '14:00')).toBe('2026-03-29T13:00:00Z');
  });

  it('handles the autumn fall-back day', () => {
    // 2026 fall-back: clocks go back at 02:00 → 01:00 on 25 October.
    // 14:00 civil on 25 October is winter (UTC+0).
    expect(lisbonCivilToUtc('2026-10-25', '14:00')).toBe('2026-10-25T14:00:00Z');
  });
});
