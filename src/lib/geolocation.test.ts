import { describe, it, expect } from 'vitest';
import { nearestPort } from './geolocation';
import { ports } from './ports';

describe('nearestPort', () => {
  it('returns the closest port for a fix on top of Lisboa', () => {
    const fix = { lat: 38.7077, lon: -9.1366 };
    const result = nearestPort(fix, ports);
    expect(result?.port.slug).toBe('lisboa');
    expect(result?.km).toBeLessThan(1);
  });

  it('picks the actually-closer of two candidates for a fix between Lisboa and Sines', () => {
    // Setúbal sits between Lisboa (~50 km N) and Sines (~70 km S),
    // closer to Lisboa.
    const setubalish = { lat: 38.524, lon: -8.892 };
    const result = nearestPort(setubalish, ports);
    expect(result?.port.slug).toBe('lisboa');
  });

  it('returns null when the ports list is empty', () => {
    const fix = { lat: 38.7077, lon: -9.1366 };
    expect(nearestPort(fix, [])).toBeNull();
  });
});
