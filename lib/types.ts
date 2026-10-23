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

export const NEEDS: { value: Need; label: string; emoji: string }[] = [
  { value: "food", label: "Food", emoji: "🍖" },
  { value: "water", label: "Water", emoji: "💧" },
  { value: "vet", label: "Vet", emoji: "🩺" },
  { value: "owner", label: "Might be lost / looking for owner", emoji: "🏠" },
];

export function needInfo(need: Need | null) {
  return NEEDS.find((n) => n.value === need) ?? null;
}
