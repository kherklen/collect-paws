// The two sample logins can play both sides: what one reports, the other receives.
// Run after scripts/seed-demo.mjs (run the seed again afterwards for clean sample data):
//   node --env-file=.env.local scripts/check-demo-pair.mjs
import { anonClient, check, DEMO_EMAIL, DEMO_NEIGHBOR_EMAIL, finish, TINY_JPEG } from "./helpers.mjs";
import { commentsOnMyPosts } from "../lib/comments.ts";
import { redAlertsFor } from "../lib/geo.ts";
import { urgencyNow } from "../lib/urgency.ts";

async function login(email) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password: process.env.DEMO_PASSWORD });
  if (error) throw error;
  return { client, id: data.user.id };
}
const demo = await login(DEMO_EMAIL);
const neighbor = await login(DEMO_NEIGHBOR_EMAIL);
check("both sample logins work with DEMO_PASSWORD", !!demo.id && !!neighbor.id);
const UB = { lat: 47.9186, lng: 106.9176 };

// The neighbor comments on Demo's hungry cat; Demo gets it as unread.
const { data: demoSos } = await neighbor.client.from("captures").select("id").eq("user_id", demo.id).eq("mode", "sos");
const before = (await commentsOnMyPosts(demo.client, demo.id, true)).length;
const sent = await neighbor.client.from("comments").insert({ capture_id: demoSos[0].id, body: "On my way!" });
const after = (await commentsOnMyPosts(demo.client, demo.id, true)).length;
check("the neighbor's comment reaches Demo (unread +1)", !sent.error && after === before + 1, `${before} → ${after}`);

// Demo reports a sighting of the neighbor's lost cat; the neighbor can read it.
const { data: lost } = await demo.client.from("lost_pets").select("id").eq("owner_id", neighbor.id).eq("status", "open");
const { data: sighting, error: sightingError } = await demo.client
  .from("sightings")
  .insert({ lost_pet_id: lost[0].id, kind: "report", description: "Saw him by the shop" })
  .select("id")
  .single();
const { data: received } = await neighbor.client.from("sightings").select("id").eq("id", sighting?.id ?? "");
check("Demo's sighting reaches the neighbor", !sightingError && received?.length === 1, sightingError?.message);

// Demo posts a red animal next to the center; the neighbor's alert poller would pick it up.
const path = `${demo.id}/${crypto.randomUUID()}.jpg`;
await demo.client.storage.from("photos").upload(path, TINY_JPEG, { contentType: "image/jpeg" });
const { data: red } = await demo.client
  .from("captures")
  .insert({ photo_path: path, mode: "sos", need: "vet", urgency: "red", lat: UB.lat + 0.001, lng: UB.lng })
  .select("*")
  .single();
const { data: visible } = await neighbor.client.from("captures").select("*").eq("mode", "sos").is("helped_at", null);
const reds = visible.filter((c) => urgencyNow(c, Date.now(), null).level === "red");
check("Demo's red animal alerts the neighbor", redAlertsFor(reds, { id: neighbor.id, spot: UB, dismissed: [] }).some((c) => c.id === red.id));

await finish();
