"use client";

import { useEffect, useState } from "react";
import { createClient, photoUrl } from "@/lib/supabase/client";
import { needInfo, type Capture } from "@/lib/types";
import PinCard from "@/components/PinCard";

const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

// My Collection: a three-column grid of the person's own captures, newest first.
export default function CollectionGrid() {
  const [captures, setCaptures] = useState<Capture[] | null>(null);
  const [selected, setSelected] = useState<Capture | null>(null);

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
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-5xl">
            🐱
          </div>
          <h2 className="text-xl font-extrabold">No friends yet!</h2>
          <p className="mt-2 text-muted">
            Spot a stray cat or dog and tap the paw button to add it to your collection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-canvas px-3 pb-36 pt-20">
      <p className="mb-3 px-1 text-sm font-bold text-muted">
        {captures.length} {captures.length === 1 ? "friend" : "friends"} collected
      </p>
      <ul className="grid grid-cols-3 gap-3">
        {captures.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setSelected(c)} className="flex w-full flex-col gap-1 text-left">
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(c.photo_path)}
                  alt={c.breed ?? "Captured animal"}
                  className={`aspect-square w-full rounded-2xl border-[3px] object-cover shadow-sm ${
                    c.helped_at ? "border-helped opacity-75" : c.mode === "sos" ? "border-sos" : "border-collect"
                  }`}
                />
                {c.helped_at ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-helped px-2 py-0.5 text-[10px] font-extrabold text-white">
                    ✓ Helped
                  </span>
                ) : c.mode === "sos" && (
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-sos text-xs">
                    {needInfo(c.need)?.emoji ?? "🆘"}
                  </span>
                )}
              </div>
              <p className="truncate px-0.5 text-xs">
                <span className="font-bold">{c.breed ?? "Unknown"}</span>
                <span className="text-muted"> / {dateFormat.format(new Date(c.created_at))}</span>
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
