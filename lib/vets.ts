import vetList from "./vets.json";

// Built-in Ulaanbaatar vet list (seeded from OpenStreetMap, plus vets the learner adds).
export type Vet = { name: string; lat: number; lng: number };

export const VETS: Vet[] = vetList;
