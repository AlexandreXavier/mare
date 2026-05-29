import type { Port } from './ports';

export type Fix = { lat: number; lon: number };
export type NearestResult = { port: Port; km: number };

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

const haversineKm = (a: Fix, b: Fix): number => {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const nearestPort = (fix: Fix, ports: Port[]): NearestResult | null => {
  let best: NearestResult | null = null;
  for (const port of ports) {
    const km = haversineKm(fix, port);
    if (best === null || km < best.km) best = { port, km };
  }
  return best;
};

export type PermissionState = 'granted' | 'prompt' | 'denied' | 'unavailable';

export const permissionState = async (): Promise<PermissionState> => {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unavailable';
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state as PermissionState;
  } catch {
    return 'unavailable';
  }
};

export const getCurrentPosition = (timeoutMs = 10_000): Promise<Fix> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation API unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
