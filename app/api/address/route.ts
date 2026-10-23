import { NextResponse } from "next/server";

type NominatimResult = {
  display_name?: string;
  address?: Record<string, string>;
};

// lat/lng → a short street address, via OpenStreetMap's Nominatim.
// Called once per save; the result is stored, never looked up again on view.
export async function POST(request: Request) {
  const { lat, lng } = await request.json().catch(() => ({}));
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
    return NextResponse.json({ address: shortAddress(await res.json()) });
  } catch {
    return NextResponse.json({ address: null });
  }
}

function shortAddress(result: NominatimResult): string | null {
  const a = result.address ?? {};
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const area = a.suburb ?? a.city_district ?? a.neighbourhood ?? a.quarter;
  const short = [street, area].filter(Boolean).join(", ");
  if (short) return short;
  return result.display_name?.split(",").slice(0, 3).join(",").trim() || null;
}
