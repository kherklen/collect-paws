import vetList from "./vets.json";

// Built-in Ulaanbaatar vet list (seeded from OpenStreetMap, plus vets the learner adds).
// `approximate` means only the khoroo is known, so the pin sits at its office and
// directions search Google Maps by name instead.
export type Vet = {
  name: string;
  lat: number;
  lng: number;
  approximate?: boolean;
  address?: { en: string; mn: string };
  hours?: { en: string; mn: string };
};

export const VETS: Vet[] = vetList;

export function directionsUrl(vet: Vet) {
  if (vet.approximate) {
    const query = [vet.name, vet.address?.en, "Ulaanbaatar"].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`;
}
