"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { getLocation, UB_CENTER, type LatLng } from "@/lib/geo";
import { createClient, photoUrl } from "@/lib/supabase/client";
import { needInfo, type Capture } from "@/lib/types";
import PinCard from "@/components/PinCard";

const youIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:var(--color-brand);border:3px solid white;box-shadow:0 0 0 6px rgba(139,124,246,0.25)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Square photo pin. SOS pins get a coral border and a need badge,
// helped pins turn mint and fade, and your own Collect pins are lavender.
function pinIcon(capture: Capture) {
  const helped = !!capture.helped_at;
  const color = helped
    ? "var(--color-helped)"
    : capture.mode === "sos"
      ? "var(--color-sos)"
      : "var(--color-collect)";
  const badgeText = helped ? "✓" : capture.mode === "sos" ? (needInfo(capture.need)?.emoji ?? "🆘") : null;
  const badge = badgeText
    ? `<div style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:9999px;background:${color};color:white;font-weight:800;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:12px">${badgeText}</div>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:52px;height:52px">
      <img src="${photoUrl(capture.photo_path)}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:14px;border:3px solid ${color};box-shadow:0 4px 12px rgba(43,37,65,0.25);background:white;opacity:${helped ? 0.7 : 1}" />
      ${badge}
    </div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

// Everyone's SOS plus my own Collect, minus anything helped over a day ago.
// RLS already hides other people's Collect captures.
async function fetchMapCaptures(): Promise<Capture[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("captures")
    .select("*")
    .or(`mode.eq.sos,user_id.eq.${auth.user.id}`)
    .or(`helped_at.is.null,helped_at.gt.${dayAgo}`)
    .order("created_at", { ascending: true });
  return (data as Capture[]) ?? [];
}

// Full-screen map. Opens on central Ulaanbaatar, then moves to the person
// once the browser shares their location.
export default function MapView() {
  const [me, setMe] = useState<LatLng | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [selected, setSelected] = useState<Capture | null>(null);

  useEffect(() => {
    getLocation().then(setMe);
    const load = () => fetchMapCaptures().then(setCaptures);
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  function handleHelped(updated: Capture) {
    setCaptures((all) => all.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(updated);
  }

  return (
    <>
      <MapContainer
        center={[UB_CENTER.lat, UB_CENTER.lng]}
        zoom={14}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {captures.map((c) => (
          <Marker
            key={`${c.id}-${c.helped_at ?? ""}`}
            position={[c.lat, c.lng]}
            icon={pinIcon(c)}
            eventHandlers={{ click: () => setSelected(c) }}
          />
        ))}
        {me && (
          <>
            <Recenter to={me} />
            <Marker position={[me.lat, me.lng]} icon={youIcon} zIndexOffset={1000} />
          </>
        )}
      </MapContainer>
      {selected && (
        <PinCard capture={selected} onClose={() => setSelected(null)} onHelped={handleHelped} />
      )}
    </>
  );
}

function Recenter({ to }: { to: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([to.lat, to.lng], 16);
  }, [map, to]);
  return null;
}
