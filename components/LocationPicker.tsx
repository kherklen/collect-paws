"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { UB_CENTER, type LatLng } from "@/lib/geo";

const dropIcon = L.divIcon({
  className: "",
  html: '<div style="font-size:34px;line-height:1;transform:translate(-2px,-6px)">📍</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

// A small map where the person taps to choose a spot.
export default function LocationPicker({
  value,
  onChange,
  center = UB_CENTER,
}: {
  value: LatLng | null;
  onChange: (spot: LatLng) => void;
  center?: LatLng;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      className="h-64 w-full overflow-hidden rounded-3xl"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <TapToPick onChange={onChange} />
      {value && <Marker position={[value.lat, value.lng]} icon={dropIcon} />}
    </MapContainer>
  );
}

function TapToPick({ onChange }: { onChange: (spot: LatLng) => void }) {
  useMapEvents({
    click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}
