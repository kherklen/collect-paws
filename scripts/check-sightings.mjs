// Slice 8 check: anyone can send a sighting, only the sender and the pet's owner
// can see it, and the owner's unread count clears once they mark them read.
import { check, finish, newAccount, TINY_JPEG } from "./helpers.mjs";

const A = await newAccount("Owner");
const B = await newAccount("Spotter");
const C = await newAccount("Reporter");

const { data: pet } = await A.client
  .from("lost_pets")
  .insert({ photo_path: `${A.id}/lost-test.jpg`, description: "Black lab, blue collar" })
  .select()
  .single();

const photoPath = `${B.id}/sighting-${crypto.randomUUID()}.jpg`;
const up = await B.client.storage.from("photos").upload(photoPath, TINY_JPEG, { contentType: "image/jpeg" });
check("B uploads a sighting photo", !up.error, up.error?.message);

const now = await B.client
  .from("sightings")
  .insert({ lost_pet_id: pet.id, kind: "now", photo_path: photoPath, lat: 47.92, lng: 106.92 })
  .select()
  .single();
check("B sends an \"I see it now\" sighting", !now.error, now.error?.message);

const report = await C.client
  .from("sightings")
  .insert({
    lost_pet_id: pet.id,
    kind: "report",
    seen_at: new Date(Date.now() - 2 * 3600e3).toISOString(),
    place_text: "Near the State Department Store",
    description: "Big black dog with a blue collar",
  })
  .select()
  .single();
check("C sends a \"Report a sighting\"", !report.error, report.error?.message);

const noDesc = await C.client.from("sightings").insert({ lost_pet_id: pet.id, kind: "report", place_text: "Somewhere" });
check("a report without a description is rejected", !!noDesc.error);
const noPhoto = await C.client.from("sightings").insert({ lost_pet_id: pet.id, kind: "now" });
check("an \"I see it now\" without a photo is rejected", !!noPhoto.error);
const asOther = await C.client
  .from("sightings")
  .insert({ lost_pet_id: pet.id, reporter_id: B.id, kind: "report", description: "fake" });
check("C cannot send a sighting as B", !!asOther.error);

const aRead = await A.client.from("sightings").select("id").eq("lost_pet_id", pet.id);
check("A (the owner) reads both sightings", aRead.data?.length === 2);

// The badge's query (lib/useAlerts.ts): unread sightings on my reports.
const unreadCount = async (acct) =>
  (
    await acct.client
      .from("sightings")
      .select("id, lost_pets!inner(owner_id)", { count: "exact", head: true })
      .eq("lost_pets.owner_id", acct.id)
      .is("read_at", null)
  ).count;
check("A's unread count is 2", (await unreadCount(A)) === 2, `count ${await unreadCount(A)}`);

const cSeesB = await C.client.from("sightings").select("id").eq("id", now.data.id);
check("C cannot read B's sighting", cSeesB.data?.length === 0);
const cSeesOwn = await C.client.from("sightings").select("id").eq("id", report.data.id);
check("C can read their own sighting", cSeesOwn.data?.length === 1);

const bMarks = await B.client
  .from("sightings")
  .update({ read_at: new Date().toISOString() }, { count: "exact" })
  .eq("id", now.data.id);
check("B cannot mark sightings read (only the owner can)", (bMarks.count ?? 0) === 0);
const aRewrites = await A.client.from("sightings").update({ description: "changed" }).eq("id", report.data.id);
check("even the owner cannot rewrite what a sighting says", !!aRewrites.error);

// The notifications page: mark the unread ones read.
const marked = await A.client
  .from("sightings")
  .update({ read_at: new Date().toISOString() }, { count: "exact" })
  .in("id", [now.data.id, report.data.id]);
check("A marks both sightings read", !marked.error && marked.count === 2, marked.error?.message);
check("A's unread count drops to 0", (await unreadCount(A)) === 0);

// The profile's query: my reports with the sightings received on each.
const profile = await A.client
  .from("lost_pets")
  .select("*, sightings(*, profiles(display_name))")
  .eq("id", pet.id)
  .single();
check(
  "A's profile shows the report with both sightings and who sent them",
  profile.data?.sightings.length === 2 && profile.data.sightings.every((s) => s.profiles?.display_name),
  profile.error?.message,
);

await A.client.from("lost_pets").update({ status: "found", found_at: new Date().toISOString() }).eq("id", pet.id);
const late = await B.client.from("sightings").insert({ lost_pet_id: pet.id, kind: "report", description: "Saw it" });
check("no new sightings once the pet is found", !!late.error);

finish();
