"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient, photoUrl } from "@/lib/supabase/client";
import { formatSpot } from "@/lib/geo";
import type { LostPet } from "@/lib/types";

// A lost pet's details. The owner can mark it found, which stops the alert for everyone.
// Sighting forms for everyone else arrive in slice 8.
export default function LostPetPage() {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<LostPet | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: auth }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("lost_pets").select("*").eq("id", id).maybeSingle(),
      ]);
      if (!data) {
        setMissing(true);
        return;
      }
      setPet(data as LostPet);
      setIsOwner(auth.user?.id === data.owner_id);
      const { data: owner } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.owner_id)
        .single();
      setOwnerName(owner?.display_name ?? null);
    })();
  }, [id]);

  async function markFound() {
    if (!pet) return;
    setBusy(true);
    setError(null);
    const { data, error } = await createClient()
      .from("lost_pets")
      .update({ status: "found", found_at: new Date().toISOString() })
      .eq("id", pet.id)
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      setError("Couldn't update — try again.");
      return;
    }
    setPet(data as LostPet);
  }

  const place =
    pet?.last_seen_address ??
    (pet?.last_seen_lat != null && pet.last_seen_lng != null
      ? formatSpot({ lat: pet.last_seen_lat, lng: pet.last_seen_lng })
      : null);

  return (
    <main className="mx-auto min-h-full max-w-md px-5 pb-12 pt-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-brand-dark">
        ← Back to map
      </Link>

      {missing ? (
        <p className="mt-16 text-center text-muted">This lost-pet report doesn&apos;t exist anymore.</p>
      ) : !pet ? (
        <div className="mt-6 aspect-square w-full animate-pulse rounded-[2rem] bg-brand-soft" />
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(pet.photo_path)} alt="The lost pet" className="aspect-square w-full rounded-[2rem] object-cover shadow-md shadow-brand/15" />
            <span
              className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-sm font-extrabold text-white shadow ${
                pet.status === "found" ? "bg-helped" : "bg-sos"
              }`}
            >
              {pet.status === "found" ? "Found 🎉" : "Lost"}
            </span>
          </div>

          <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm shadow-brand/10">
            <p className="whitespace-pre-line text-lg font-bold">{pet.description}</p>
            <p className="text-sm text-muted">
              📍 {place ? `Last seen: ${place}` : "No last-seen place given"}
            </p>
            <p className="text-sm text-muted">
              Reported by {isOwner ? "you" : (ownerName ?? "…")} ·{" "}
              {new Date(pet.created_at).toLocaleDateString()}
            </p>
          </section>

          {error && <p className="text-center text-sm font-bold text-sos">{error}</p>}

          {isOwner && pet.status === "open" && (
            <button
              type="button"
              onClick={markFound}
              disabled={busy}
              className="rounded-full bg-helped py-4 text-lg font-extrabold text-white shadow-lg shadow-helped/30 transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "Saving…" : "🏠 Mark found"}
            </button>
          )}
          {pet.status === "found" && (
            <p className="text-center text-sm text-muted">
              {isOwner ? "Glad they're home! The alert has stopped." : "This pet has been found. Thank you for looking!"}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
