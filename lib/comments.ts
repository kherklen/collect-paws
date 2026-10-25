import type { SupabaseClient } from "@supabase/supabase-js";

export type Comment = {
  id: string;
  author_id: string;
  capture_id: string | null;
  lost_pet_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
};

export const COMMENT_MAX = 500;

// A comment on one of my posts, with what's needed to show and open that post.
export type CommentOnMine = Comment & {
  post: { href: string; photo_path: string; title: string | null };
};

type Row = Comment & {
  captures?: { photo_path: string; breed: string | null } | null;
  lost_pets?: { photo_path: string; description: string } | null;
};

// Comments other people left on my SOS captures and lost-pet reports, newest first.
// `unreadOnly` limits it to the ones I haven't opened (the pop-up and the bell count).
export async function commentsOnMyPosts(supabase: SupabaseClient, me: string, unreadOnly = false) {
  const onCaptures = supabase
    .from("comments")
    .select("*, captures!inner(user_id, photo_path, breed)")
    .eq("captures.user_id", me)
    .neq("author_id", me);
  const onLostPets = supabase
    .from("comments")
    .select("*, lost_pets!inner(owner_id, photo_path, description)")
    .eq("lost_pets.owner_id", me)
    .neq("author_id", me);
  const [a, b] = await Promise.all(
    unreadOnly ? [onCaptures.is("read_at", null), onLostPets.is("read_at", null)] : [onCaptures, onLostPets],
  );
  const rows = [...((a.data as Row[]) ?? []), ...((b.data as Row[]) ?? [])];
  return rows
    .map(({ captures, lost_pets, ...comment }): CommentOnMine => ({
      ...comment,
      post: captures
        ? { href: `/?pin=${comment.capture_id}`, photo_path: captures.photo_path, title: captures.breed }
        : { href: `/lost/${comment.lost_pet_id}`, photo_path: lost_pets!.photo_path, title: lost_pets!.description },
    }))
    .sort((x, y) => y.created_at.localeCompare(x.created_at));
}

// Marks these comments read (only the post's owner is allowed to).
export async function markCommentsRead(supabase: SupabaseClient, ids: string[]) {
  if (ids.length) await supabase.from("comments").update({ read_at: new Date().toISOString() }).in("id", ids);
}
