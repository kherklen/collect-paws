// Central Ulaanbaatar: where the map opens when location is refused.
export const UB_CENTER = { lat: 47.9186, lng: 106.9176 };

export type LatLng = { lat: number; lng: number };

// Street address for a spot, via our /api/address route. Null if it can't be found.
export async function lookupAddress(spot: LatLng): Promise<string | null> {
  try {
    const res = await fetch("/api/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(spot),
    });
    const { address } = await res.json();
    return address ?? null;
  } catch {
    return null;
  }
}

export function formatSpot(spot: LatLng) {
  return `Near ${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}`;
}

// Ask the browser for the person's location. Resolves null if refused or unavailable.
export function getLocation(timeoutMs = 10000): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

// Straight-line distance between two spots, in meters (the haversine formula).
export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

// The place closest to a spot, with its straight-line distance.
export function closestTo<T extends LatLng>(from: LatLng, places: T[]) {
  return places
    .map((place) => ({ place, meters: distanceMeters(from, place) }))
    .reduce((best, next) => (next.meters < best.meters ? next : best));
}
