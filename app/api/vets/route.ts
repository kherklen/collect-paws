import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Vet } from "@/lib/vets";

// Vets outside Mongolia, from OpenStreetMap's Overpass API (free, no key).
// Searches 10 km, then 30 km if that finds none. The public servers are often busy,
// so two are asked at once and the first good answer wins.
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const RADII_METERS = [10000, 30000];

// Answers are kept for a day per ~1 km area, so Overpass isn't asked again and again.
const DAY_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; vets: Vet[] }>();

type Element = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function toVet(e: Element): Vet | null {
  const lat = e.lat ?? e.center?.lat;
  const lng = e.lon ?? e.center?.lon;
  if (lat === undefined || lng === undefined) return null;
  const tags = e.tags ?? {};
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const address = [street, tags["addr:city"]].filter(Boolean).join(", ");
  const hours = tags.opening_hours;
  return {
    // An unnamed clinic gets "" and the vet sheet shows "Vet clinic".
    name: tags.name ?? tags["name:en"] ?? "",
    lat,
    lng,
    ...(address ? { address: { en: address, mn: address } } : {}),
    ...(hours ? { hours: { en: hours, mn: hours } } : {}),
  };
}

async function askOverpass(query: string): Promise<Element[]> {
  return Promise.any(
    OVERPASS.map(async (url) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "CollectPaw/0.1" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const { elements } = (await res.json()) as { elements?: Element[] };
      if (!elements) throw new Error("Overpass gave no elements");
      return elements;
    }),
  );
}

// ?lat=&lng= → { vets }, or { vets: [], failed: true } when OpenStreetMap can't be reached. Logged-in only. The spot is rounded to about 1 km before
// it leaves our server.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const lat = Math.round(Number(params.get("lat")) * 100) / 100;
  const lng = Math.round(Number(params.get("lng")) * 100) / 100;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ vets: [] }, { status: 400 });
  }

  const key = `${lat},${lng}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY_MS) return NextResponse.json({ vets: hit.vets });

  try {
    let vets: Vet[] = [];
    for (const radius of RADII_METERS) {
      const query = `[out:json][timeout:15];nwr["amenity"="veterinary"](around:${radius},${lat},${lng});out center tags 50;`;
      vets = (await askOverpass(query)).map(toVet).filter((v): v is Vet => v !== null);
      if (vets.length > 0) break;
    }
    cache.set(key, { at: Date.now(), vets });
    return NextResponse.json({ vets });
  } catch {
    // Not cached, so the next try asks again.
    return NextResponse.json({ vets: [], failed: true });
  }
}
