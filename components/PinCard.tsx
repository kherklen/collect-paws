"use client";

import { useEffect, useState } from "react";
import { createClient, photoUrl } from "@/lib/supabase/client";
import { formatSpot } from "@/lib/geo";
import { needInfo, type Capture } from "@/lib/types";

// Bottom sheet for a tapped pin. Unhelped SOS pins get a "helped" tick.
export default function PinCard({
  capture,
  onClose,
  onHelped,
}: {
  capture: Capture;
  onClose: () => void;
  onHelped: (updated: Capture) => void;
}) {
  const [spotter, setSpotter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("profiles")
      .select("display_name")
      .eq("id", capture.user_id)
      .single()
      .then(({ data }) => setSpotter(data?.display_name ?? null));
  }, [capture.user_id]);

  async function markHelped() {
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("mark_helped", { capture_id: capture.id });
    setBusy(false);
    if (error) {
      setError("Couldn't mark it helped — try again.");
      return;
    }
    onHelped(data as Capture);
  }

  const need = needInfo(capture.need);
  const helped = !!capture.helped_at;
  const status = helped
    ? { text: "Helped 💚", className: "bg-helped/15 text-helped" }
    : capture.mode === "sos"
      ? { text: `Needs ${need?.value === "owner" ? "its owner" : (need?.label.toLowerCase() ?? "help")}`, className: "bg-sos/15 text-sos" }
      : { text: "Doing fine", className: "bg-collect/15 text-brand-dark" };

  return (
    <div className="absolute inset-0 z-[1100] flex items-end bg-ink/20" onClick={onClose}>
      <div
        className="w-full rounded-t-[2rem] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-soft" />
        <div className="flex gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(capture.photo_path)}
            alt={capture.breed ?? "Captured animal"}
            className="h-28 w-28 shrink-0 rounded-3xl object-cover"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className={`self-start rounded-full px-3 py-1 text-xs font-extrabold ${status.className}`}>
              {need && !helped ? `${need.emoji} ` : ""}
              {status.text}
            </span>
            <h2 className="truncate text-xl font-extrabold">{capture.breed ?? "Unknown breed"}</h2>
            <p className="text-sm text-muted">📍 {capture.address ?? formatSpot(capture)}</p>
            <p className="text-xs text-muted">
              Spotted {spotter ? `by ${spotter} ` : ""}
              {new Date(capture.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>

        {capture.mode === "sos" && !helped && (
          <button
            type="button"
            onClick={markHelped}
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-helped py-3.5 font-extrabold text-white shadow-md shadow-helped/30 transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Saving…" : "✓ I helped this friend"}
          </button>
        )}
        {error && <p className="mt-2 text-center text-sm font-bold text-sos">{error}</p>}

        <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-sm font-bold text-muted">
          Close
        </button>
      </div>
    </div>
  );
}
