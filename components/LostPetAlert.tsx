"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { photoUrl } from "@/lib/supabase/client";
import type { LostPet } from "@/lib/types";

// Corner pop-up for a lost pet reported near you. Tap to open it, × to hide it on this phone.
export default function LostPetAlert({ pet, onDismiss }: { pet: LostPet; onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <div className="pointer-events-auto absolute right-4 top-20 z-[1100] flex w-60 items-center gap-3 rounded-3xl border-2 border-sos/40 bg-white p-2 pr-8 shadow-lg shadow-sos/20">
      <Link href={`/lost/${pet.id}`} className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(pet.photo_path)} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-sos">{t.alert.lostNearby}</p>
          <p className="truncate text-xs text-muted">{pet.last_seen_address ?? pet.description}</p>
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
