import { describe, it, expect } from 'vitest';
import { coverageStatus, getDayWindow, type PortDataFile } from './data';

describe('getDayWindow', () => {
  it('returns events from the previous, current, and next day, sorted by time', () => {
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-05-28T03:00:00Z',
      days: {
        '2026-05-26': {
          events: [
            { time: '2026-05-26T07:00:00Z', height: 3.0, type: 'high' },
            { time: '2026-05-26T13:00:00Z', height: 0.5, type: 'low' },
          ],
        },
        '2026-05-27': {
          events: [
            { time: '2026-05-27T01:00:00Z', height: 0.5, type: 'low' },
            { time: '2026-05-27T08:00:00Z', height: 3.0, type: 'high' },
          ],
        },
        '2026-05-28': {
          events: [
            { time: '2026-05-28T02:00:00Z', height: 0.5, type: 'low' },
            { time: '2026-05-28T09:00:00Z', height: 3.0, type: 'high' },
          ],
        },
      },
    };

    const result = getDayWindow(data, '2026-05-27');

    expect(result).toEqual([
      { time: '2026-05-26T07:00:00Z', height: 3.0, type: 'high' },
      { time: '2026-05-26T13:00:00Z', height: 0.5, type: 'low' },
      { time: '2026-05-27T01:00:00Z', height: 0.5, type: 'low' },
      { time: '2026-05-27T08:00:00Z', height: 3.0, type: 'high' },
      { time: '2026-05-28T02:00:00Z', height: 0.5, type: 'low' },
      { time: '2026-05-28T09:00:00Z', height: 3.0, type: 'high' },
    ]);
  });

  it('returns an empty array when the centre date and both adjacent days are missing', () => {
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-05-28T03:00:00Z',
      days: {},
    };

    expect(getDayWindow(data, '2026-05-27')).toEqual([]);
  });

  it('returns only the present-day events when both adjacent days are missing', () => {
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-05-28T03:00:00Z',
      days: {
        '2026-05-27': {
          events: [
            { time: '2026-05-27T01:00:00Z', height: 0.5, type: 'low' },
            { time: '2026-05-27T08:00:00Z', height: 3.0, type: 'high' },
          ],
        },
      },
    };

    const result = getDayWindow(data, '2026-05-27');

    expect(result).toEqual([
      { time: '2026-05-27T01:00:00Z', height: 0.5, type: 'low' },
      { time: '2026-05-27T08:00:00Z', height: 3.0, type: 'high' },
    ]);
  });

  it('does not mutate the input data', () => {
    const events = [
      { time: '2026-05-27T08:00:00Z', height: 3.0, type: 'high' as const },
      { time: '2026-05-27T01:00:00Z', height: 0.5, type: 'low' as const },
    ];
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-05-28T03:00:00Z',
      days: { '2026-05-27': { events } },
    };

    getDayWindow(data, '2026-05-27');

    expect(events[0].time).toBe('2026-05-27T08:00:00Z');
    expect(events[1].time).toBe('2026-05-27T01:00:00Z');
  });
});

describe('coverageStatus', () => {
  const fiveDays = [
    '2026-05-28',
    '2026-05-29',
    '2026-05-30',
    '2026-05-31',
    '2026-06-01',
  ];
  const emptyDay = { events: [] };

  it('returns no flags when every requested day is present and lastScrapeOk is recent', () => {
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-05-28T03:00:00Z',
      days: Object.fromEntries(fiveDays.map((d) => [d, emptyDay])),
    };
    const now = new Date('2026-05-28T12:00:00Z');

    expect(coverageStatus(data, fiveDays, now)).toEqual({
      windowIncomplete: false,
      sourceQuiet: false,
      ageDays: 0,
      missingDates: [],
    });
  });

  it('flags windowIncomplete and lists the missing dates when any requested day is absent', () => {
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-05-28T03:00:00Z',
      days: {
        '2026-05-28': emptyDay,
        '2026-05-29': emptyDay,
        '2026-06-01': emptyDay,
      },
    };
    const now = new Date('2026-05-28T12:00:00Z');

    expect(coverageStatus(data, fiveDays, now)).toEqual({
      windowIncomplete: true,
      sourceQuiet: false,
      ageDays: 0,
      missingDates: ['2026-05-30', '2026-05-31'],
    });
  });

  it('flags sourceQuiet with rounded ageDays when lastScrapeOk is more than 7 days ago', () => {
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-05-18T12:00:00Z',
      days: Object.fromEntries(fiveDays.map((d) => [d, emptyDay])),
    };
    const now = new Date('2026-05-28T12:00:00Z');

    expect(coverageStatus(data, fiveDays, now)).toEqual({
      windowIncomplete: false,
      sourceQuiet: true,
      ageDays: 10,
      missingDates: [],
    });
  });

  it('does not flag sourceQuiet at exactly 7 days', () => {
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-05-21T12:00:00Z',
      days: Object.fromEntries(fiveDays.map((d) => [d, emptyDay])),
    };
    const now = new Date('2026-05-28T12:00:00Z');

    const status = coverageStatus(data, fiveDays, now);
    expect(status.sourceQuiet).toBe(false);
    expect(status.ageDays).toBe(7);
  });

  it('flags both windowIncomplete and sourceQuiet when both conditions hold', () => {
    const data: PortDataFile = {
      port: 'test',
      lastScrapeOk: '2026-05-20T12:00:00Z',
      days: {
        '2026-05-28': emptyDay,
        '2026-05-30': emptyDay,
        '2026-06-01': emptyDay,
      },
    };
    const now = new Date('2026-05-28T12:00:00Z');

    expect(coverageStatus(data, fiveDays, now)).toEqual({
      windowIncomplete: true,
      sourceQuiet: true,
      ageDays: 8,
      missingDates: ['2026-05-29', '2026-05-31'],
    });
  });
});
