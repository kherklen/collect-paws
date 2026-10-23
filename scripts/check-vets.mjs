// Slice 6 check: distances are right and the closest vet is picked correctly.
// Imports the app's own lib/geo.ts (Node strips the TypeScript types).
import { readFile } from "node:fs/promises";
import { check, finish } from "./helpers.mjs";
import { closestTo, distanceMeters, formatDistance } from "../lib/geo.ts";

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
  check(`next to "${vet.name}" → picks it`, place.name === vet.name && meters < 100, `${Math.round(meters)} m`);
}

finish();
