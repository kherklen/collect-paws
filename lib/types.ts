export type Mode = "collect" | "sos";
export type Need = "food" | "water" | "vet" | "owner";
// green = fed or fine (a Collect capture); amber = hungry or limping; red = injured or trapped.
export type Urgency = "green" | "amber" | "red";

export type Capture = {
  id: string;
  user_id: string;
  photo_path: string;
  breed: string | null;
  animal: "cat" | "dog" | null;
  // Captures of the same animal share this (re-identification).
  animal_id: string;
  mode: Mode;
  need: Need | null;
  urgency: Urgency;
  lat: number;
  lng: number;
  address: string | null;
  created_at: string;
  helped_at: string | null;
  helped_by: string | null;
};

// Labels for each need are in lib/i18n/dictionaries.ts (`needs`).
export const NEEDS: { value: Need; emoji: string }[] = [
  { value: "food", emoji: "🍖" },
  { value: "water", emoji: "💧" },
  { value: "vet", emoji: "🩺" },
  { value: "owner", emoji: "🏠" },
];

export function needInfo(need: Need | null) {
  return NEEDS.find((n) => n.value === need) ?? null;
}

export type LostPet = {
  id: string;
  owner_id: string;
  photo_path: string;
  description: string;
  last_seen_lat: number | null;
  last_seen_lng: number | null;
  last_seen_address: string | null;
  status: "open" | "found";
  created_at: string;
  found_at: string | null;
};

export type Sighting = {
  id: string;
  lost_pet_id: string;
  reporter_id: string;
  kind: "now" | "report";
  photo_path: string | null;
  seen_at: string;
  lat: number | null;
  lng: number | null;
  place_text: string | null;
  description: string | null;
  created_at: string;
  read_at: string | null;
};

// What /api/match found: an animal captured nearby that looks like the new photo.
// The photo is only there when the person may see that capture (theirs, or SOS).
export type AnimalMatch = {
  animal_id: string;
  photo_url: string | null;
  mine: boolean;
};

// One entry per animal (its newest capture), in the order the captures came in.
export function newestPerAnimal<T extends Pick<Capture, "animal_id" | "created_at">>(captures: T[]): T[] {
  const newest = new Map<string, T>();
  for (const c of captures) {
    const kept = newest.get(c.animal_id);
    if (!kept || c.created_at > kept.created_at) newest.set(c.animal_id, c);
  }
  return captures.filter((c) => newest.get(c.animal_id) === c);
}
