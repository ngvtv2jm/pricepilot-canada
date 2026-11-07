import { validPostal } from './domain.ts';

export type Coordinates = [latitude: number, longitude: number];
export type Branch = {
  id: string; retailer: string; address: string; city: string; province: string; postal: string;
  lat: number; lon: number; locator: string; checked: string; observed: string; source: string;
};
export type Directory = { version: number; checked: string; branches: Branch[]; centres: Record<string, Coordinates> };
export const savedPostalKey = 'pricepilot-postal';

export function postalArea(input: string): string | null {
  const code = input.trim().toUpperCase();
  return validPostal(code) || /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/.test(code) ? code.slice(0, 3) : null;
}

export function coordinatesValid(value: unknown): value is Coordinates {
  return Array.isArray(value) && value.length === 2 &&
    value.every(x => typeof x === 'number' && Number.isFinite(x)) &&
    Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180;
}

export function pilotArea([lat, lon]: Coordinates): boolean {
  return lat >= 43.55 && lat <= 43.87 && lon >= -79.65 && lon <= -79.10;
}

export function distanceKm([lat, lon]: Coordinates, [otherLat, otherLon]: Coordinates): number {
  const radians = Math.PI / 180;
  const a = Math.sin((otherLat - lat) * radians / 2) ** 2 +
    Math.cos(lat * radians) * Math.cos(otherLat * radians) * Math.sin((otherLon - lon) * radians / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearbyBranches(branches: Branch[], origin: Coordinates, radius: number, retailer: string) {
  return branches.filter(branch => !retailer || branch.retailer === retailer)
    .map(branch => ({ ...branch, distance: distanceKm(origin, [branch.lat, branch.lon]) }))
    .filter(branch => branch.distance <= radius)
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
}

export function directoryStale(checked: string, now = Date.now()): boolean {
  const time = Date.parse(checked);
  return !Number.isFinite(time) || now - time > 45 * 86400000;
}

export async function fetchBranchDirectory(signal?: AbortSignal): Promise<Directory> {
  const timeout = AbortSignal.timeout(8000);
  const response = await fetch('/toronto-branches.json', { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok) throw Error('Branch directory unavailable');
  const data = await response.json();
  if (data?.version !== 1 || !Array.isArray(data.branches) || !data.branches.length || !coordinatesValid(data.centres?.M5V)) {
    throw Error('Invalid branch directory');
  }
  return data;
}
