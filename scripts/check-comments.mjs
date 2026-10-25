// Slice 14 check: comments on SOS pins and lost-pet reports, the poster's unread count,
// and the row rules (no comments on private captures, 500 characters max, delete
// your own only, only the poster marks read, nobody rewrites a comment).
// Run: node --env-file=.env.local scripts/check-comments.mjs
import { check, finish, newAccount, TINY_JPEG } from "./helpers.mjs";
import { commentsOnMyPosts, markCommentsRead } from "../lib/comments.ts";

const A = await newAccount("Poster");
const B = await newAccount("Neighbor");
const C = await newAccount("Reader");

const path = `${A.id}/${crypto.randomUUID()}.jpg`;
await A.client.storage.from("photos").upload(path, TINY_JPEG, { contentType: "image/jpeg" });
const spot = { lat: 47.86, lng: 106.78 };
const { data: sos } = await A.client.from("captures").insert({ photo_path: path, mode: "sos", need: "food", urgency: "amber", ...spot }).select().single();
const { data: mine } = await A.client.from("captures").insert({ photo_path: path, mode: "collect", ...spot }).select().single();
const { data: pet } = await A.client.from("lost_pets").insert({ photo_path: path, description: "Test cat" }).select().single();

const onPin = await B.client.from("comments").insert({ capture_id: sos.id, body: "On my way with food" }).select().single();
const onPet = await B.client.from("comments").insert({ lost_pet_id: pet.id, body: "Saw a cat like this near the market" }).select().single();
check("B comments on A's SOS pin and lost-pet report", !onPin.error && !onPet.error, onPin.error?.message ?? onPet.error?.message);

const unread = await commentsOnMyPosts(A.client, A.id, true);
check("A has 2 unread comments, linking to the right posts", unread.length === 2 && unread.some((c) => c.post.href === `/?pin=${sos.id}`) && unread.some((c) => c.post.href === `/lost/${pet.id}`));
const { data: seenByC } = await C.client.from("comments").select("id").in("id", [onPin.data.id, onPet.data.id]);
check("C can read both comments", seenByC?.length === 2);

const onPrivate = await B.client.from("comments").insert({ capture_id: mine.id, body: "Hi" });
check("nobody can comment on a private Collect capture", !!onPrivate.error);
const tooLong = await B.client.from("comments").insert({ capture_id: sos.id, body: "x".repeat(501) });
check("a 501-character comment is rejected", !!tooLong.error);
const asSomeoneElse = await B.client.from("comments").insert({ capture_id: sos.id, body: "Fake", author_id: C.id });
check("B can't comment as someone else", !!asSomeoneElse.error);

const rewrite = await B.client.from("comments").update({ body: "Changed" }).eq("id", onPin.data.id);
check("a comment can't be rewritten", !!rewrite.error);
await B.client.from("comments").update({ read_at: new Date().toISOString() }).eq("id", onPin.data.id);
check("B can't mark A's comments read", (await commentsOnMyPosts(A.client, A.id, true)).length === 2);

await markCommentsRead(A.client, unread.map((c) => c.id));
check("A marks them read and the count drops to 0", (await commentsOnMyPosts(A.client, A.id, true)).length === 0);

const { count: aDeleted } = await A.client.from("comments").delete({ count: "exact" }).eq("id", onPet.data.id);
check("A can't delete B's comment", aDeleted === 0);
const { count: bDeleted } = await B.client.from("comments").delete({ count: "exact" }).eq("id", onPet.data.id);
check("B can delete their own comment", bDeleted === 1);

await finish();
