import vetList from "./vets.json";

// Built-in Ulaanbaatar vet list: the learner's vets, placed from their Google Maps
// links, plus one school from the original OpenStreetMap seed.
export type Vet = {
  name: string;
  lat: number;
  lng: number;
  // The vet's own Google Maps page (opens the place, with its directions button).
  maps?: string;
  address?: { en: string; mn: string };
  hours?: { en: string; mn: string };
};

export const VETS: Vet[] = vetList;

export function directionsUrl(vet: Vet) {
  return vet.maps ?? `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`;
}
