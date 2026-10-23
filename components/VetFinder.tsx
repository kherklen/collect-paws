"use client";

import { formatDistance } from "@/lib/geo";
import type { Vet } from "@/lib/vets";

// Bottom sheet with the closest vet and a Google Maps directions link.
export default function VetFinder({
  vet,
  meters,
  fromMapCenter,
  onClose,
}: {
  vet: Vet;
  meters: number;
  fromMapCenter: boolean;
  onClose: () => void;
}) {
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1100] rounded-t-[2rem] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-soft" />
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-vet/15 text-3xl">🩺</div>
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-vet">Closest vet</p>
          <h2 className="text-lg font-extrabold leading-tight">{vet.name}</h2>
          <p className="text-sm text-muted">
            {formatDistance(meters)} away{fromMapCenter ? " from the map center (location is off)" : ""}
          </p>
        </div>
      </div>
      <a
        href={directions}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex w-full items-center justify-center rounded-full bg-vet py-3.5 font-extrabold text-white shadow-md shadow-vet/30 transition active:scale-[0.98]"
      >
        Directions ↗
      </a>
      <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-sm font-bold text-muted">
        Close
      </button>
    </div>
  );
}
