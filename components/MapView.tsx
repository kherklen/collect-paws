"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap } from "react-leaflet";
import MapTiles from "@/components/MapTiles";
import { byDistance, UB_CENTER, type LatLng } from "@/lib/geo";
import { getLocation } from "@/lib/location";
import { createClient, photoUrl } from "@/lib/supabase/client";
import { needInfo, newestPerAnimal, type Capture } from "@/lib/types";
import PinCard from "@/components/PinCard";
import VetFinder from "@/components/VetFinder";
import { vetKey, vetsNear, type Vet } from "@/lib/vets";
import { URGENCY_COLOR, urgencyNow } from "@/lib/urgency";
import { useNow } from "@/lib/useNow";
import { useTemperature } from "@/lib/weather";

const youIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:var(--color-brand);border:3px solid white;box-shadow:0 0 0 6px rgba(244,124,87,0.25)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function vetIcon(closest: boolean) {
  const size = closest ? 44 : 30;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:${closest ? 14 : 10}px;background:var(--color-vet);color:white;border:3px solid white;box-shadow:0 4px 12px rgba(29,58,51,0.25);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${closest ? 22 : 16}px">+</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Every vet, nearest first, measured from the person (or the map center if location is off).
export type VetList = { vets: { vet: Vet; meters: number }[]; fromMapCenter: boolean; failed?: boolean };

// Square photo pin, bordered in its urgency color right now (green, amber, red).
// SOS pins get a need badge; helped pins turn blue and fade, and so do pins
// that waited days with no help (the animal may have moved on).
function pinIcon(capture: Capture, now: number, celsius: number | null) {
  const helped = !!capture.helped_at;
  const urgency = urgencyNow(capture, now, celsius);
  const color = helped ? "var(--color-helped)" : URGENCY_COLOR[urgency.level].cssVar;
  const faded = helped || urgency.mayBeGone;
  const badgeText = helped ? "✓" : capture.mode === "sos" ? (needInfo(capture.need)?.emoji ?? "🆘") : null;
  const badge = badgeText
    ? `<div style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:9999px;background:${color};color:white;font-weight:800;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:12px">${badgeText}</div>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:52px;height:52px">
      <img src="${photoUrl(capture.photo_path)}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:14px;border:3px solid ${color};box-shadow:0 4px 12px rgba(29,58,51,0.25);background:white;opacity:${faded ? 0.6 : 1}" />
      ${badge}
    </div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

// Everyone's SOS plus my own Collect, minus anything helped over a day ago,
// with one pin per animal (its newest capture). RLS already hides other people's Collect captures.
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
  return newestPerAnimal((data as Capture[]) ?? []);
}

// Full-screen map. Opens on central Ulaanbaatar, then moves to the person
// once the browser shares their location.
export default function MapView({
  showVet = false,
  onCloseVet = () => {},
  openPinId = null,
  onPinOpened = () => {},
}: {
  showVet?: boolean;
  onCloseVet?: () => void;
  // A pin to open on arrival (from a red alert), and a callback once it's open.
  openPinId?: string | null;
  onPinOpened?: () => void;
}) {
  const [me, setMe] = useState<LatLng | null>(null);
  const [vetList, setVetList] = useState<VetList | null>(null);
  // The vet shown in the sheet and highlighted on the map: the closest until another is tapped.
  const [chosenVet, setChosenVet] = useState<Vet | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [selected, setSelected] = useState<Capture | null>(null);
  // Where to center the map instead of on the person (a pin opened from an alert).
  const [focus, setFocus] = useState<LatLng | null>(null);
  const now = useNow();
  // One temperature for the area on screen; colder weather makes waiting pins turn red sooner.
  const celsius = useTemperature(me ?? UB_CENTER);

  useEffect(() => {
    getLocation().then(setMe);
    const load = () => fetchMapCaptures().then(setCaptures);
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const shownVet = chosenVet ?? vetList?.vets[0]?.vet ?? null;

  useEffect(() => {
    if (!openPinId) return;
    let cancelled = false;
    createClient()
      .from("captures")
      .select("*")
      .eq("id", openPinId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSelected(data as Capture);
        setFocus({ lat: data.lat, lng: data.lng });
        onPinOpened();
      });
    return () => {
      cancelled = true;
    };
  }, [openPinId, onPinOpened]);

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
        <MapTiles />
        {captures.map((c) => (
          <Marker
            key={`${c.id}-${c.helped_at ?? ""}`}
            position={[c.lat, c.lng]}
            icon={pinIcon(c, now, celsius)}
            eventHandlers={{ click: () => setSelected(c) }}
          />
        ))}
        {showVet && <SortVets me={me} onSorted={setVetList} />}
        {showVet && chosenVet && <ShowVet me={me} vet={chosenVet} />}
        {showVet &&
          vetList?.vets.map(({ vet }) => {
            const shown = !!shownVet && vetKey(vet) === vetKey(shownVet);
            return (
              <Marker
                key={vetKey(vet)}
                position={[vet.lat, vet.lng]}
                icon={vetIcon(shown)}
                zIndexOffset={shown ? 900 : 0}
                eventHandlers={{ click: () => setChosenVet(vet) }}
              />
            );
          })}
        {focus && !showVet && <Recenter to={focus} />}
        {me && (
          <>
            {!showVet && !focus && <Recenter to={me} />}
            <Marker position={[me.lat, me.lng]} icon={youIcon} zIndexOffset={1000} />
          </>
        )}
      </MapContainer>
      {showVet && (
        <VetFinder
          list={vetList}
          chosen={shownVet}
          onChoose={setChosenVet}
          onClose={() => {
            setChosenVet(null);
            setVetList(null);
            onCloseVet();
          }}
        />
      )}
      {selected && (
        <PinCard
          capture={selected}
          onClose={() => setSelected(null)}
          onHelped={handleHelped}
          onDeleted={(id) => {
            setCaptures((all) => all.filter((c) => c.id !== id));
            setSelected(null);
          }}
        />
      )}
    </>
  );
}

// Finds the vets near the person (or the map center if location is off): the built-in
// list in Mongolia, OpenStreetMap elsewhere. Sorts them by distance and fits the
// closest one and the person on screen.
function SortVets({ me, onSorted }: { me: LatLng | null; onSorted: (list: VetList) => void }) {
  const map = useMap();
  useEffect(() => {
    const center = map.getCenter();
    const from = me ?? { lat: center.lat, lng: center.lng };
    let cancelled = false;
    vetsNear(from).then((found) => {
      if (cancelled) return;
      const vets = byDistance(from, found ?? []).map(({ place, meters }) => ({ vet: place, meters }));
      onSorted({ vets, fromMapCenter: !me, failed: found === null });
      if (vets[0]) fitVet(map, from, vets[0].vet);
    });
    return () => {
      cancelled = true;
    };
  }, [map, me, onSorted]);
  return null;
}

// When a vet is tapped in the list or on the map, fits it and the person on screen.
function ShowVet({ me, vet }: { me: LatLng | null; vet: Vet }) {
  const map = useMap();
  useEffect(() => {
    fitVet(map, me ?? vet, vet);
  }, [map, me, vet]);
  return null;
}

// The vet sheet covers the bottom of the map, so leave room for it.
function fitVet(map: L.Map, from: LatLng, vet: Vet) {
  map.fitBounds(
    [
      [from.lat, from.lng],
      [vet.lat, vet.lng],
    ],
    { paddingTopLeft: [60, 110], paddingBottomRight: [60, 300], maxZoom: 16 },
  );
}

function Recenter({ to }: { to: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([to.lat, to.lng], 16);
  }, [map, to]);
  return null;
}
