import { photoUrl } from "@/lib/supabase/client";
import { formatSpot } from "@/lib/geo";
import type { Sighting } from "@/lib/types";

const timeFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// A sighting with the reporter's name: an "I see it now" photo, or a written report.
export type SightingWithReporter = Sighting & { profiles: { display_name: string } | null };

export default function SightingCard({ sighting, isNew = false }: { sighting: SightingWithReporter; isNew?: boolean }) {
  const s = sighting;
  const place =
    s.place_text ?? (s.lat != null && s.lng != null ? formatSpot({ lat: s.lat, lng: s.lng }) : null);
  const mapsLink = s.lat != null && s.lng != null ? `https://www.google.com/maps?q=${s.lat},${s.lng}` : null;

  return (
    <div className={`flex gap-3 rounded-3xl bg-white p-3 shadow-sm shadow-brand/10 ${isNew ? "ring-2 ring-sos/40" : ""}`}>
      {s.photo_path ? (
        <a href={photoUrl(s.photo_path)} target="_blank" rel="noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(s.photo_path)} alt="Sighting photo" className="h-20 w-20 rounded-2xl object-cover" />
        </a>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-3xl">📝</div>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-extrabold">
          {s.kind === "now" ? "📸 Seen right now" : "👀 Sighting report"}
          {isNew && <span className="ml-2 rounded-full bg-sos px-2 py-0.5 text-[10px] text-white">NEW</span>}
        </p>
        <p className="text-muted">
          {s.profiles?.display_name ?? "Someone"} · {timeFormat.format(new Date(s.seen_at))}
        </p>
        {s.description && <p className="mt-1 whitespace-pre-line">{s.description}</p>}
        {place &&
          (mapsLink ? (
            <a href={mapsLink} target="_blank" rel="noreferrer" className="mt-1 block font-bold text-brand-dark">
              📍 {place}
            </a>
          ) : (
            <p className="mt-1 text-muted">📍 {place}</p>
          ))}
      </div>
    </div>
  );
}
