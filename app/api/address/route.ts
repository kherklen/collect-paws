import { NextResponse } from "next/server";

type NominatimResult = {
  category?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
};

// Named places worth saying "it's by here": shops, cafés, schools, parks, bus stops…
// Never buildings or house numbers, which could point at someone's home.
const PLACE_CATEGORIES = new Set(["amenity", "shop", "leisure", "tourism", "historic", "railway", "highway", "office"]);

// lat/lng → a short, privacy-safe place description, via OpenStreetMap's Nominatim:
// the closest named place or the street, plus the area — never a house number.
// `areaOnly` (the "I'm at home" option) gives just the area.
// Called once per save; the result is stored, never looked up again on view.
export async function POST(request: Request) {
  const { lat, lng, areaOnly = false } = await request.json().catch(() => ({}));
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ address: null }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=mn,en`;
    const res = await fetch(url, {
      // Nominatim's usage policy requires an identifying User-Agent.
      headers: { "User-Agent": "CollectSavar/0.1 (hackathon proof of concept)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ address: null });
    return NextResponse.json({ address: placeName(await res.json(), areaOnly === true) });
  } catch {
    return NextResponse.json({ address: null });
  }
}

function placeName(result: NominatimResult, areaOnly: boolean): string | null {
  const a = result.address ?? {};
  const area = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? null;
  if (areaOnly) return area;
  const named =
    result.name && result.category && PLACE_CATEGORIES.has(result.category) && result.name !== a.road
      ? result.name
      : null;
  const short = [named ?? a.road, area].filter(Boolean).join(", ");
  return short || area;
}
