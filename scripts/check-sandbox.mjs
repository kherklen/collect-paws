// Sample content check: after scripts/seed-demo.mjs, the demo login sees the sample
// posts, real accounts never do, and the two sides can't see or comment on each other.
// Run: node --env-file=.env.local scripts/check-sandbox.mjs
import { anonClient, check, DEMO_EMAIL, finish, newAccount, TINY_JPEG } from "./helpers.mjs";

const demo = anonClient();
const { data: login, error } = await demo.auth.signInWithPassword({ email: DEMO_EMAIL, password: process.env.DEMO_PASSWORD });
if (error) throw error;
const real = await newAccount("Real person");

const { data: demoSees } = await demo.from("captures").select("id, user_id, mode").eq("mode", "sos").neq("user_id", login.user.id);
check("the demo login sees the neighbor's sample SOS animals", (demoSees?.length ?? 0) >= 6, `${demoSees?.length} pins`);
const sampleIds = demoSees?.map((c) => c.id) ?? [];
const { data: demoLost } = await demo.from("lost_pets").select("id").eq("status", "open");
check("the demo login sees the sample lost-pet report", (demoLost?.length ?? 0) >= 1);

const { data: realSees } = await real.client.from("captures").select("id").in("id", sampleIds);
check("a real account sees none of the sample pins", realSees?.length === 0);
const { data: realLost } = await real.client.from("lost_pets").select("id").in("id", demoLost?.map((p) => p.id) ?? []);
check("a real account sees no sample lost-pet report", realLost?.length === 0);
const sneaky = await real.client.from("comments").insert({ capture_id: sampleIds[0], body: "hi" });
check("a real account can't comment on a sample post", !!sneaky.error);

const path = `${real.id}/${crypto.randomUUID()}.jpg`;
await real.client.storage.from("photos").upload(path, TINY_JPEG, { contentType: "image/jpeg" });
const { data: realPin } = await real.client
  .from("captures")
  .insert({ photo_path: path, mode: "sos", need: "food", urgency: "amber", lat: 47.9186, lng: 106.9176 })
  .select("id")
  .single();
const { data: demoSeesReal } = await demo.from("captures").select("id").eq("id", realPin.id);
check("the demo login can't see a real person's SOS pin", demoSeesReal?.length === 0);
const demoComment = await demo.from("comments").insert({ capture_id: realPin.id, body: "hi" });
check("the demo login can't comment on a real post", !!demoComment.error);
const { data: realOwn } = await real.client.from("captures").select("id").eq("id", realPin.id);
check("real people still see their own pins", realOwn?.length === 1);

await finish();
