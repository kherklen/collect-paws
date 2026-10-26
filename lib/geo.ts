// Central Ulaanbaatar: where the map opens when location is refused.
export const UB_CENTER = { lat: 47.9186, lng: 106.9176 };

export type LatLng = { lat: number; lng: number };

// A short place description for a spot (closest named place or street, plus the area;
// just the area with `areaOnly`), via our /api/address route. Null if it can't be found.
export async function lookupAddress(spot: LatLng, areaOnly = false): Promise<string | null> {
  try {
    const res = await fetch("/api/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...spot, areaOnly }),
    });
    const { address } = await res.json();
    return address ?? null;
  } catch {
    return null;
  }
}

// Ask the browser for the phone's location. Resolves null if refused or unavailable.
// Screens use lib/location.ts > getLocation, which also handles demo accounts.
export function getDeviceLocation(timeoutMs = 10000): Promise<LatLng | null> {
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

// A spot moved a random 100–200 m away, for "I'm at home: hide the exact spot".
export function nudge(spot: LatLng, minMeters = 100, maxMeters = 200): LatLng {
  const meters = minMeters + Math.random() * (maxMeters - minMeters);
  const angle = Math.random() * 2 * Math.PI;
  const dLat = (meters * Math.cos(angle)) / 111_000;
  const dLng = (meters * Math.sin(angle)) / (111_000 * Math.cos((spot.lat * Math.PI) / 180));
  return { lat: spot.lat + dLat, lng: spot.lng + dLng };
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

export function formatDistance(meters: number, lang: "en" | "mn" = "en") {
  const [m, km] = lang === "mn" ? ["м", "км"] : ["m", "km"];
  return meters < 1000 ? `${Math.round(meters / 10) * 10} ${m}` : `${(meters / 1000).toFixed(1)} ${km}`;
}

// Every place with its straight-line distance from a spot, nearest first.
export function byDistance<T extends LatLng>(from: LatLng, places: T[]) {
  return places
    .map((place) => ({ place, meters: distanceMeters(from, place) }))
    .sort((a, b) => a.meters - b.meters);
}

// The place closest to a spot, with its straight-line distance.
export function closestTo<T extends LatLng>(from: LatLng, places: T[]) {
  return byDistance(from, places)[0];
}

// Re-identification compares a new capture with animals captured this close to it.
export const MATCH_RADIUS_METERS = 500;

// Lost-pet alerts reach people within this distance of the last-seen place.
export const ALERT_RADIUS_METERS = 3000;

// Which red animals should alert this person: within 3 km of them, never their own,
// never ones they dismissed. (Whether a capture is red right now is decided by the caller.)
export function redAlertsFor<T extends { id: string; user_id: string; lat: number; lng: number }>(
  captures: T[],
  me: { id: string; spot: LatLng; dismissed: string[] },
) {
  return captures.filter(
    (c) => c.user_id !== me.id && !me.dismissed.includes(c.id) && distanceMeters(me.spot, c) <= ALERT_RADIUS_METERS,
  );
}

type AlertReport = { id: string; owner_id: string; last_seen_lat: number | null; last_seen_lng: number | null };

// Which open lost-pet reports should alert this person: no last-seen place (goes to
// everyone) or seen within 3 km of them. Never their own, never ones they dismissed.
// If we don't know where they are, only the "everyone" reports match.
export function alertsFor<T extends AlertReport>(
  reports: T[],
  me: { id: string; spot: LatLng | null; dismissed: string[] },
) {
  return reports.filter((r) => {
    if (r.owner_id === me.id || me.dismissed.includes(r.id)) return false;
    if (r.last_seen_lat === null || r.last_seen_lng === null) return true;
    if (!me.spot) return false;
    return distanceMeters(me.spot, { lat: r.last_seen_lat, lng: r.last_seen_lng }) <= ALERT_RADIUS_METERS;
  });
}
