"use client";

import Link from "next/link";
import { formatSpot, useI18n } from "@/lib/i18n";
import { photoUrl } from "@/lib/supabase/client";
import type { Capture } from "@/lib/types";
import { urgencyNow, waitingParts } from "@/lib/urgency";
import { useNow } from "@/lib/useNow";

// Red-bordered corner pop-up for an animal near you that needs help now.
// Tap to open its pin on the map, × to hide it on this phone.
export default function RedAlert({ capture, onDismiss }: { capture: Capture; onDismiss: () => void }) {
  const { t } = useI18n();
  const now = useNow();
  const waiting = waitingParts(urgencyNow(capture, now, null).waitingMs);
  return (
    <div className="pointer-events-auto relative flex w-60 items-center gap-3 rounded-3xl border-2 border-sos bg-white p-2 pr-8 shadow-lg shadow-sos/30">
      <Link href={`/?pin=${capture.id}`} className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(capture.photo_path)} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-sos">{t.alert.redNearby}</p>
          <p className="truncate text-xs text-muted">{capture.address ?? formatSpot(t, capture)}</p>
          <p className="truncate text-xs text-muted">{t.urgency.waiting(waiting.n, waiting.unit)}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t.alert.hide}
        className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted"
      >
        ×
      </button>
    </div>
  );
}
