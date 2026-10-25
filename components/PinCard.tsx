"use client";

import { useEffect, useState } from "react";
import { createClient, photoUrl } from "@/lib/supabase/client";
import { formatAgo, formatDay, formatSpot, useI18n } from "@/lib/i18n";
import { needInfo, type Capture } from "@/lib/types";
import { URGENCY_COLOR, urgencyNow, waitingParts } from "@/lib/urgency";
import { useNow } from "@/lib/useNow";
import { useTemperature } from "@/lib/weather";

// Bottom sheet for a tapped pin or collection card. Unhelped SOS pins get a
// "helped" tick; your own captures can be deleted. An animal captured more than
// once shows how often it's been seen, with the other photos you're allowed to see.
export default function PinCard({
  capture,
  onClose,
  onHelped,
  onDeleted,
}: {
  capture: Capture;
  onClose: () => void;
  onHelped: (updated: Capture) => void;
  onDeleted: (id: string) => void;
}) {
  const { t } = useI18n();
  const [isMine, setIsMine] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();
  // Only SOS animals waiting for help need the weather.
  const celsius = useTemperature(capture.mode === "sos" && !capture.helped_at ? capture : null);
  const [profile, setProfile] = useState<{ timesSeen: number; firstSeen: string; photos: string[] } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.rpc("animal_summary", { target: capture.animal_id }).single<{ times_seen: number; first_seen: string }>(),
      // The row rules only return other captures of this animal that I may see.
      supabase
        .from("captures")
        .select("photo_path")
        .eq("animal_id", capture.animal_id)
        .neq("id", capture.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]).then(([summary, others]) => {
      if (!summary.data || summary.data.times_seen < 2) return;
      setProfile({
        timesSeen: summary.data.times_seen,
        firstSeen: summary.data.first_seen,
        photos: (others.data ?? []).map((o) => o.photo_path),
      });
    });
  }, [capture.id, capture.animal_id]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsMine(data.user?.id === capture.user_id));
  }, [capture.user_id]);

  async function deleteCapture() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error, count } = await supabase
      .from("captures")
      .delete({ count: "exact" })
      .eq("id", capture.id);
    if (error || count === 0) {
      setBusy(false);
      setError(t.pin.deleteError);
      return;
    }
    // The row is gone; a leftover photo file is harmless, so don't block on it.
    await supabase.storage.from("photos").remove([capture.photo_path]);
    onDeleted(capture.id);
  }

  async function markHelped() {
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("mark_helped", { capture_id: capture.id });
    setBusy(false);
    if (error) {
      setError(t.pin.helpedError);
      return;
    }
    onHelped(data as Capture);
  }

  const need = needInfo(capture.need);
  const helped = !!capture.helped_at;
  const waitingForHelp = capture.mode === "sos" && !helped;
  const urgency = urgencyNow(capture, now, celsius);
  const status = helped
    ? { text: t.pin.helped, className: "bg-helped/15 text-helped" }
    : { text: t.urgency[urgency.level], className: URGENCY_COLOR[urgency.level].chip };
  const waiting = waitingParts(urgency.waitingMs);
  // A tip only when the weather matters: freezing for any need, or hot for water.
  const weatherTip =
    celsius === null || !need
      ? null
      : celsius <= 0
        ? t.urgency.coldTip[need.value]
        : celsius >= 28 && need.value === "water"
          ? t.urgency.hotWater
          : null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end bg-ink/20" onClick={onClose}>
      <div
        className="w-full rounded-t-[2rem] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-soft" />
        <div className="flex gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(capture.photo_path)}
            alt={capture.breed ?? t.pin.capturedAnimal}
            className="h-28 w-28 shrink-0 rounded-3xl object-cover"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className={`self-start rounded-full px-3 py-1 text-xs font-extrabold ${status.className}`}>
              {status.text}
              {need && !helped ? ` · ${need.emoji} ${t.needs[need.value]}` : ""}
            </span>
            <h2 className="truncate text-xl font-display font-bold italic">{capture.breed ?? t.pin.unknownBreed}</h2>
            <p className="text-sm text-muted">📍 {capture.address ?? formatSpot(t, capture)}</p>
            <p className="text-xs text-muted">
              {t.pin.spotted(formatAgo(t, capture.created_at, now), isMine)}
            </p>
          </div>
        </div>

        {waitingForHelp && (
          <div className="mt-4 flex flex-col gap-1 rounded-3xl bg-canvas p-3 text-sm">
            <p className="font-bold">
              {t.urgency.waiting(waiting.n, waiting.unit)}
              {urgency.escalated && <span className="font-normal text-sos"> · {t.urgency.escalated}</span>}
            </p>
            {celsius !== null && (
              <p>
                {celsius <= 0 ? "🥶" : celsius >= 28 ? "🥵" : "🌡️"} {Math.round(celsius)}°C
                {weatherTip && <span className="text-muted"> · {weatherTip}</span>}
              </p>
            )}
            {urgency.mayBeGone && <p className="text-muted">{t.urgency.mayBeGone}</p>}
          </div>
        )}

        {profile && (
          <div className="mt-4 rounded-3xl bg-brand-soft/60 p-3">
            <p className="text-sm font-bold text-brand-dark">
              🐾 {t.match.seenTimes(profile.timesSeen)} · {t.match.firstSeen(formatDay(t, profile.firstSeen))}
            </p>
            {profile.photos.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {profile.photos.map((path) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={path} src={photoUrl(path)} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                ))}
              </div>
            )}
          </div>
        )}

        {capture.mode === "sos" && !helped && (
          <button
            type="button"
            onClick={markHelped}
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-helped py-3.5 font-extrabold text-white shadow-md shadow-helped/30 transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? t.common.saving : t.pin.iHelped}
          </button>
        )}
        {error && <p className="mt-2 text-center text-sm font-bold text-sos">{error}</p>}

        {isMine &&
          (confirmDelete ? (
            <div className="mt-4 rounded-3xl bg-sos/10 p-4 text-center">
              <p className="font-bold">{t.pin.deleteQuestion}</p>
              <p className="mt-1 text-sm text-muted">
                {capture.mode === "sos" ? t.pin.deleteSosNote : ""}
                {t.pin.cantUndo}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-full bg-white py-2.5 font-bold text-ink"
                >
                  {t.pin.keep}
                </button>
                <button
                  type="button"
                  onClick={deleteCapture}
                  disabled={busy}
                  className="flex-1 rounded-full bg-sos py-2.5 font-bold text-white disabled:opacity-60"
                >
                  {busy ? t.pin.deleting : t.pin.delete}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-3 w-full py-2 text-sm font-bold text-sos"
            >
              {t.pin.deleteFromCollection}
            </button>
          ))}

        <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-sm font-bold text-muted">
          {t.common.close}
        </button>
      </div>
    </div>
  );
}
