import { describe, it, expect } from 'vitest';
import { countdownText } from './now';

describe('countdownText', () => {
  it('formats hours and minutes when the delta is at least an hour', () => {
    const from = new Date('2026-07-15T10:00:00Z');
    const to = new Date('2026-07-15T13:05:00Z');
    expect(countdownText(from, to)).toBe('em 3h 5min');
  });

  it('formats minutes only when the delta is under an hour', () => {
    const from = new Date('2026-07-15T10:00:00Z');
    const to = new Date('2026-07-15T10:12:00Z');
    expect(countdownText(from, to)).toBe('em 12min');
  });

  it('returns "em menos de 1min" when the delta is under a minute', () => {
    const from = new Date('2026-07-15T10:00:00Z');
    const to = new Date('2026-07-15T10:00:30Z');
    expect(countdownText(from, to)).toBe('em menos de 1min');
  });
});
