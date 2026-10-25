"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoInput from "@/components/PhotoInput";
import { createClient } from "@/lib/supabase/client";
import { getLocation, lookupAddress, UB_CENTER, type LatLng } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded-3xl bg-brand-soft" />,
});

// Report a lost pet: photo, description, and an optional last-seen place.
// With a place, people within 3 km get an alert; without one, everyone does.
export default function NewLostPetPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [spot, setSpot] = useState<LatLng | null>(null);
  const [pickerCenter, setPickerCenter] = useState<LatLng>(UB_CENTER);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choosePhoto(next: Blob | null) {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function useMyLocation() {
    setLocating(true);
    setLocationNote(null);
    const here = await getLocation();
    setLocating(false);
    if (!here) {
      setLocationNote(t.lostNew.noLocation);
      return;
    }
    setSpot(here);
    setPickerCenter(here);
  }

  const canSave = !!photo && description.trim().length > 0;

  async function save() {
    if (!photo || !canSave) return;
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not logged in");

      const path = `${auth.user.id}/lost-${crypto.randomUUID()}.jpg`;
      const [upload, address] = await Promise.all([
        supabase.storage.from("photos").upload(path, photo, { contentType: "image/jpeg" }),
        spot ? lookupAddress(spot) : Promise.resolve(null),
      ]);
      if (upload.error) throw upload.error;

      const { data, error } = await supabase
        .from("lost_pets")
        .insert({
          photo_path: path,
          description: description.trim(),
          last_seen_lat: spot?.lat ?? null,
          last_seen_lng: spot?.lng ?? null,
          last_seen_address: address,
        })
        .select("id")
        .single();
      if (error) throw error;

      router.replace(`/lost/${data.id}`);
    } catch {
      setError(t.common.saveError);
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-5 pb-12 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-bold text-brand-dark">
          ← {t.common.cancel}
        </Link>
        <h1 className="text-lg font-extrabold">{t.lostNew.title}</h1>
        <span className="w-12" />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {!photo ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <PhotoInput onPhoto={choosePhoto} label={t.lostNew.addPhoto} />
            <p className="max-w-xs text-sm text-muted">{t.lostNew.photoHint}</p>
          </div>
        ) : (
          <div className="relative">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={t.lostNew.yourPet} className="aspect-square w-full rounded-[2rem] object-cover shadow-md shadow-brand/15" />
            )}
            <button
              type="button"
              onClick={() => choosePhoto(null)}
              className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-brand-dark shadow"
            >
              {t.lostNew.change}
            </button>
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-muted">{t.lostNew.description}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={t.lostNew.descriptionPlaceholder}
            className="resize-none rounded-2xl border border-brand-soft bg-white px-4 py-3 outline-none focus:border-brand"
          />
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-muted">{t.lostNew.lastSeen}</span>
            {spot && (
              <button type="button" onClick={() => setSpot(null)} className="text-xs font-bold text-brand-dark">
                {t.lostNew.clear}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="rounded-full border-2 border-brand-soft bg-white py-2.5 text-sm font-bold text-brand-dark transition active:scale-[0.98] disabled:opacity-50"
          >
            {locating ? t.lostNew.findingYou : t.lostNew.useMyLocation}
          </button>
          <LocationPicker key={`${pickerCenter.lat},${pickerCenter.lng}`} value={spot} onChange={setSpot} center={pickerCenter} />
          <p className="px-1 text-xs text-muted">
            {locationNote ??
              (spot ? t.lostNew.withSpot : t.lostNew.withoutSpot)}
          </p>
        </div>

        {error && <p className="text-center text-sm font-bold text-sos">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className="rounded-full bg-sos py-4 text-lg font-extrabold text-white shadow-lg shadow-sos/30 transition active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? t.common.saving : t.lostNew.send}
        </button>
      </div>
    </main>
  );
}
