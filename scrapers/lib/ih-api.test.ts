import { describe, it, expect } from 'vitest';
import { parseIhRecords, type IhRecord } from './ih-api';

const rec = (date: string, tide: 'PM' | 'BM' | null, height: number | null): IhRecord => ({
  date,
  height,
  marId: 76,
  portCode: 12,
  tide,
  moon: tide === null ? 'QC' : '',
  event: tide === 'PM' ? 'Preia-Mar' : tide === 'BM' ? 'Baixa-Mar' : 'Quarto Crescente',
});

describe('parseIhRecords', () => {
  it('emits 4 events for a happy day with PM→high and BM→low', () => {
    const records: IhRecord[] = [
      rec('2026-01-15 01:27:00', 'PM', 2.99),
      rec('2026-01-15 07:32:00', 'BM', 0.94),
      rec('2026-01-15 13:46:00', 'PM', 3.12),
      rec('2026-01-15 19:54:00', 'BM', 0.95),
    ];
    const { days } = parseIhRecords(records);
    expect(days['2026-01-15'].events).toEqual([
      { time: '2026-01-15T01:27:00Z', height: 2.99, type: 'high' },
      { time: '2026-01-15T07:32:00Z', height: 0.94, type: 'low' },
      { time: '2026-01-15T13:46:00Z', height: 3.12, type: 'high' },
      { time: '2026-01-15T19:54:00Z', height: 0.95, type: 'low' },
    ]);
  });

  it('filters out moon-phase records (tide=null)', () => {
    const records: IhRecord[] = [
      rec('2026-05-23 11:11:00', null, null), // QC moon phase
      rec('2026-05-29 01:27:00', 'PM', 2.99),
      rec('2026-05-31 08:45:00', null, null), // LC moon phase
      rec('2026-05-29 07:32:00', 'BM', 0.94),
    ];
    const { days } = parseIhRecords(records);
    // Only the two real tide events land in days.
    expect(Object.keys(days)).toEqual(['2026-05-29']);
    expect(days['2026-05-29'].events).toHaveLength(2);
    // No event from the moon-phase dates.
    expect(days['2026-05-23']).toBeUndefined();
    expect(days['2026-05-31']).toBeUndefined();
  });

  it('converts Lisbon civil times to UTC across DST', () => {
    const records: IhRecord[] = [
      rec('2026-01-15 14:00:00', 'PM', 3.0), // winter: Lisbon = UTC
      rec('2026-06-15 14:00:00', 'PM', 3.0), // summer: Lisbon = UTC+1
    ];
    const { days } = parseIhRecords(records);
    expect(days['2026-01-15'].events[0].time).toBe('2026-01-15T14:00:00Z');
    expect(days['2026-06-15'].events[0].time).toBe('2026-06-15T13:00:00Z');
  });

  it('returns a ScrapeResult shape compatible with mergePortFile', () => {
    const result = parseIhRecords([rec('2026-01-15 14:00:00', 'PM', 3.0)]);
    expect(result).toMatchObject({
      days: expect.any(Object),
      failures: expect.any(Array),
      lastScrapeOk: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });
});
