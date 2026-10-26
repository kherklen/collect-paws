"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { shrinkPhoto } from "@/lib/image";

// Opens the phone camera directly (a file picker on desktop), then shrinks the photo.
// `fromGallery` lets the phone offer the photo library as well (lost-pet photos,
// and captures on the demo account).
export default function PhotoInput({
  onPhoto,
  label,
  fromGallery = false,
}: {
  onPhoto: (photo: Blob) => void;
  label?: string;
  fromGallery?: boolean;
}) {
  const { t } = useI18n();
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
      setError(t.photo.readError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <label className="flex h-56 w-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-[2.5rem] border-4 border-dashed border-brand/40 bg-white text-brand-dark shadow-sm shadow-brand/10 transition active:scale-[0.98]">
        <span className="text-6xl">{busy ? "⏳" : fromGallery ? "🖼️" : "📷"}</span>
        <span className="font-bold">
          {busy ? t.photo.getting : (label ?? (fromGallery ? t.photo.upload : t.photo.take))}
        </span>
        <input
          type="file"
          accept="image/*"
          capture={fromGallery ? undefined : "environment"}
          onChange={handleChange}
          className="sr-only"
        />
      </label>
      {error && <p className="mt-3 text-sm text-sos">{error}</p>}
    </div>
  );
}
