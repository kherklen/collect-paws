import { NextResponse } from "next/server";
import { placeName } from "@/lib/place";

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
