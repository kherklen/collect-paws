"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import SightingCard, { type SightingWithReporter } from "@/components/SightingCard";
import { createClient, photoUrl } from "@/lib/supabase/client";
import { getLocation, UB_CENTER, type LatLng } from "@/lib/geo";
import { formatDay, formatSpot, useI18n } from "@/lib/i18n";
import { shrinkPhoto } from "@/lib/image";
import type { LostPet } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded-3xl bg-brand-soft" />,
});

// A lost pet's details. Others can send a sighting ("I see it now" or a report);
// the owner sees the sightings and can mark it found, which stops the alert for everyone.
export default function LostPetPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [pet, setPet] = useState<LostPet | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [sightings, setSightings] = useState<SightingWithReporter[]>([]);
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
      const mine = auth.user?.id === data.owner_id;
      setIsOwner(mine);
      const [{ data: owner }, { data: received }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", data.owner_id).single(),
        mine
          ? supabase
              .from("sightings")
              .select("*, profiles(display_name)")
              .eq("lost_pet_id", id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      setOwnerName(owner?.display_name ?? null);
      setSightings((received as SightingWithReporter[]) ?? []);
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
      setError(t.lost.updateError);
      return;
    }
    setPet(data as LostPet);
  }

  const place =
    pet?.last_seen_address ??
    (pet?.last_seen_lat != null && pet.last_seen_lng != null
      ? formatSpot(t, { lat: pet.last_seen_lat, lng: pet.last_seen_lng })
      : null);

  return (
    <main className="mx-auto min-h-full max-w-md px-5 pb-12 pt-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-brand-dark">
        {t.common.backToMap}
      </Link>

      {missing ? (
        <p className="mt-16 text-center text-muted">{t.lost.gone}</p>
      ) : !pet ? (
        <div className="mt-6 aspect-square w-full animate-pulse rounded-[2rem] bg-brand-soft" />
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(pet.photo_path)} alt={t.lost.photoAlt} className="aspect-square w-full rounded-[2rem] object-cover shadow-md shadow-brand/15" />
            <span
              className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-sm font-extrabold text-white shadow ${
                pet.status === "found" ? "bg-helped" : "bg-sos"
              }`}
            >
              {pet.status === "found" ? t.lost.found : t.lost.lost}
            </span>
          </div>

          <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm shadow-brand/10">
            <p className="whitespace-pre-line text-lg font-bold">{pet.description}</p>
            <p className="text-sm text-muted">
              📍 {place ? t.lost.lastSeen(place) : t.lost.noPlace}
            </p>
            <p className="text-sm text-muted">
              {t.lost.reportedBy(isOwner ? t.lost.you : (ownerName ?? "…"), formatDay(t, pet.created_at))}
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
              {busy ? t.common.saving : t.lost.markFound}
            </button>
          )}
          {!isOwner && pet.status === "open" && (
            <SightingForms petId={pet.id} ownerName={ownerName} lastSeen={
              pet.last_seen_lat != null && pet.last_seen_lng != null
                ? { lat: pet.last_seen_lat, lng: pet.last_seen_lng }
                : null
            } />
          )}

          {isOwner && (
            <section className="flex flex-col gap-3">
              <h2 className="px-1 font-display font-bold italic">{t.lost.sightingsReceived} ({sightings.length})</h2>
              {sightings.length === 0 ? (
                <p className="px-1 text-sm text-muted">{t.lost.noSightings}</p>
              ) : (
                sightings.map((s) => <SightingCard key={s.id} sighting={s} />)
              )}
            </section>
          )}

          {pet.status === "found" && (
            <p className="text-center text-sm text-muted">
              {isOwner ? t.lost.foundOwner : t.lost.foundOther}
            </p>
          )}
        </div>
      )}
    </main>
  );
}

type SightingMode = "choose" | "now" | "report" | "sent";

// "I see it now" (a photo, with your location attached) or "Report a sighting"
// (when, where, and a required description of the animal).
function SightingForms({
  petId,
  ownerName,
  lastSeen,
}: {
  petId: string;
  ownerName: string | null;
  lastSeen: LatLng | null;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<SightingMode>("choose");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [seenAt, setSeenAt] = useState(() => toLocalInput(new Date()));
  const [spot, setSpot] = useState<LatLng | null>(null);
  const [placeText, setPlaceText] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const shrunk = await shrinkPhoto(file);
      if (preview) URL.revokeObjectURL(preview);
      setPhoto(shrunk);
      setPreview(URL.createObjectURL(shrunk));
      setMode("now");
    } catch {
      setError(t.photo.readError);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not logged in");

      if (mode === "now") {
        if (!photo) return;
        const path = `${auth.user.id}/sighting-${crypto.randomUUID()}.jpg`;
        const [upload, here] = await Promise.all([
          supabase.storage.from("photos").upload(path, photo, { contentType: "image/jpeg" }),
          getLocation(),
        ]);
        if (upload.error) throw upload.error;
        const { error } = await supabase.from("sightings").insert({
          lost_pet_id: petId,
          kind: "now",
          photo_path: path,
          lat: here?.lat ?? null,
          lng: here?.lng ?? null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sightings").insert({
          lost_pet_id: petId,
          kind: "report",
          seen_at: new Date(seenAt).toISOString(),
          lat: spot?.lat ?? null,
          lng: spot?.lng ?? null,
          place_text: placeText.trim() || null,
          description: description.trim(),
        });
        if (error) throw error;
      }
      setMode("sent");
    } catch {
      setError(t.lost.sendError);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
    setSpot(null);
    setPlaceText("");
    setDescription("");
    setSeenAt(toLocalInput(new Date()));
    setError(null);
    setMode("choose");
  }

  if (mode === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-helped/10 p-5 text-center">
        <p className="text-lg font-extrabold">{t.lost.thanks}</p>
        <p className="text-sm text-muted">{t.lost.ownerWillSee(ownerName)}</p>
        <button type="button" onClick={reset} className="text-sm font-bold text-brand-dark">
          {t.lost.sendAnother}
        </button>
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="px-1 font-display font-bold italic">{t.lost.seenQuestion}</h2>
        <div className="grid grid-cols-2 gap-3">
          {/* A label around the camera input: phones only open the camera from a direct tap. */}
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-3xl border-2 border-sos bg-sos/10 p-4 text-center transition active:scale-[0.98]">
            <span className="text-2xl">{busy ? "⏳" : "📸"}</span>
            <span className="font-extrabold">{t.lost.seeNow}</span>
            <span className="text-xs text-muted">{t.lost.snapPhoto}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="sr-only" />
          </label>
          <button
            type="button"
            onClick={() => setMode("report")}
            className="flex flex-col items-center gap-1 rounded-3xl border-2 border-brand-soft bg-white p-4 transition active:scale-[0.98]"
          >
            <span className="text-2xl">👀</span>
            <span className="font-extrabold">{t.lost.reportSighting}</span>
            <span className="text-xs text-muted">{t.lost.whenWhere}</span>
          </button>
        </div>
        {error && <p className="text-center text-sm font-bold text-sos">{error}</p>}
      </section>
    );
  }

  const canSend = mode === "now" ? !!photo : description.trim().length > 0 && !!seenAt;

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm shadow-brand/10">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold italic">{mode === "now" ? t.lost.seeNowTitle : t.lost.reportTitle}</h2>
        <button type="button" onClick={reset} className="text-sm font-bold text-muted">
          {t.common.cancel}
        </button>
      </div>

      {mode === "now" ? (
        <>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={t.lost.yourSighting} className="aspect-square w-full rounded-3xl object-cover" />
          )}
          <p className="text-xs text-muted">{t.lost.locationSent}</p>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-muted">{t.lost.whenQuestion}</span>
            <input
              type="datetime-local"
              value={seenAt}
              max={toLocalInput(new Date())}
              onChange={(e) => setSeenAt(e.target.value)}
              className="rounded-2xl border border-brand-soft bg-white px-4 py-3 outline-none focus:border-brand"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-muted">{t.lost.whereQuestion}</span>
            <input
              value={placeText}
              onChange={(e) => setPlaceText(e.target.value)}
              placeholder={t.lost.placePlaceholder}
              className="rounded-2xl border border-brand-soft bg-white px-4 py-3 outline-none focus:border-brand"
            />
            <LocationPicker value={spot} onChange={setSpot} center={lastSeen ?? UB_CENTER} />
            <p className="px-1 text-xs text-muted">{t.lost.placeHint}</p>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-muted">{t.lost.lookedLike}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t.lost.lookedLikePlaceholder}
              className="resize-none rounded-2xl border border-brand-soft bg-white px-4 py-3 outline-none focus:border-brand"
            />
          </label>
        </>
      )}

      {error && <p className="text-center text-sm font-bold text-sos">{error}</p>}

      <button
        type="button"
        onClick={send}
        disabled={!canSend || busy}
        className="rounded-full bg-sos py-3.5 text-lg font-extrabold text-white shadow-lg shadow-sos/30 transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? t.lost.sending : t.lost.sendToOwner}
      </button>
    </section>
  );
}

// "2026-10-25T14:30" in local time, the format a datetime-local input expects.
function toLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
