import { describe, it, expect } from 'vitest';
import { getDayWindow, type PortDataFile } from './data';

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
