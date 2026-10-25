"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SightingCard, { type SightingWithReporter } from "@/components/SightingCard";
import { commentsOnMyPosts, markCommentsRead, type CommentOnMine } from "@/lib/comments";
import { formatAgo, useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/useNow";
import { createClient, photoUrl } from "@/lib/supabase/client";

type Notification = SightingWithReporter & {
  lost_pets: { id: string; description: string; photo_path: string };
};

// Sightings on my lost-pet reports and comments on my posts, newest first.
// Opening the page marks them read, which clears the bell's badge.
export default function NotificationsPage() {
  const { t } = useI18n();
  const now = useNow();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [comments, setComments] = useState<CommentOnMine[]>([]);
  // Which ones were unread when the page opened, so they keep their "NEW" tag.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const [{ data }, myComments] = await Promise.all([
        supabase
          .from("sightings")
          .select("*, profiles(display_name), lost_pets!inner(id, description, photo_path, owner_id)")
          .eq("lost_pets.owner_id", auth.user.id)
          .order("created_at", { ascending: false }),
        commentsOnMyPosts(supabase, auth.user.id),
      ]);
      const list = (data as Notification[]) ?? [];
      const unread = list.filter((s) => !s.read_at).map((s) => s.id);
      const unreadComments = myComments.filter((c) => !c.read_at).map((c) => c.id);
      setNewIds(new Set([...unread, ...unreadComments]));
      setItems(list);
      setComments(myComments);
      if (unread.length) {
        await supabase.from("sightings").update({ read_at: new Date().toISOString() }).in("id", unread);
      }
      await markCommentsRead(supabase, unreadComments);
    })();
  }, []);

  return (
    <main className="mx-auto min-h-full max-w-md px-5 pb-12 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-bold text-brand-dark">
          {t.common.backToMap}
        </Link>
        <Link href="/profile" className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-brand-dark shadow-sm shadow-brand/10">
          {t.notifications.myProfile}
        </Link>
      </div>

      <h1 className="mt-6 text-2xl font-display font-bold italic">{t.notifications.title}</h1>

      {items === null ? (
        <div className="mt-4 h-28 animate-pulse rounded-3xl bg-brand-soft" />
      ) : items.length === 0 && comments.length === 0 ? (
        <div className="mx-auto mt-16 max-w-xs text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-5xl">🔔</div>
          <h2 className="text-xl font-display font-bold italic">{t.notifications.emptyTitle}</h2>
          <p className="mt-2 text-muted">{t.notifications.emptyText}</p>
        </div>
      ) : (
        <>
        {comments.length > 0 && (
          <section className="mt-4 flex flex-col gap-2">
            <h2 className="px-1 font-display font-bold italic">{t.comments.onYourPosts}</h2>
            <ul className="flex flex-col gap-2">
              {comments.map((c) => (
                <li key={c.id}>
                  <Link href={c.post.href} className="flex gap-3 rounded-3xl bg-white p-3 shadow-sm shadow-brand/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(c.post.photo_path)} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-brand-dark">
                          {t.comments.aNeighbor}
                          {newIds.has(c.id) && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[10px] text-white">{t.sighting.new}</span>}
                        </span>
                        <span className="shrink-0 text-xs text-muted">{formatAgo(t, c.created_at, now)}</span>
                      </p>
                      <p className="line-clamp-2 break-words">{c.body}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ul className="mt-4 flex flex-col gap-4">
          {items.map((s) => (
            <li key={s.id} className="flex flex-col gap-2">
              <Link href={`/lost/${s.lost_pets.id}`} className="flex items-center gap-2 px-1 text-xs text-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(s.lost_pets.photo_path)} alt="" className="h-6 w-6 rounded-full object-cover" />
                <span className="truncate">{t.notifications.about(s.lost_pets.description)}</span>
              </Link>
              <SightingCard sighting={s} isNew={newIds.has(s.id)} />
            </li>
          ))}
        </ul>
        </>
      )}
    </main>
  );
}
