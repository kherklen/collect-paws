import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Vet } from "@/lib/vets";

// Vets outside Mongolia, from OpenStreetMap through Nominatim (free, no key).
// "veterinary surgery" is OpenStreetMap's search phrase for vet clinics. Looks within
// ~5 km first and widens to ~30 km when that finds fewer than 3. (Overpass was the
// first choice but its public servers kept timing out.)
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const BOXES_KM = [5, 30];
const ENOUGH = 3;

// Answers are kept for a day per ~1 km area and language, so Nominatim isn't asked again and again.
const DAY_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; vets: Vet[] }>();

// Nominatim allows one request a second, so requests from this server queue up.
let nextSlot = 0;
async function politely<T>(request: () => Promise<T>): Promise<T> {
  const wait = Math.max(0, nextSlot - Date.now());
  nextSlot = Math.max(nextSlot, Date.now()) + 1100;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  return request();
}

type Place = {
  type?: string;
  name?: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
};

function toVet(p: Place): Vet {
  const a = p.address ?? {};
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const address = [street, a.suburb ?? a.city_district ?? a.city ?? a.town].filter(Boolean).join(", ");
  const hours = p.extratags?.opening_hours;
  return {
    // An unnamed clinic gets "" and the vet sheet shows "Vet clinic".
    name: p.name ?? "",
    lat: Number(p.lat),
    lng: Number(p.lon),
    ...(address ? { address: { en: address, mn: address } } : {}),
    ...(hours ? { hours: { en: hours, mn: hours } } : {}),
  };
}

async function vetsInBox(lat: number, lng: number, km: number, lang: string): Promise<Vet[]> {
  const dLat = km / 111;
  const dLng = km / (111 * Math.cos((lat * Math.PI) / 180));
  const params = new URLSearchParams({
    q: "veterinary surgery",
    format: "jsonv2",
    viewbox: [lng - dLng, lat + dLat, lng + dLng, lat - dLat].join(","),
    bounded: "1",
    limit: "40",
    addressdetails: "1",
    extratags: "1",
    "accept-language": `${lang},en`,
  });
  const res = await politely(() =>
    fetch(`${NOMINATIM}?${params}`, {
      // Nominatim's usage policy requires an identifying User-Agent.
      headers: { "User-Agent": "CollectPaw/0.1 (vet finder)" },
      signal: AbortSignal.timeout(10000),
    }),
  );
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const places = (await res.json()) as Place[];
  return places.filter((p) => p.type === "veterinary").map(toVet);
}

// ?lat=&lng=&lang= → { vets }, or { vets: [], failed: true } when OpenStreetMap can't be
// reached. Logged-in only. The spot is rounded to about 1 km before it leaves our server.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const lat = Math.round(Number(params.get("lat")) * 100) / 100;
  const lng = Math.round(Number(params.get("lng")) * 100) / 100;
  const lang = params.get("lang") === "mn" ? "mn" : "en";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ vets: [] }, { status: 400 });
  }

  const key = `${lat},${lng},${lang}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY_MS) return NextResponse.json({ vets: hit.vets });

  try {
    let vets: Vet[] = [];
    for (const km of BOXES_KM) {
      vets = await vetsInBox(lat, lng, km, lang);
      if (vets.length >= ENOUGH) break;
    }
    cache.set(key, { at: Date.now(), vets });
    return NextResponse.json({ vets });
  } catch {
    // Not cached, so the next try asks again.
    return NextResponse.json({ vets: [], failed: true });
  }
}
