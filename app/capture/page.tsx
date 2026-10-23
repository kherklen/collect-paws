"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoInput from "@/components/PhotoInput";
import { peekPendingPhoto, setPendingPhoto } from "@/lib/pendingPhoto";
import { createClient } from "@/lib/supabase/client";
import { getLocation, lookupAddress, type LatLng } from "@/lib/geo";
import { NEEDS, type Mode, type Need } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded-3xl bg-brand-soft" />,
});

// Location state at save time: first try, a re-ask after a refusal,
// then the tap-to-drop map if it's still refused.
type LocationStep = "auto" | "ask-again" | "drop";

export default function CapturePage() {
  const router = useRouter();
  // A photo taken from the paw button arrives here ready to go.
  const [photo, setPhoto] = useState<Blob | null>(() => peekPendingPhoto());
  const [preview, setPreview] = useState<string | null>(() => {
    const pending = peekPendingPhoto();
    return pending ? URL.createObjectURL(pending) : null;
  });
  const [breed, setBreed] = useState("");
  const [mode, setMode] = useState<Mode>("collect");
  const [need, setNeed] = useState<Need | null>(null);
  const [locationStep, setLocationStep] = useState<LocationStep>("auto");
  const [dropped, setDropped] = useState<LatLng | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choosePhoto(next: Blob | null) {
    setPendingPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  const canSave =
    !!photo && (mode === "collect" || need !== null) && (locationStep !== "drop" || !!dropped);

  async function save() {
    if (!photo || !canSave) return;
    setError(null);
    setSaving(true);

    const spot: LatLng | null = locationStep === "drop" ? dropped : await getLocation();
    if (!spot) {
      setSaving(false);
      setLocationStep(locationStep === "auto" ? "ask-again" : "drop");
      return;
    }

    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not logged in");

      const path = `${auth.user.id}/${crypto.randomUUID()}.jpg`;
      const [upload, address] = await Promise.all([
        supabase.storage.from("photos").upload(path, photo, { contentType: "image/jpeg" }),
        lookupAddress(spot),
      ]);
      if (upload.error) throw upload.error;

      const insert = await supabase.from("captures").insert({
        photo_path: path,
        breed: breed.trim() || null,
        mode,
        need: mode === "sos" ? need : null,
        lat: spot.lat,
        lng: spot.lng,
        address,
      });
      if (insert.error) throw insert.error;

      setPendingPhoto(null);
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn't save — try again.");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-5 pb-12 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-bold text-brand-dark">
          ← Cancel
        </Link>
        <h1 className="text-lg font-extrabold">Capture</h1>
        <span className="w-12" />
      </div>

      {!photo ? (
        <div className="mt-16 flex flex-col items-center gap-6 text-center">
          <PhotoInput onPhoto={choosePhoto} />
          <p className="max-w-xs text-muted">Spotted a stray cat or dog? Snap a photo to add it to your collection.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <div className="relative">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your capture" className="aspect-square w-full rounded-[2rem] object-cover shadow-md shadow-brand/15" />
            )}
            <button
              type="button"
              onClick={() => choosePhoto(null)}
              className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-brand-dark shadow"
            >
              Retake
            </button>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-muted">Breed</span>
            <input
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="e.g. Tabby cat, Husky mix"
              className="rounded-2xl border border-brand-soft bg-white px-4 py-3 outline-none focus:border-brand"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-muted">How is it doing?</span>
            <div className="grid grid-cols-2 gap-3">
              <ModeButton active={mode === "collect"} onClick={() => setMode("collect")} color="collect">
                <span className="text-2xl">😺</span>
                <span className="font-extrabold">Collect</span>
                <span className="text-xs text-muted">It&apos;s doing fine</span>
              </ModeButton>
              <ModeButton active={mode === "sos"} onClick={() => setMode("sos")} color="sos">
                <span className="text-2xl">🆘</span>
                <span className="font-extrabold">SOS</span>
                <span className="text-xs text-muted">It needs something</span>
              </ModeButton>
            </div>
          </div>

          {mode === "sos" && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-muted">What does it need?</span>
              <div className="flex flex-wrap gap-2">
                {NEEDS.map((n) => (
                  <button
                    key={n.value}
                    type="button"
                    onClick={() => setNeed(n.value)}
                    className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                      need === n.value ? "border-sos bg-sos text-white" : "border-sos/30 bg-white text-ink"
                    }`}
                  >
                    {n.emoji} {n.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {locationStep === "ask-again" && (
            <p className="rounded-2xl bg-brand-soft p-4 text-sm">
              📍 We need your location to place the pin. Please allow location for this site, then tap Save again.
            </p>
          )}
          {locationStep === "drop" && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-muted">Still no location — tap the map where you saw it</span>
              <LocationPicker value={dropped} onChange={setDropped} />
            </div>
          )}

          {error && <p className="text-center text-sm font-bold text-sos">{error}</p>}

          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving}
            className="rounded-full bg-brand py-4 text-lg font-extrabold text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save to my collection"}
          </button>
        </div>
      )}
    </main>
  );
}

function ModeButton({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: "collect" | "sos";
  children: React.ReactNode;
}) {
  const activeClass = color === "sos" ? "border-sos bg-sos/10" : "border-collect bg-collect/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-3xl border-2 bg-white p-4 transition ${
        active ? activeClass : "border-brand-soft"
      }`}
    >
      {children}
    </button>
  );
}
