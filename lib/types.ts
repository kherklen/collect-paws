export type Mode = "collect" | "sos";
export type Need = "food" | "water" | "vet" | "owner";

export type Capture = {
  id: string;
  user_id: string;
  photo_path: string;
  breed: string | null;
  mode: Mode;
  need: Need | null;
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
