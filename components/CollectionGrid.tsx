"use client";

import { useEffect, useState } from "react";
import { createClient, photoUrl } from "@/lib/supabase/client";
import { formatDay, useI18n } from "@/lib/i18n";
import { needInfo, newestPerAnimal, type Capture } from "@/lib/types";
import { URGENCY_COLOR, urgencyNow } from "@/lib/urgency";
import { useNow } from "@/lib/useNow";
import { useTemperature } from "@/lib/weather";
import { UB_CENTER } from "@/lib/geo";
import PinCard from "@/components/PinCard";

// My Collection: a three-column grid of the animals the person has captured, newest first.
// Capturing the same animal again doesn't add a card; its card counts the captures (×2).
export default function CollectionGrid() {
  const { t } = useI18n();
  const [captures, setCaptures] = useState<Capture[] | null>(null);
  const [selected, setSelected] = useState<Capture | null>(null);
  const now = useNow();
  const celsius = useTemperature(UB_CENTER);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("captures")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });
      setCaptures((data as Capture[]) ?? []);
    })();
  }, []);

  if (captures === null) {
    return <div className="h-full bg-canvas" />;
  }

  if (captures.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-canvas px-4 pb-32 pt-24">
        <div className="mx-auto mt-16 max-w-xs text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-lime text-5xl">
            🐱
          </div>
          <h2 className="text-xl font-display font-bold italic">{t.grid.emptyTitle}</h2>
          <p className="mt-2 text-muted">
            {t.grid.emptyText}
          </p>
        </div>
      </div>
    );
  }

  const animals = newestPerAnimal(captures);
  const timesCaptured = (animalId: string) => captures.filter((c) => c.animal_id === animalId).length;

  return (
    <div className="h-full overflow-y-auto bg-canvas px-3 pb-36 pt-20">
      <p className="mb-3 px-1 text-sm font-bold text-muted">
        {t.grid.collected(animals.length)}
      </p>
      <ul className="grid grid-cols-3 gap-3">
        {animals.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setSelected(c)} className="flex w-full flex-col gap-1 text-left">
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(c.photo_path)}
                  alt={c.breed ?? t.pin.capturedAnimal}
                  className={`aspect-square w-full rounded-2xl border-[3px] object-cover shadow-sm ${
                    c.helped_at ? "border-helped opacity-75" : URGENCY_COLOR[urgencyNow(c, now, celsius).level].border
                  }`}
                />
                {timesCaptured(c.animal_id) > 1 && (
                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-extrabold text-brand-dark">
                    ×{timesCaptured(c.animal_id)}
                  </span>
                )}
                {c.helped_at ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-helped px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {t.pin.helpedBadge}
                  </span>
                ) : c.mode === "sos" && (
                  <span
                    className={`absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs ${
                      urgencyNow(c, now, celsius).level === "red" ? "bg-sos" : "bg-amber"
                    }`}
                  >
                    {needInfo(c.need)?.emoji ?? "🆘"}
                  </span>
                )}
              </div>
              <p className="truncate px-0.5 text-xs">
                <span className="font-bold">{c.breed ?? t.common.unknown}</span>
                <span className="text-muted"> / {formatDay(t, c.created_at)}</span>
              </p>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <PinCard
          capture={selected}
          onClose={() => setSelected(null)}
          onHelped={(updated) => {
            setCaptures((all) => all?.map((c) => (c.id === updated.id ? updated : c)) ?? null);
            setSelected(updated);
          }}
          onDeleted={(id) => {
            setCaptures((all) => all?.filter((c) => c.id !== id) ?? null);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
