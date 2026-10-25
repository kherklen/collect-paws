import vetList from "./vets.json";
import type { LatLng } from "@/lib/geo";

// A vet clinic. In Mongolia they come from the built-in list below; elsewhere from
// OpenStreetMap through /api/vets (those have no Google Maps link and may lack a name).
export type Vet = {
  name: string;
  lat: number;
  lng: number;
  // The vet's own Google Maps page (opens the place, with its directions button).
  maps?: string;
  address?: { en: string; mn: string };
  hours?: { en: string; mn: string };
};

// Built-in Ulaanbaatar vet list: the learner's vets, placed from their Google Maps
// links, plus one school from the original OpenStreetMap seed.
export const VETS: Vet[] = vetList;

// Rough box around Mongolia: inside it, the built-in list; outside, OpenStreetMap.
export function inMongolia(spot: LatLng) {
  return spot.lat > 41.5 && spot.lat < 52.2 && spot.lng > 87.7 && spot.lng < 120;
}

// Vets near a spot: the built-in list in Mongolia, otherwise looked up by /api/vets.
// Null means the lookup couldn't reach OpenStreetMap; [] means there are none nearby.
export async function vetsNear(spot: LatLng): Promise<Vet[] | null> {
  if (inMongolia(spot)) return VETS;
  try {
    const res = await fetch(`/api/vets?lat=${spot.lat}&lng=${spot.lng}`, { signal: AbortSignal.timeout(50000) });
    const { vets = [], failed = false } = await res.json();
    return failed ? null : vets;
  } catch {
    return null;
  }
}

// Names can repeat (chains, unnamed clinics), so vets are told apart by name and spot.
export function vetKey(vet: Vet) {
  return `${vet.name}|${vet.lat}|${vet.lng}`;
}

export function directionsUrl(vet: Vet) {
  return vet.maps ?? `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`;
}
