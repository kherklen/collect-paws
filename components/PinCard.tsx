"use client";

import { useEffect, useState } from "react";
import { createClient, photoUrl } from "@/lib/supabase/client";
import { formatDay, formatSpot, useI18n } from "@/lib/i18n";
import { needInfo, type Capture } from "@/lib/types";

// Bottom sheet for a tapped pin or collection card. Unhelped SOS pins get a
// "helped" tick; your own captures can be deleted.
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
  const [spotter, setSpotter] = useState<string | null>(null);
  const [isMine, setIsMine] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", capture.user_id)
      .single()
      .then(({ data }) => setSpotter(data?.display_name ?? null));
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
  const status = helped
    ? { text: t.pin.helped, className: "bg-helped/15 text-helped" }
    : capture.mode === "sos"
      ? { text: need ? t.needsStatus[need.value] : t.pin.needsHelp, className: "bg-sos/15 text-sos" }
      : { text: t.pin.doingFine, className: "bg-collect/15 text-brand-dark" };

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
              {need && !helped ? `${need.emoji} ` : ""}
              {status.text}
            </span>
            <h2 className="truncate text-xl font-extrabold">{capture.breed ?? t.pin.unknownBreed}</h2>
            <p className="text-sm text-muted">📍 {capture.address ?? formatSpot(t, capture)}</p>
            <p className="text-xs text-muted">
              {t.pin.spotted(spotter, formatDay(t, capture.created_at))}
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
