"use client";

import { useState } from "react";
import { formatDistance } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { directionsUrl, type Vet } from "@/lib/vets";
import type { VetList } from "@/components/MapView";

// Bottom sheet for the chosen vet (the closest until another is tapped): its address,
// hours, and a Google Maps link. It starts compact; "All vets" opens the full list
// nearest first, the handle shrinks it to one slim row, and × closes it.
export default function VetFinder({
  list,
  chosen,
  onChoose,
  onClose,
}: {
  list: VetList;
  chosen: Vet;
  onChoose: (vet: Vet) => void;
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const [shrunk, setShrunk] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const meters = list.vets.find((v) => v.vet.name === chosen.name)?.meters ?? 0;
  const isClosest = list.vets[0]?.vet.name === chosen.name;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1100] rounded-t-[2rem] bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 shadow-2xl">
      <div className="flex items-center">
        <span className="w-9" />
        <button
          type="button"
          onClick={() => setShrunk(!shrunk)}
          aria-label={shrunk ? t.vet.expand : t.vet.shrink}
          className="flex flex-1 justify-center py-3"
        >
          <span className="h-1.5 w-12 rounded-full bg-brand-soft" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted"
        >
          ×
        </button>
      </div>

      {shrunk ? (
        <button type="button" onClick={() => setShrunk(false)} className="flex w-full items-center gap-3 pb-1 text-left">
          <span className="text-xl">🩺</span>
          <span className="min-w-0 flex-1 truncate font-bold">{chosen.name}</span>
          <span className="shrink-0 text-sm text-muted">{formatDistance(meters, lang)} ▴</span>
        </button>
      ) : (
        <>
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vet/15 text-2xl">🩺</div>
            <div className="min-w-0">
              {isClosest && <p className="text-[11px] font-extrabold uppercase tracking-wide text-vet">{t.vet.closest}</p>}
              <h2 className="font-display text-lg font-bold italic leading-tight">{chosen.name}</h2>
              <p className="text-sm text-muted">{t.vet.away(formatDistance(meters, lang), list.fromMapCenter)}</p>
              {chosen.address && <p className="mt-1 text-sm">📍 {chosen.address[lang]}</p>}
              {chosen.hours && <p className="text-sm">🕒 {chosen.hours[lang]}</p>}
            </div>
          </div>
          <a
            href={directionsUrl(chosen)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center rounded-full bg-vet py-3 font-extrabold text-white shadow-md shadow-vet/30 transition active:scale-[0.98]"
          >
            {t.vet.directions}
          </a>

          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="mt-2 w-full py-2 text-sm font-bold text-brand-dark"
          >
            {t.vet.all(list.vets.length)} {showAll ? "▴" : "▾"}
          </button>
          {showAll && (
            <ul className="max-h-36 overflow-y-auto">
              {list.vets.map(({ vet, meters }) => (
                <li key={vet.name}>
                  <button
                    type="button"
                    onClick={() => onChoose(vet)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm ${
                      vet.name === chosen.name ? "bg-vet/10 font-bold text-vet" : "text-ink"
                    }`}
                  >
                    <span className="truncate">{vet.name}</span>
                    <span className="shrink-0 text-muted">{formatDistance(meters, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
