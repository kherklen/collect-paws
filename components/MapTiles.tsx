"use client";

import { TileLayer } from "react-leaflet";
import { useI18n } from "@/lib/i18n";

// The map's background, by app language. In Mongolian, the standard OpenStreetMap map
// (local names, so Cyrillic in Ulaanbaatar). In English, the German OpenStreetMap
// server's map, which adds Latin-letter spellings so visitors can read street names
// (German-style, e.g. "Süchbaatar"). It only goes to zoom 18.
const TILES = {
  mn: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", maxZoom: 19 },
  en: { url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png", maxZoom: 18 },
};

export default function MapTiles() {
  const { lang } = useI18n();
  return (
    <TileLayer
      // A new key swaps the tiles when the language changes.
      key={lang}
      url={TILES[lang].url}
      maxZoom={TILES[lang].maxZoom}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    />
  );
}
