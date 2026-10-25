"use client";

import Link from "next/link";
import type { CommentOnMine } from "@/lib/comments";
import { useI18n } from "@/lib/i18n";
import { photoUrl } from "@/lib/supabase/client";

// Corner pop-up for a new comment on one of my posts. Tap to open the post
// (which marks it read), × to hide it on this phone.
export default function CommentAlert({ comment, onDismiss }: { comment: CommentOnMine; onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <div className="pointer-events-auto relative flex w-60 items-center gap-3 rounded-3xl border-2 border-brand-dark/30 bg-white p-2 pr-8 shadow-lg shadow-brand/20">
      <Link href={comment.post.href} className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(comment.post.photo_path)} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-brand-dark">{t.comments.newOnYours}</p>
          <p className="line-clamp-2 text-xs text-muted">{comment.body}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t.alert.hide}
        className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted"
      >
        ×
      </button>
    </div>
  );
}
