// Vets outside Mongolia: /api/vets finds OpenStreetMap vets near a spot, needs a login,
// and answers with an empty list where there are none. Mongolia uses the built-in list.
// Run with the app running: node --env-file=.env.local scripts/check-vets-abroad.mjs [base-url]
import { check, cookieFor, finish, newAccount } from "./helpers.mjs";
import { distanceMeters } from "../lib/geo.ts";

const base = process.argv[2] ?? "http://localhost:3000";
const { client } = await newAccount("Traveler");
const cookie = await cookieFor(client);
const ask = async (spot, withLogin = true) => {
  const started = Date.now();
  const res = await fetch(`${base}/api/vets?lat=${spot.lat}&lng=${spot.lng}&lang=en`, { headers: withLogin ? { Cookie: cookie } : {} });
  const body = await res.json();
  return { status: res.status, vets: body.vets ?? [], failed: !!body.failed, ms: Date.now() - started };
};

const seoul = { lat: 37.5665, lng: 126.978 };
check("logged-out request is refused", (await ask(seoul, false)).status === 401);

for (const [city, spot] of [["Seoul", seoul], ["Berlin", { lat: 52.52, lng: 13.405 }]]) {
  const r = await ask(spot);
  if (r.failed) console.log(`  (${city}: OpenStreetMap's Overpass servers couldn't be reached)`);
  const farthest = Math.max(...r.vets.map((v) => distanceMeters(spot, v)));
  check(`${city}: vets found within 30 km`, r.vets.length > 0 && farthest <= 31000, `${r.vets.length} vets, e.g. "${r.vets.find((v) => v.name)?.name}", in ${r.ms} ms`);
  const again = await ask(spot);
  check(`${city}: asking again is answered from the cache`, again.vets.length === r.vets.length && again.ms < 1000, `${again.ms} ms`);
}

const ocean = await ask({ lat: 0, lng: -140 });
check("the middle of the Pacific: no vets, empty list", ocean.status === 200 && !ocean.failed && ocean.vets.length === 0, `${ocean.ms} ms`);

const { inMongolia } = await import("../lib/vets.ts").catch(() => ({}));
if (inMongolia) {
  check("Ulaanbaatar counts as Mongolia (built-in list)", inMongolia({ lat: 47.9186, lng: 106.9176 }));
  check("Seoul doesn't", !inMongolia(seoul));
}

await finish();
