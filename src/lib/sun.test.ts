import { describe, it, expect } from 'vitest';
import { getSunTimes } from './sun';

describe('getSunTimes', () => {
  it('matches published Lisboa sunrise and sunset on the summer solstice within 5 minutes', () => {
    const lisboa = { lat: 38.7077, lon: -9.1366 };
    const { sunrise, sunset } = getSunTimes('2026-06-21', lisboa);

    // Published civil times for Lisboa on 2026-06-21 (Lisbon = UTC+01 WEST):
    //   sunrise ~ 06:11 local = 05:11 UTC
    //   sunset  ~ 21:05 local = 20:05 UTC
    // SunCalc / NOAA / timeanddate differ by a few minutes due to refraction-
    // model conventions; 5min tolerance covers all common sources.
    const expectedSunrise = new Date('2026-06-21T05:11:00Z').getTime();
    const expectedSunset = new Date('2026-06-21T20:05:00Z').getTime();
    const tol = 5 * 60_000;

    expect(Math.abs(sunrise.getTime() - expectedSunrise)).toBeLessThanOrEqual(tol);
    expect(Math.abs(sunset.getTime() - expectedSunset)).toBeLessThanOrEqual(tol);
  });
});
