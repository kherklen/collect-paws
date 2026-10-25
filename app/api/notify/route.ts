import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Sends a phone notification to a post's owner after someone comments on it or
// sends a sighting of their lost pet. The caller only names the new comment or
// sighting; the server checks it's really theirs and brand new, so nobody can use
// this route to spam people.
const FRESH_MS = 2 * 60 * 1000;

// Each comment or sighting notifies once (per server instance).
const sent = new Set<string>();

// The push services' contact for this app: the project page rather than a person.
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "https://github.com/kherklen/collect-paws",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

type Message = { title: string; body: string };
type Payload = { en: Message; mn: Message; url: string; tag: string };

const snippet = (text: string) => (text.length > 120 ? `${text.slice(0, 117)}…` : text);

// { comment_id } or { sighting_id } → { sent: number of devices reached }.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const me = data.user.id;
  const { comment_id, sighting_id } = await request.json().catch(() => ({}));
  const admin = createAdminClient();

  let owner: string | null = null;
  let payload: Payload | null = null;
  let createdAt: string | null = null;
  const key = comment_id ? `c:${comment_id}` : `s:${sighting_id}`;

  if (typeof comment_id === "string") {
    const { data: c } = await admin
      .from("comments")
      .select("author_id, body, created_at, capture_id, lost_pet_id, captures(user_id), lost_pets(owner_id)")
      .eq("id", comment_id)
      .maybeSingle<{
        author_id: string;
        body: string;
        created_at: string;
        capture_id: string | null;
        lost_pet_id: string | null;
        captures: { user_id: string } | null;
        lost_pets: { owner_id: string } | null;
      }>();
    if (!c || c.author_id !== me) return NextResponse.json({ error: "Not your comment" }, { status: 403 });
    owner = c.captures?.user_id ?? c.lost_pets?.owner_id ?? null;
    createdAt = c.created_at;
    payload = {
      en: { title: "💬 New comment on your post", body: snippet(c.body) },
      mn: { title: "💬 Таны нийтлэлд шинэ сэтгэгдэл", body: snippet(c.body) },
      url: c.capture_id ? `/?pin=${c.capture_id}` : `/lost/${c.lost_pet_id}`,
      tag: key,
    };
  } else if (typeof sighting_id === "string") {
    const { data: s } = await admin
      .from("sightings")
      .select("reporter_id, kind, description, created_at, lost_pet_id, lost_pets(owner_id)")
      .eq("id", sighting_id)
      .maybeSingle<{
        reporter_id: string;
        kind: "now" | "report";
        description: string | null;
        created_at: string;
        lost_pet_id: string;
        lost_pets: { owner_id: string } | null;
      }>();
    if (!s || s.reporter_id !== me) return NextResponse.json({ error: "Not your sighting" }, { status: 403 });
    owner = s.lost_pets?.owner_id ?? null;
    createdAt = s.created_at;
    payload = {
      en: { title: "👀 Someone may have seen your pet", body: s.kind === "now" ? "📸 Seen right now, with a photo" : snippet(s.description ?? "") },
      mn: { title: "👀 Таны амьтныг харсан байж магадгүй", body: s.kind === "now" ? "📸 Яг одоо харсан, зурагтай" : snippet(s.description ?? "") },
      url: "/notifications",
      tag: key,
    };
  } else {
    return NextResponse.json({ error: "Say which comment or sighting" }, { status: 400 });
  }

  const age = Date.now() - new Date(createdAt!).getTime();
  if (age > FRESH_MS || age < -FRESH_MS) return NextResponse.json({ error: "Too old" }, { status: 409 });
  // Nobody gets notified about their own comment, and each one notifies once.
  if (!owner || owner === me || sent.has(key)) return NextResponse.json({ sent: 0 });
  sent.add(key);

  const { data: devices } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", owner);
  let reached = 0;
  await Promise.all(
    (devices ?? []).map(async (d) => {
      try {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
        reached++;
      } catch (error) {
        // The browser dropped this subscription: forget it.
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("endpoint", d.endpoint);
      }
    }),
  );
  return NextResponse.json({ sent: reached });
}
