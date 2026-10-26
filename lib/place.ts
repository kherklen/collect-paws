// Turns an OpenStreetMap (Nominatim) reverse lookup into a short, privacy-safe place:
// the closest named place or the street, plus the area — never a house number.
// Used by /api/address and scripts/seed-demo.mjs.

export type NominatimResult = {
  category?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
};

// Named places worth saying "it's by here": shops, cafés, schools, parks, bus stops…
// Never buildings or house numbers, which could point at someone's home.
const PLACE_CATEGORIES = new Set(["amenity", "shop", "leisure", "tourism", "historic", "railway", "highway", "office"]);

export function placeName(result: NominatimResult, areaOnly: boolean): string | null {
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
