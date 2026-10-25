"use client";

import { formatDistance } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { directionsUrl, type Vet } from "@/lib/vets";
import type { VetList } from "@/components/MapView";

// Bottom sheet: the chosen vet (the closest until another is tapped) with its
// address, hours, and a Google Maps link, then every vet nearest first.
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
  const meters = list.vets.find((v) => v.vet.name === chosen.name)?.meters ?? 0;
  const isClosest = list.vets[0]?.vet.name === chosen.name;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1100] rounded-t-[2rem] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-soft" />
      <div className="flex gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-vet/15 text-3xl">🩺</div>
        <div className="min-w-0">
          {isClosest && <p className="text-xs font-extrabold uppercase tracking-wide text-vet">{t.vet.closest}</p>}
          <h2 className="text-lg font-extrabold leading-tight">{chosen.name}</h2>
          <p className="text-sm text-muted">{t.vet.away(formatDistance(meters, lang), list.fromMapCenter)}</p>
          {chosen.address && <p className="mt-1 text-sm">📍 {chosen.address[lang]}</p>}
          {chosen.hours && <p className="text-sm">🕒 {chosen.hours[lang]}</p>}
        </div>
      </div>
      <a
        href={directionsUrl(chosen)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center rounded-full bg-vet py-3.5 font-extrabold text-white shadow-md shadow-vet/30 transition active:scale-[0.98]"
      >
        {t.vet.directions}
      </a>

      <p className="mt-4 px-1 text-xs font-extrabold uppercase tracking-wide text-muted">{t.vet.all(list.vets.length)}</p>
      <ul className="mt-1 max-h-40 overflow-y-auto">
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

      <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-sm font-bold text-muted">
        {t.common.close}
      </button>
    </div>
  );
}
