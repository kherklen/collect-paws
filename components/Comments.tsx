"use client";

import { useEffect, useState } from "react";
import { COMMENT_MAX, markCommentsRead, type Comment } from "@/lib/comments";
import { formatAgo, useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useNow } from "@/lib/useNow";

// The comment section on an SOS pin or a lost-pet report. Nobody is shown by name:
// the post's owner is "Poster", everyone else "Neighbor 1, 2…" in the order they
// first commented. Opening it as the owner marks the comments read.
export default function Comments({
  post,
  ownerId,
}: {
  post: { capture_id: string } | { lost_pet_id: string };
  ownerId: string;
}) {
  const { t } = useI18n();
  const now = useNow();
  const [me, setMe] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped after sending or deleting, to load the list again.
  const [version, setVersion] = useState(0);
  const [column, postId] = "capture_id" in post ? ["capture_id", post.capture_id] : ["lost_pet_id", post.lost_pet_id];

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const [{ data: auth }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("comments").select("*").eq(column, postId).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      const list = (data as Comment[]) ?? [];
      setMe(auth.user?.id ?? null);
      setComments(list);
      if (auth.user?.id === ownerId) {
        await markCommentsRead(
          supabase,
          list.filter((c) => !c.read_at && c.author_id !== ownerId).map((c) => c.id),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [column, postId, ownerId, version]);

  async function send() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("comments").insert({ [column]: postId, body }).select("id").single();
    setBusy(false);
    if (error) {
      setError(t.comments.sendError);
      return;
    }
    setDraft("");
    setVersion((v) => v + 1);
    // Let the poster know (a phone notification, if they turned them on).
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment_id: data.id }),
    }).catch(() => {});
  }

  async function remove(id: string) {
    await createClient().from("comments").delete().eq("id", id);
    setVersion((v) => v + 1);
  }

  // "Neighbor N" numbers, by who commented first.
  const neighbors = new Map<string, number>();
  for (const c of comments ?? []) {
    if (c.author_id !== ownerId && !neighbors.has(c.author_id)) neighbors.set(c.author_id, neighbors.size + 1);
  }
  const who = (c: Comment) => {
    const label = c.author_id === ownerId ? t.comments.poster : t.comments.neighbor(neighbors.get(c.author_id)!);
    return c.author_id === me ? `${label} (${t.comments.you})` : label;
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 font-display font-bold italic">
        💬 {t.comments.title}
        {comments?.length ? ` (${comments.length})` : ""}
      </h2>
      {comments?.length === 0 && <p className="px-1 text-sm text-muted">{t.comments.empty}</p>}
      <ul className="flex flex-col gap-2">
        {comments?.map((c) => (
          <li key={c.id} className="rounded-2xl bg-canvas px-3 py-2 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`font-bold ${c.author_id === ownerId ? "text-brand" : "text-brand-dark"}`}>{who(c)}</span>
              <span className="shrink-0 text-xs text-muted">{formatAgo(t, c.created_at, now)}</span>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
            {c.author_id === me && (
              <button type="button" onClick={() => remove(c.id)} className="mt-1 text-xs font-bold text-sos">
                {t.comments.delete}
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
          placeholder={t.comments.placeholder}
          rows={2}
          className="min-w-0 flex-1 resize-none rounded-2xl border border-brand-soft bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={send}
          disabled={!draft.trim() || busy}
          className="rounded-full bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {busy ? "…" : t.comments.send}
        </button>
      </div>
      {draft.length > COMMENT_MAX - 50 && (
        <p className="px-1 text-xs text-muted">{t.comments.left(COMMENT_MAX - draft.length)}</p>
      )}
      {error && <p className="px-1 text-sm font-bold text-sos">{error}</p>}
    </section>
  );
}
