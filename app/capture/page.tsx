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
import { NEEDS, type AnimalMatch, type Need, type Urgency } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded-3xl bg-brand-soft" />,
});

// `breeds` are up to 3 suggestions to tap; `real` is false for a photo of a screen,
// a print, a screenshot, or a drawing.
type Guess = { animal: "cat" | "dog" | "other" | null; breeds: string[]; real: boolean | null };

// Ask our /api/breed route what's in the photo. Null fields mean "couldn't check".
async function guessBreed(photo: Blob, lang: Lang): Promise<Guess> {
  try {
    const res = await fetch(`/api/breed?lang=${lang}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: photo,
      signal: AbortSignal.timeout(10000),
    });
    const { animal = null, breeds = [], real = null } = await res.json();
    return { animal, breeds, real };
  } catch {
    return { animal: null, breeds: [], real: null };
  }
}

// Ask our /api/match route whether an animal captured nearby looks like this one.
// Null means no match, or the check couldn't run (then it's saved as a new animal).
async function findMatch(photo: Blob, spot: LatLng, animal: Guess["animal"]): Promise<AnimalMatch | null> {
  try {
    const kind = animal === "cat" || animal === "dog" ? animal : "";
    const res = await fetch(`/api/match?lat=${spot.lat}&lng=${spot.lng}&animal=${kind}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: photo,
      signal: AbortSignal.timeout(20000),
    });
    const { match = null } = await res.json();
    return match;
  } catch {
    return null;
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
  // Green is a private Collect capture; amber and red are SOS pins everyone sees.
  const [urgency, setUrgency] = useState<Urgency>("green");
  const mode = urgency === "green" ? "collect" : "sos";
  const [need, setNeed] = useState<Need | null>(null);
  const [locationStep, setLocationStep] = useState<LocationStep>("auto");
  const [dropped, setDropped] = useState<LatLng | null>(null);
  const [saving, setSaving] = useState(false);
  const [matching, setMatching] = useState(false);
  // A look-alike found nearby, waiting for the person to say if it's the same animal.
  const [possibleMatch, setPossibleMatch] = useState<{ spot: LatLng; match: AnimalMatch } | null>(null);
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
      // The suggestions show as chips; the field stays as the person left it.
      setGuess({ ...result, photo });
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
  const suggestions = guessing ? [] : (guess?.breeds ?? []);
  const couldntGuess = !guessing && !notAnimal && suggestions.length === 0;

  function choosePhoto(next: Blob | null) {
    setPendingPhoto(null);
    setPossibleMatch(null);
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

    setMatching(true);
    const match = await findMatch(photo, spot, guess?.animal ?? null);
    setMatching(false);
    if (match) {
      setSaving(false);
      setPossibleMatch({ spot, match });
      return;
    }
    await store(spot, null);
  }

  // Upload and insert. `animalId` joins an existing animal's profile; null starts a new one.
  async function store(spot: LatLng, animalId: string | null) {
    if (!photo) return;
    setPossibleMatch(null);
    setError(null);
    setSaving(true);
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
        urgency,
        need: mode === "sos" ? need : null,
        animal: guess?.animal === "cat" || guess?.animal === "dog" ? guess.animal : null,
        ...(animalId ? { animal_id: animalId } : {}),
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
        <h1 className="text-lg font-display font-bold italic">{t.capture.title}</h1>
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

          {possibleMatch ? (
            <MatchPrompt
              match={possibleMatch.match}
              onSame={() => store(possibleMatch.spot, possibleMatch.match.animal_id)}
              onDifferent={() => store(possibleMatch.spot, null)}
              onDiscard={() => {
                setPendingPhoto(null);
                router.push("/");
              }}
            />
          ) : turnedAway ? (
            <div className="flex flex-col items-center gap-5 text-center">
              <div>
                <p className="font-display text-2xl font-bold italic">{t.capture.turnedAway[turnedAway].title}</p>
                <p className="mt-1 text-muted">{t.capture.turnedAway[turnedAway].text}</p>
              </div>
              <PhotoInput onPhoto={choosePhoto} label={t.capture.takeAnother} />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
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
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-1 text-xs font-bold text-muted">{t.capture.suggestions}</span>
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setBreed(s)}
                        className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold transition ${
                          breed === s ? "border-brand-dark bg-brand-dark text-white" : "border-brand-soft bg-white text-ink"
                        }`}
                      >
                        ✨ {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-muted">{t.capture.howIsIt}</span>
                <div className="grid grid-cols-3 gap-2">
                  {(["green", "amber", "red"] as const).map((level) => (
                    <UrgencyButton key={level} level={level} active={urgency === level} onClick={() => setUrgency(level)} />
                  ))}
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
                          need === n.value
                            ? urgency === "red"
                              ? "border-sos bg-sos text-white"
                              : "border-amber bg-amber text-white"
                            : "border-brand-soft bg-white text-ink"
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
                {matching ? t.match.looking : saving ? t.common.saving : guessing ? t.capture.checking : t.capture.save}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

// "Seen this one before?" — shows the look-alike's photo only when the person may see it.
function MatchPrompt({
  match,
  onSame,
  onDifferent,
  onDiscard,
}: {
  match: AnimalMatch;
  onSame: () => void;
  onDifferent: () => void;
  onDiscard: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-5 text-center shadow-sm shadow-brand/10">
      <div>
        <p className="font-display text-2xl font-bold italic">{t.match.title}</p>
        <p className="mt-1 text-sm text-muted">
          {match.mine ? t.match.yours : match.photo_url ? t.match.someones : t.match.private}
        </p>
      </div>
      {match.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={match.photo_url} alt={t.match.alreadyCaptured} className="h-32 w-32 rounded-3xl object-cover" />
      )}
      <div className="flex w-full flex-col gap-2">
        <button type="button" onClick={onSame} className="rounded-full bg-brand py-3.5 font-extrabold text-white shadow-md shadow-brand/30">
          {t.match.same}
        </button>
        <button type="button" onClick={onDifferent} className="rounded-full border-2 border-brand-soft bg-white py-3 font-bold text-ink">
          {t.match.different}
        </button>
        <button type="button" onClick={onDiscard} className="py-2 text-sm font-bold text-sos">
          {t.match.dontSave}
        </button>
      </div>
    </div>
  );
}

const URGENCY_STYLE = {
  green: { emoji: "😺", active: "border-collect bg-collect/15" },
  amber: { emoji: "🧡", active: "border-amber bg-amber/15" },
  red: { emoji: "🚨", active: "border-sos bg-sos/10" },
} as const;

function UrgencyButton({ level, active, onClick }: { level: Urgency; active: boolean; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-3xl border-2 bg-white px-2 py-3 text-center transition ${
        active ? URGENCY_STYLE[level].active : "border-brand-soft"
      }`}
    >
      <span className="text-2xl">{URGENCY_STYLE[level].emoji}</span>
      <span className="text-sm font-extrabold leading-tight">{t.urgency[level]}</span>
      <span className="text-[11px] leading-tight text-muted">{t.urgency[`${level}Hint`]}</span>
    </button>
  );
}
