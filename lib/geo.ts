// Central Ulaanbaatar: where the map opens when location is refused.
export const UB_CENTER = { lat: 47.9186, lng: 106.9176 };

export type LatLng = { lat: number; lng: number };

// Street address for a spot, via our /api/address route. Null if it can't be found.
export async function lookupAddress(spot: LatLng): Promise<string | null> {
  try {
    const res = await fetch("/api/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(spot),
    });
    const { address } = await res.json();
    return address ?? null;
  } catch {
    return null;
  }
}

export function formatSpot(spot: LatLng) {
  return `Near ${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}`;
}

// Ask the browser for the person's location. Resolves null if refused or unavailable.
export function getLocation(timeoutMs = 10000): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}
