// Slices 6 and 13 check: distances are right, the closest vet is picked correctly,
// every vet is in Ulaanbaatar, and the list sorts nearest first.
// Imports the app's own lib/geo.ts (Node strips the TypeScript types).
import { readFile } from "node:fs/promises";
import { check, finish } from "./helpers.mjs";
import { byDistance, closestTo, distanceMeters, formatDistance } from "../lib/geo.ts";

const vets = JSON.parse(await readFile(new URL("../lib/vets.json", import.meta.url), "utf8"));

// Sükhbaatar Square → Zaisan Memorial is about 3.9 km in a straight line.
const d = distanceMeters({ lat: 47.9187, lng: 106.9177 }, { lat: 47.8836, lng: 106.9157 });
check("haversine matches a known distance (~3.9 km)", Math.abs(d - 3906) < 50, `${Math.round(d)} m`);
check("distance to the same spot is 0", distanceMeters(vets[0], vets[0]) === 0);
check("short distances show in meters", formatDistance(640) === "640 m", formatDistance(640));
check("long distances show in km", formatDistance(2345) === "2.3 km", formatDistance(2345));

for (const vet of vets) {
  const nearby = { lat: vet.lat + 0.0005, lng: vet.lng - 0.0005 };
  const { place, meters } = closestTo(nearby, vets);
  // Two vets can share a building (Энэрэх and V.E.T.Net), so either one at the spot counts.
  const samePlace = place.lat === vet.lat && place.lng === vet.lng;
  check(`next to "${vet.name}" → picks it`, samePlace && meters < 100, `${Math.round(meters)} m`);
  const inUB = vet.lat > 47.8 && vet.lat < 48.05 && vet.lng > 106.6 && vet.lng < 107.2;
  const textOk = [vet.address, vet.hours].every((x) => x === undefined || (x.en?.trim() && x.mn?.trim()));
  check(`"${vet.name}" is in Ulaanbaatar with both languages`, inUB && textOk);
}

const names = vets.map((v) => v.name);
check("vet names are unique", new Set(names).size === names.length);
const sorted = byDistance({ lat: 47.9186, lng: 106.9176 }, vets);
check("the list is nearest first", sorted.every((v, i) => i === 0 || sorted[i - 1].meters <= v.meters), sorted.map((v) => formatDistance(v.meters)).join(", "));

await finish();
