"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SightingCard, { type SightingWithReporter } from "@/components/SightingCard";
import { createClient, photoUrl } from "@/lib/supabase/client";

type Notification = SightingWithReporter & {
  lost_pets: { id: string; description: string; photo_path: string };
};

// Sightings on my lost-pet reports, newest first. Opening the page marks them read,
// which clears the bell's badge.
export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null);
  // Which ones were unread when the page opened, so they keep their "NEW" tag.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("sightings")
        .select("*, profiles(display_name), lost_pets!inner(id, description, photo_path, owner_id)")
        .eq("lost_pets.owner_id", auth.user.id)
        .order("created_at", { ascending: false });
      const list = (data as Notification[]) ?? [];
      const unread = list.filter((s) => !s.read_at).map((s) => s.id);
      setNewIds(new Set(unread));
      setItems(list);
      if (unread.length) {
        await supabase.from("sightings").update({ read_at: new Date().toISOString() }).in("id", unread);
      }
    })();
  }, []);

  return (
    <main className="mx-auto min-h-full max-w-md px-5 pb-12 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-bold text-brand-dark">
          ← Back to map
        </Link>
        <Link href="/profile" className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-brand-dark shadow-sm shadow-brand/10">
          🐾 My profile
        </Link>
      </div>

      <h1 className="mt-6 text-2xl font-extrabold">Notifications</h1>

      {items === null ? (
        <div className="mt-4 h-28 animate-pulse rounded-3xl bg-brand-soft" />
      ) : items.length === 0 ? (
        <div className="mx-auto mt-16 max-w-xs text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-5xl">🔔</div>
          <h2 className="text-xl font-extrabold">All quiet</h2>
          <p className="mt-2 text-muted">When someone spots a pet you reported lost, it shows up here.</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {items.map((s) => (
            <li key={s.id} className="flex flex-col gap-2">
              <Link href={`/lost/${s.lost_pets.id}`} className="flex items-center gap-2 px-1 text-xs text-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(s.lost_pets.photo_path)} alt="" className="h-6 w-6 rounded-full object-cover" />
                <span className="truncate">About: {s.lost_pets.description}</span>
              </Link>
              <SightingCard sighting={s} isNew={newIds.has(s.id)} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
