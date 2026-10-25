"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoInput from "@/components/PhotoInput";
import { isFreshPhoto } from "@/lib/image";
import { peekPendingPhoto, setPendingPhoto } from "@/lib/pendingPhoto";
import { createClient } from "@/lib/supabase/client";
import { getLocation, lookupAddress, UB_CENTER, type LatLng } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/dictionaries";
import { NEEDS, type Mode, type Need } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded-3xl bg-brand-soft" />,
});

// `real` is false for a photo of a screen, a print, a screenshot, or a drawing.
type Guess = { animal: "cat" | "dog" | "other" | null; breed: string | null; real: boolean | null };

// Ask our /api/breed route what's in the photo. Null fields mean "couldn't check".
async function guessBreed(photo: Blob, lang: Lang): Promise<Guess> {
  try {
    const res = await fetch(`/api/breed?lang=${lang}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: photo,
      signal: AbortSignal.timeout(10000),
    });
    const { animal = null, breed = null, real = null } = await res.json();
    return { animal, breed, real };
  } catch {
    return { animal: null, breed: null, real: null };
  }
}

// Location state at save time: first try, a re-ask after a refusal,
// then the tap-to-drop map if it's still refused.
type LocationStep = "auto" | "ask-again" | "drop";

export default function CapturePage() {
  const router = useRouter();
  const { lang, t } = useI18n();
  // A photo taken from the paw button arrives here ready to go.
  const [photo, setPhoto] = useState<Blob | null>(() => peekPendingPhoto());
  const [preview, setPreview] = useState<string | null>(() => {
    const pending = peekPendingPhoto();
    return pending ? URL.createObjectURL(pending) : null;
  });
  const [breed, setBreed] = useState("");
  // The AI's answer, tied to the photo it was about, so a retake starts fresh.
  const [guess, setGuess] = useState<(Guess & { photo: Blob }) | null>(null);
  const [mode, setMode] = useState<Mode>("collect");
  const [need, setNeed] = useState<Need | null>(null);
  const [locationStep, setLocationStep] = useState<LocationStep>("auto");
  const [dropped, setDropped] = useState<LatLng | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The demo account skips the real-photo checks, can upload, and drops every pin by hand.
  // Null while we're still finding out.
  const [isDemo, setIsDemo] = useState<boolean | null>(null);
  const [demoCenter, setDemoCenter] = useState<LatLng | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from("profiles").select("is_demo").eq("id", auth.user.id).single();
      const demo = !!data?.is_demo;
      setIsDemo(demo);
      if (demo) setDemoCenter((await getLocation()) ?? UB_CENTER);
    })();
  }, []);

  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    guessBreed(photo, lang).then((result) => {
      if (cancelled) return;
      setGuess({ ...result, photo });
      // Fill in the breed unless the person already typed one.
      if (result.breed) setBreed((typed) => (typed.trim() ? typed : result.breed!));
    });
    return () => {
      cancelled = true;
    };
    // Only re-guess for a new photo, not when the language changes mid-capture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  const guessing = !!photo && guess?.photo !== photo;
  const notAnimal = !guessing && guess?.animal === "other";
  // Real-photo checks, skipped for the demo account. An old photo is turned away
  // straight away; a photo of a picture once the AI has looked.
  const oldPhoto = isDemo === false && !!photo && !isFreshPhoto(photo);
  const notReal = isDemo === false && !guessing && !notAnimal && guess?.real === false;
  const turnedAway = notAnimal ? "notAnimal" : oldPhoto ? "old" : notReal ? "notReal" : null;
  const couldntGuess = !guessing && !notAnimal && !guess?.breed;

  function choosePhoto(next: Blob | null) {
    setPendingPhoto(null);
    setBreed("");
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  const dropByHand = isDemo === true || locationStep === "drop";
  const canSave =
    !!photo &&
    isDemo !== null &&
    !guessing &&
    !turnedAway &&
    (mode === "collect" || need !== null) &&
    (!dropByHand || !!dropped);

  async function save() {
    if (!photo || !canSave) return;
    setError(null);
    setSaving(true);

    const spot: LatLng | null = dropByHand ? dropped : await getLocation();
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
        <h1 className="text-lg font-extrabold">{t.capture.title}</h1>
        <span className="w-12" />
      </div>

      {!photo ? (
        <div className="mt-16 flex flex-col items-center gap-6 text-center">
          {isDemo && <PhotoInput onPhoto={choosePhoto} fromGallery />}
          <PhotoInput onPhoto={choosePhoto} />
          <p className="max-w-xs text-muted">{isDemo ? t.capture.demoIntro : t.capture.intro}</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <div className="relative">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={t.capture.yourCapture} className="aspect-square w-full rounded-[2rem] object-cover shadow-md shadow-brand/15" />
            )}
            <button
              type="button"
              onClick={() => choosePhoto(null)}
              className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-brand-dark shadow"
            >
              {t.capture.retake}
            </button>
          </div>

          {turnedAway ? (
            <div className="flex flex-col items-center gap-5 text-center">
              <div>
                <p className="text-xl font-extrabold">{t.capture.turnedAway[turnedAway].title}</p>
                <p className="mt-1 text-muted">{t.capture.turnedAway[turnedAway].text}</p>
              </div>
              <PhotoInput onPhoto={choosePhoto} label={t.capture.takeAnother} />
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-muted">{t.capture.breed}</span>
                <input
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder={guessing ? t.capture.guessing : t.capture.breedPlaceholder}
                  className="rounded-2xl border border-brand-soft bg-white px-4 py-3 outline-none focus:border-brand"
                />
                {couldntGuess && !breed && (
                  <span className="px-1 text-xs text-muted">{t.capture.couldntGuess}</span>
                )}
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-muted">{t.capture.howIsIt}</span>
                <div className="grid grid-cols-2 gap-3">
                  <ModeButton active={mode === "collect"} onClick={() => setMode("collect")} color="collect">
                    <span className="text-2xl">😺</span>
                    <span className="font-extrabold">{t.capture.collect}</span>
                    <span className="text-xs text-muted">{t.capture.collectHint}</span>
                  </ModeButton>
                  <ModeButton active={mode === "sos"} onClick={() => setMode("sos")} color="sos">
                    <span className="text-2xl">🆘</span>
                    <span className="font-extrabold">{t.capture.sos}</span>
                    <span className="text-xs text-muted">{t.capture.sosHint}</span>
                  </ModeButton>
                </div>
              </div>

              {mode === "sos" && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-muted">{t.capture.whatNeed}</span>
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
                        {n.emoji} {t.needs[n.value]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {locationStep === "ask-again" && (
                <p className="rounded-2xl bg-brand-soft p-4 text-sm">
                  {t.capture.needLocation}
                </p>
              )}
              {isDemo
                ? demoCenter && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-bold text-muted">{t.capture.demoDropPin}</span>
                      <LocationPicker value={dropped} onChange={setDropped} center={demoCenter} />
                    </div>
                  )
                : locationStep === "drop" && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-bold text-muted">{t.capture.dropPin}</span>
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
                {saving ? t.common.saving : guessing ? t.capture.checking : t.capture.save}
              </button>
            </>
          )}
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
