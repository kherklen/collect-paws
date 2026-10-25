// Privacy check: public places never include a house number, "I'm at home" gives
// only the area and moves the pin 100–200 m, and public cards show no names.
// Run with the app running: node --env-file=.env.local scripts/check-privacy.mjs [base-url]
import { readFile } from "node:fs/promises";
import { check, finish } from "./helpers.mjs";
import { distanceMeters, nudge } from "../lib/geo.ts";

const base = process.argv[2] ?? "http://localhost:3000";
const place = async (spot, areaOnly = false) => {
  const res = await fetch(`${base}/api/address`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...spot, areaOnly }),
  });
  await new Promise((r) => setTimeout(r, 1100)); // Nominatim allows 1 request a second
  return (await res.json()).address;
};

// A pet shop at Сөүлийн гудамж 39 (the old format said "Сөүлийн гудамж 39, Бага Тойрог").
const shop = await place({ lat: 47.9127, lng: 106.898 });
check("next to a shop: its name and the area, no house number", shop === "Ананд амьтны дэлгүүр, Бага Тойрог", shop);
const market = await place({ lat: 47.9256, lng: 106.895 });
check("next to the Zuragt market: its name", market?.startsWith("зурагт зах"), market);
const street = await place({ lat: 47.9071, lng: 106.8828 });
check("no named place: street and area", street === "Тээвэрчдийн гудамж, Гандан", street);
const area = await place({ lat: 47.9127, lng: 106.898 }, true);
check("\"I'm at home\": the area only", area === "Бага Тойрог", area);

const home = { lat: 47.9127, lng: 106.898 };
const moves = Array.from({ length: 200 }, () => distanceMeters(home, nudge(home)));
check("the hidden pin always lands 100–200 m away", Math.min(...moves) >= 99 && Math.max(...moves) <= 201, `${Math.round(Math.min(...moves))}–${Math.round(Math.max(...moves))} m`);

for (const file of ["components/PinCard.tsx", "app/lost/[id]/page.tsx"]) {
  const code = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  check(`${file} no longer looks up the poster's name`, !code.includes('from("profiles")'));
}

await finish();
