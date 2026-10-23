"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { getLocation, UB_CENTER, type LatLng } from "@/lib/geo";

const youIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:var(--color-brand);border:3px solid white;box-shadow:0 0 0 6px rgba(139,124,246,0.25)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Full-screen map. Opens on central Ulaanbaatar, then moves to the person
// once the browser shares their location.
export default function MapView() {
  const [me, setMe] = useState<LatLng | null>(null);

  useEffect(() => {
    getLocation().then(setMe);
  }, []);

  return (
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
      {me && (
        <>
          <Recenter to={me} />
          <Marker position={[me.lat, me.lng]} icon={youIcon} />
        </>
      )}
    </MapContainer>
  );
}

function Recenter({ to }: { to: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([to.lat, to.lng], 16);
  }, [map, to]);
  return null;
}
