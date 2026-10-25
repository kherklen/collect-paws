"use client";

import { useEffect, useState } from "react";
import type { LatLng } from "@/lib/geo";

// Current temperature from Open-Meteo (free, no key). One answer per ~10 km area
// is kept for 30 minutes, so the map, cards, and collection share a single call.
const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; celsius: Promise<number | null> }>();

export function getTemperature(spot: LatLng): Promise<number | null> {
  const key = `${spot.lat.toFixed(1)},${spot.lng.toFixed(1)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.celsius;
  const celsius = fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lng}&current=temperature_2m`,
    { signal: AbortSignal.timeout(8000) },
  )
    .then((res) => res.json())
    .then((data) => (typeof data?.current?.temperature_2m === "number" ? data.current.temperature_2m : null))
    .catch(() => null);
  cache.set(key, { at: Date.now(), celsius });
  return celsius;
}

// The temperature at a spot, or null while loading or if the weather can't be reached.
export function useTemperature(spot: LatLng | null) {
  const [celsius, setCelsius] = useState<number | null>(null);
  const lat = spot?.lat;
  const lng = spot?.lng;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    let cancelled = false;
    getTemperature({ lat, lng }).then((c) => !cancelled && setCelsius(c));
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);
  return celsius;
}
