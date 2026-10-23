"use client";

import { useState } from "react";
import { shrinkPhoto } from "@/lib/image";

// Opens the phone camera directly (a file picker on desktop), then shrinks the photo.
export default function PhotoInput({
  onPhoto,
  label = "Take a photo",
}: {
  onPhoto: (photo: Blob) => void;
  label?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onPhoto(await shrinkPhoto(file));
    } catch {
      setError("Couldn't read that photo. Try another one.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <label className="flex h-56 w-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-[2.5rem] border-4 border-dashed border-brand/40 bg-white text-brand-dark shadow-sm shadow-brand/10 transition active:scale-[0.98]">
        <span className="text-6xl">{busy ? "⏳" : "📷"}</span>
        <span className="font-bold">{busy ? "Getting photo…" : label}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="sr-only"
        />
      </label>
      {error && <p className="mt-3 text-sm text-sos">{error}</p>}
    </div>
  );
}
